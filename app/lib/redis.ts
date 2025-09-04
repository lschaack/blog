import { promises as fs } from 'fs';
import Redis, { ReplyError } from 'ioredis';
import type { MultiplayerGameState, GameEvent, Player } from '@/app/types/multiplayer';
import type { CurveTurn } from '@/app/types/exquisiteCorpse';
import { validatePipelineResult } from '../api/middleware/redis';

class SessionSubscriptionManager {
  private sessionCallbacks: Map<string, Set<(event: GameEvent) => void>> = new Map();
  private subscribedSessions: Set<string> = new Set();

  addCallback(sessionId: string, callback: (event: GameEvent) => void): boolean {
    if (!this.sessionCallbacks.has(sessionId)) {
      this.sessionCallbacks.set(sessionId, new Set());
    }

    const callbacks = this.sessionCallbacks.get(sessionId)!;
    callbacks.add(callback);

    const wasSubscribed = this.subscribedSessions.has(sessionId);
    if (!wasSubscribed) {
      this.subscribedSessions.add(sessionId);
    }

    return !wasSubscribed; // Return true if this is a new subscription
  }

  removeCallback(sessionId: string, callback: (event: GameEvent) => void): boolean {
    const callbacks = this.sessionCallbacks.get(sessionId);
    if (!callbacks) return false;

    callbacks.delete(callback);

    if (callbacks.size === 0) {
      this.sessionCallbacks.delete(sessionId);
      this.subscribedSessions.delete(sessionId);
      return true; // Return true if we should unsubscribe from Redis
    }

    return false;
  }

  getCallbacks(sessionId: string): Set<(event: GameEvent) => void> {
    return this.sessionCallbacks.get(sessionId) || new Set();
  }

  getConnectionCount(sessionId: string): number {
    return this.sessionCallbacks.get(sessionId)?.size || 0;
  }

  isSubscribed(sessionId: string): boolean {
    return this.subscribedSessions.has(sessionId);
  }
}

class RedisClient {
  public static MAX_PLAYERS = 8;

  private redis: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private subscriptionManager: SessionSubscriptionManager;

  private scriptsLoaded: Promise<boolean>;

  private static TWO_HOURS = 60 * 60 * 2;

  private static getSessionKey(sessionId: string) {
    return `exquisite_corpse:${sessionId}:state`;
  }

  private static getEventsKey(sessionId: string) {
    return `exquisite_corpse:${sessionId}:events`;
  }

  private static getAiRetriesKey(sessionId: string) {
    return `exquisite_corpse:${sessionId}:ai_retries`;
  }

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    this.redis = new Redis(redisUrl, {
      showFriendlyErrorStack: process.env.NODE_ENV === 'development',
    });
    this.subscriber = new Redis(redisUrl);
    this.publisher = new Redis(redisUrl);
    this.subscriptionManager = new SessionSubscriptionManager();

    this.scriptsLoaded = this.loadScripts();

    // Single message handler for all game sessions
    this.subscriber.on('message', (channel: string, message: string) => {
      // Extract session ID from channel name
      const match = channel.match(/exquisite_corpse:([^:]+):events/);
      if (match) {
        const sessionId = match[1];
        try {
          const event = JSON.parse(message) as GameEvent;
          const callbacks = this.subscriptionManager.getCallbacks(sessionId);
          callbacks.forEach(cb => cb(event));
        } catch (error) {
          console.error('Failed to parse event message:', error);
        }
      }
    });
  }

  async loadScripts() {
    const dirPath = process.cwd() + '/app/lib/';

    const [
      eqConnect,
      eqDisconnect,
      eqAddTurn,
    ] = await Promise.all([
      fs.readFile(dirPath + 'connect.lua').then(buff => buff.toString()),
      fs.readFile(dirPath + 'disconnect.lua').then(buff => buff.toString()),
      fs.readFile(dirPath + 'addTurn.lua').then(buff => buff.toString()),
    ]);

    this.redis.defineCommand("eqConnect", {
      numberOfKeys: 1,
      lua: eqConnect,
    });
    this.redis.defineCommand("eqDisconnect", {
      numberOfKeys: 1,
      lua: eqDisconnect,
    });
    this.redis.defineCommand("eqAddTurn", {
      numberOfKeys: 1,
      lua: eqAddTurn,
    });

    return true;
  }

  async initializeGame(sessionId: string, gameState: MultiplayerGameState) {
    const key = RedisClient.getSessionKey(sessionId);
    const result = await this.redis
      .pipeline()
      .call('JSON.SET', key, '.', JSON.stringify(gameState), 'NX')
      .expire(key, RedisClient.TWO_HOURS)
      .call('JSON.GET', key, '.')
      .exec();

    return validatePipelineResult(result, res => res[2][1] as MultiplayerGameState);
  }

  parseGameState(gameState: string): Promise<MultiplayerGameState> {
    try {
      return JSON.parse(gameState);
    } catch (error) {
      console.group('Failed to parse game state')
      console.error(`Received state:\n${gameState}`);
      console.error(`Error:\n${error}`);
      console.groupEnd();

      throw error;
    }
  }

  async getGameState(sessionId: string) {
    const result = await this.redis.call(
      'JSON.GET',
      RedisClient.getSessionKey(sessionId),
      '.'
    );

    if (!result) {
      throw new ReplyError('NOT_FOUND Session does not exist')
    }

    return this.parseGameState(result as string);
  }

  async addTurn(sessionId: string, turn: CurveTurn) {
    const sessionKey = RedisClient.getSessionKey(sessionId);

    await this.scriptsLoaded;

    return this.parseGameState(
      await this.redis.eqAddTurn(sessionKey, JSON.stringify(turn))
    );
  }

  // NOTE: Players are separated from other game state since this is essentially
  // the only way a multi command could realistically fail due to simultaneous access
  async addPlayer(sessionId: string, newPlayer: Player) {
    const sessionKey = RedisClient.getSessionKey(sessionId);

    const playerName = newPlayer.name;

    await this.scriptsLoaded;

    return this.parseGameState(
      await this.redis.eqConnect(
        sessionKey,
        `.players.${playerName}`,
        JSON.stringify(newPlayer)
      )
    );
  }

  async removePlayer(sessionId: string, playerName: string) {
    const sessionKey = RedisClient.getSessionKey(sessionId);

    await this.scriptsLoaded;

    return this.parseGameState(
      await this.redis.eqDisconnect(
        sessionKey,
        playerName
      )
    );
  }

  async deleteGameState(sessionId: string) {
    return this.redis.del(RedisClient.getSessionKey(sessionId));
  }

  // Event publishing
  async publishEvent(sessionId: string, event: GameEvent): Promise<void> {
    const channel = RedisClient.getEventsKey(sessionId);
    await this.publisher.publish(channel, JSON.stringify(event));
  }

  // Event subscription
  async subscribeToGame(sessionId: string, callback: (event: GameEvent) => void): Promise<void> {
    const channel = RedisClient.getEventsKey(sessionId);

    const isNewSubscription = this.subscriptionManager.addCallback(sessionId, callback);

    if (isNewSubscription) {
      await this.subscriber.subscribe(channel);
    }
  }

  async unsubscribeFromGame(sessionId: string, callback: (event: GameEvent) => void): Promise<void> {
    const channel = RedisClient.getEventsKey(sessionId);

    const shouldUnsubscribe = this.subscriptionManager.removeCallback(sessionId, callback);

    if (shouldUnsubscribe) {
      await this.subscriber.unsubscribe(channel);
    }
  }

  getConnectionCount(sessionId: string): number {
    return this.subscriptionManager.getConnectionCount(sessionId);
  }

  // AI turn retry tracking
  async setAIRetryCount(sessionId: string, count: number): Promise<void> {
    await this.redis.setex(
      RedisClient.getAiRetriesKey(sessionId),
      RedisClient.TWO_HOURS,
      count.toString()
    );
  }

  async getAIRetryCount(sessionId: string): Promise<number> {
    const count = await this.redis.get(RedisClient.getAiRetriesKey(sessionId));

    return count ? parseInt(count, 10) : 0;
  }

  async resetAIRetryCount(sessionId: string): Promise<void> {
    await this.redis.del(RedisClient.getAiRetriesKey(sessionId));
  }

  // Cleanup
  async disconnect(): Promise<void> {
    this.redis.disconnect();
    this.subscriber.disconnect();
    this.publisher.disconnect();
  }
}

// Singleton instance
let redisClient: RedisClient | null = null;

export const getRedisClient = (): RedisClient => {
  if (!redisClient) {
    redisClient = new RedisClient();
  }

  return redisClient;
};

export { RedisClient };

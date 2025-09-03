import Redis from 'ioredis';
import type { MultiplayerGameState, GameEvent, GameStatus, Player } from '@/app/types/multiplayer';
import type { CurveTurn } from '@/app/types/exquisiteCorpse';
import { RedisError, validatePipelineResult } from '../api/middleware/redis';
import { GameError } from '../api/exquisite-corpse/gameError';

export type RedisGameState = Omit<MultiplayerGameState, 'players'>;

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

    console.log('removing callback');

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

// FIXME: Every time any value is set corresponding to a given game ID, reset the TTL for all related keys
// FIXME: Check that every function updates the relevant status
class RedisClient {
  public static MAX_PLAYERS = 8;

  private redis: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private subscriptionManager: SessionSubscriptionManager;

  private static TWO_HOURS = 60 * 60 * 2;

  private static getSessionKey(sessionId: string) {
    return `exquisite_corpse:${sessionId}:state`;
  }

  private static getEventsKey(sessionId: string) {
    return `exquisite_corpse:${sessionId}:events`;
  }

  private static getPlayersKey(sessionId: string) {
    return `exquisite_corpse:${sessionId}:players`;
  }

  private static getAiRetriesKey(sessionId: string) {
    return `exquisite_corpse:${sessionId}:ai_retries`;
  }

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    this.redis = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
    this.publisher = new Redis(redisUrl);
    this.subscriptionManager = new SessionSubscriptionManager();

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

  // Session ID generation (5-character alphanumeric)
  generateSessionId(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async initializeGame(sessionId: string, gameState: RedisGameState): Promise<RedisGameState> {
    const key = RedisClient.getSessionKey(sessionId);
    const result = await this.redis
      .pipeline()
      .call('JSON.SET', key, '.', JSON.stringify(gameState), 'NX')
      .expire(key, RedisClient.TWO_HOURS)
      .call('JSON.GET', key, '.')
      .exec();

    return validatePipelineResult(result, res => res[2][1] as RedisGameState);
  }

  async initializePlayers(sessionId: string, players: Player[]) {
    const key = RedisClient.getPlayersKey(sessionId);
    const playerMap = Object.fromEntries(players.map(player => [player.name, player]));
    const result = await this.redis
      .pipeline()
      .call('JSON.SET', key, '.', JSON.stringify(playerMap), 'NX')
      .call('JSON.GET', key, '.')
      .exec();

    return validatePipelineResult(result, res => res[1][1] as Partial<Record<string, Player>>);
  }

  async getGameState(sessionId: string): Promise<MultiplayerGameState | null> {
    const result = await this.redis
      .pipeline()
      .call('JSON.GET', RedisClient.getSessionKey(sessionId), '.')
      .call('JSON.GET', RedisClient.getPlayersKey(sessionId), '.')
      .exec();

    const validated = validatePipelineResult(result);

    try {
      const gameState = JSON.parse(validated[0][1] as string | null ?? '');
      const players = JSON.parse(validated[1][1] as string | null ?? '');

      return {
        ...gameState,
        players
      }
    } catch (error) {
      console.group('Failed to parse game state or player JSON');
      console.error('gameState', validated[0][1]);
      console.error('players', validated[1][1]);
      console.groupEnd();

      const rawGameState = validated[0][1];
      const rawPlayers = validated[1][1];

      if (rawGameState === null) {
        throw GameError.GAME_NOT_FOUND(sessionId);
      } else if (rawPlayers === null) {
        throw GameError.PLAYERS_NOT_FOUND(sessionId);
      } else {
        console.group(`Failed to parse game or players JSON for session ${sessionId}`);
        console.error(`GameState: ${rawGameState}`);
        console.error(`Players: ${rawPlayers}`);
        console.groupEnd();

        throw error;
      }
    }
  }

  async updateGameStatus(sessionId: string, status: GameStatus) {
    const sessionKey = RedisClient.getSessionKey(sessionId);

    try {
      return await this.redis.call(
        'JSON.MSET',
        sessionKey, '.status', JSON.stringify(status),
        sessionKey, '.updatedAt', JSON.stringify(new Date().toISOString()),
      )
    } catch (error) {
      throw new RedisError(error as string | Error ?? 'Failed to update game status');
    }
  }

  async addTurn(sessionId: string, turn: CurveTurn) {
    const sessionKey = RedisClient.getSessionKey(sessionId);

    return validatePipelineResult(
      await this.redis
        .pipeline()
        .call('JSON.ARRAPPEND', sessionKey, '.turns', JSON.stringify(turn))
        .call('JSON.SET', sessionKey, '.status', JSON.stringify('turn_ended'))
        .exec()
    );
  }

  // NOTE: Players are separated from other game state since this is essentially
  // the only way a multi command could realistically fail due to simultaneous access
  async addPlayer(sessionId: string, newPlayer: Player) {
    const playerName = newPlayer.name;
    const playersKey = RedisClient.getPlayersKey(sessionId);

    // FIXME: check if at max players, multiple attempts on failure
    try {
      await this.redis.call(
        'JSON.SET',
        playersKey,
        `.${playerName}`,
        JSON.stringify(newPlayer),
        'NX'
      );
    } catch (error) {
      throw new RedisError(error as string | Error);
    }
  }

  // FIXME: lua script to avoid two round trips w/watch/multi/exec
  async removePlayer(sessionId: string, playerName: string) {
    const playersKey = RedisClient.getPlayersKey(sessionId);

    await this.redis.watch(playersKey);

    const playersJson = await this.redis.call('JSON.GET', playersKey, '.') as string | null;
    const playerMap = await JSON.parse(playersJson ?? '') as Record<string, Player>;

    if (playerMap[playerName]) {
      const wasActive = playerMap[playerName].isActive;

      delete playerMap[playerName];

      const players = Object.values(playerMap);

      // handle promotions if necessary
      let toPromote: Player | undefined = undefined;
      if (wasActive && players.length > 1) {
        for (const player of players) {
          if (player.name !== 'AI') {
            if (
              !toPromote
              || (new Date(player.joinedAt).getTime() < new Date(toPromote.joinedAt).getTime())
            ) {
              toPromote = player;
            }
          }
        }

        if (toPromote) toPromote.isActive = true;
      }

      await this.redis.call(
        'JSON.SET',
        playersKey,
        '.',
        JSON.stringify(playerMap),
      );
    }
  }

  // FIXME: lua script, what if there needs to be more than one promotion?
  async doPromotion(sessionId: string) {
    const playersKey = RedisClient.getPlayersKey(sessionId);

    await this.redis.watch(playersKey);

    const playersJson = await this.redis.call('JSON.GET', playersKey, '.') as string | null;
    const playerMap = await JSON.parse(playersJson ?? '') as Record<string, Player>;

    const players = Object.values(playerMap);
    const nActivePlayers = players.reduce(
      (nActive, player) => nActive + Number(player.isActive),
      0
    );

    // no need to promote if nobody can play anyway
    if (players.length > 1 && nActivePlayers < 2) {
      let toPromote: Player | undefined = undefined;

      for (const player of players) {
        if (player.name !== 'AI') {
          if (
            !toPromote
            || (new Date(player.joinedAt).getTime() < new Date(toPromote.joinedAt).getTime())
          ) {
            toPromote = player;
          }
        }
      }

      if (toPromote) {
        return await this.redis.call(
          'JSON.SET',
          playersKey,
          `.${toPromote.name}.isActive`,
          JSON.stringify(true),
        );
      }
    }
  }

  // Update player status
  async updatePlayerStatus(
    sessionId: string,
    playerName: string,
    updates: Partial<Player>
  ) {
    const playersKey = RedisClient.getPlayersKey(sessionId);

    let updateArgs: string[] = [];
    try {
      updateArgs = Object
        .entries(updates)
        .flatMap(([key, val]) => [playersKey, `.${playerName}.${key}`, JSON.stringify(val)]);
    } catch (error) {
      throw new Error(`Failed to parse JSON for partial update:\n${updates}\n${error}`);
    }

    try {
      return await this.redis.call('JSON.MSET', ...updateArgs);
    } catch (error) {
      throw new RedisError(error as string | Error);
    }
  }

  async deleteGameState(sessionId: string) {
    return validatePipelineResult(
      await this.redis
        .pipeline()
        .del(RedisClient.getSessionKey(sessionId))
        .del(RedisClient.getPlayersKey(sessionId))
        .exec()
    );
  }

  async gameExists(sessionId: string): Promise<boolean> {
    try {
      return (await this.redis.exists(RedisClient.getSessionKey(sessionId))) === 1;
    } catch (error) {
      throw new RedisError(error as string | Error);
    }
  }

  async playerExistsInGame(sessionId: string, playerName: string): Promise<boolean> {
    const result = await this.redis
      .pipeline()
      .exists(RedisClient.getSessionKey(sessionId))
      .call('JSON.TYPE', RedisClient.getPlayersKey(sessionId), `.${playerName}`)
      .exec();

    return validatePipelineResult(result, res => res[1][1] !== null);
  }

  // Event publishing
  async publishEvent<T>(sessionId: string, event: GameEvent<T>): Promise<void> {
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

  // Get all active game session IDs
  async getAllGameSessions(): Promise<string[]> {
    const cursor = this.redis.scanStream({
      match: 'exquisite_corpse:*:state',
      type: 'hash'
    });

    const sessionIds: string[] = [];

    for await (const keys of cursor) {
      for (const key of keys) {
        const match = key.match(/exquisite_corpse:([^:]+):state/);
        if (match) {
          sessionIds.push(match[1]);
        }
      }
    }

    return sessionIds;
  }

  // Get games by status (for monitoring/cleanup)
  async getGamesByStatus(status: GameStatus): Promise<string[]> {
    const cursor = this.redis.scanStream({
      match: 'exquisite_corpse:*:state',
      type: 'hash'
    });

    const sessionIds: string[] = [];

    for await (const keys of cursor) {
      for (const key of keys) {
        const gameStatus = await this.redis.hget(key, 'status');
        if (gameStatus === status) {
          const match = key.match(/exquisite_corpse:([^:]+):state/);
          if (match) {
            sessionIds.push(match[1]);
          }
        }
      }
    }

    return sessionIds;
  }

  // Get TTL for a game state
  async getGameStateTTL(sessionId: string): Promise<number> {
    const key = `exquisite_corpse:${sessionId}:state`;
    return await this.redis.ttl(key);
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

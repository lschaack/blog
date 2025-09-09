import { promises as fs } from 'fs';
import Redis, { ReplyError } from 'ioredis';
import type { MultiplayerGameState, GameEvent, Player } from '@/app/types/multiplayer';
import type { CurveTurn } from '@/app/types/exquisiteCorpse';
import { validatePipelineResult } from '../api/middleware/redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export type SSEClient = {
  controller: ReadableStreamDefaultController;
  cleanup: () => void
}

class GameEventManager {
  private encoder = new TextEncoder();
  // map from sessionId to Set<connectionToken>
  private connections = new Map<string, Set<string>>;
  // map from connectionToken to client
  private clients = new Map<string, SSEClient>();

  private subscriber: Redis;
  private publisher: Redis;

  private static getEventsKey(sessionId: string) {
    return `exquisite_corpse:${sessionId}:events`;
  }

  private static ALL_EVENTS = GameEventManager.getEventsKey('?????');

  constructor() {
    this.publisher = new Redis(REDIS_URL);
    this.subscriber = new Redis(REDIS_URL);

    this.subscriber.psubscribe(GameEventManager.ALL_EVENTS);

    this.subscriber.on('pmessage', (pattern: string, channel: string, message: string) => {
      if (pattern === GameEventManager.ALL_EVENTS) {
        // Extract session ID from channel name
        const match = channel.match(/exquisite_corpse:([^:]+):events/);

        if (match) {
          const sessionId = match[1];

          try {
            const event = JSON.parse(message) as GameEvent;

            this.handleEvent(sessionId, event)
          } catch (error) {
            console.error('Failed to parse event message:', error);
          }
        }
      }
    });
  }

  async publishEvent(sessionId: string, event: GameEvent): Promise<void> {
    const channel = GameEventManager.getEventsKey(sessionId);

    await this.publisher.publish(channel, JSON.stringify(event));
  }

  async handleEvent(sessionId: string, event: GameEvent) {
    const connectionTokens = this.connections.get(sessionId);

    if (!connectionTokens?.size) {
      console.warn(`No clients connected to session ${sessionId}`);
    } else {
      for (const connectionToken of connectionTokens) {
        const client = this.clients.get(connectionToken);

        if (!client) {
          console.error(`Missing client for connection ID ${connectionToken}`)
        } else {
          try {
            const data = `event: game_update\ndata: ${JSON.stringify(event)}\n\n`;

            client.controller.enqueue(this.encoder.encode(data));
          } catch {
            console.error('Failed to send event to client, closing connection');

            this.unsubscribeFromGame(sessionId, connectionToken);
          }
        }
      }
    }
  }

  async subscribeToGame(
    sessionId: string,
    connectionToken: string,
    client: SSEClient,
  ) {
    if (!this.connections.has(sessionId)) {
      this.connections.set(sessionId, new Set());
    }

    this.connections.get(sessionId)!.add(connectionToken);
    this.clients.set(connectionToken, client);
  }

  async unsubscribeFromGame(sessionId: string, connectionToken: string) {
    this.clients.delete(connectionToken);
    this.connections.get(sessionId)?.delete(connectionToken);
  }
}

class GameStateManager {
  private redis: Redis;

  private scriptsLoaded: Promise<boolean>;

  private static ONE_HOUR = 60 * 60;

  private static getSessionKey(sessionId: string) {
    return `exquisite_corpse:${sessionId}:state`;
  }

  private static getPlayersKey(sessionId: string) {
    return `exquisite_corpse:${sessionId}:players`;
  }

  private static getConnectionsKey(sessionId: string) {
    return `exquisite_corpse:${sessionId}:connections`;
  }

  private static getAiRetriesKey(sessionId: string) {
    return `exquisite_corpse:${sessionId}:ai_retries`;
  }

  constructor() {
    this.redis = new Redis(REDIS_URL, {
      showFriendlyErrorStack: process.env.NODE_ENV === 'development',
    });

    this.scriptsLoaded = this.loadScripts();
  }

  async loadScripts() {
    const dirPath = process.cwd() + '/app/lib/';

    const [
      eqJoin,
      eqLeave,
      eqConnect,
      eqDisconnect,
      eqAddTurn,
    ] = await Promise.all([
      fs.readFile(dirPath + 'join.lua').then(buff => buff.toString()),
      fs.readFile(dirPath + 'leave.lua').then(buff => buff.toString()),
      fs.readFile(dirPath + 'connect.lua').then(buff => buff.toString()),
      fs.readFile(dirPath + 'disconnect.lua').then(buff => buff.toString()),
      fs.readFile(dirPath + 'addTurn.lua').then(buff => buff.toString()),
    ]);

    this.redis.defineCommand("eqJoin", {
      numberOfKeys: 2,
      lua: eqJoin,
    });
    this.redis.defineCommand("eqLeave", {
      numberOfKeys: 2,
      lua: eqLeave,
    });
    this.redis.defineCommand("eqConnect", {
      numberOfKeys: 3,
      lua: eqConnect,
    });
    this.redis.defineCommand("eqDisconnect", {
      numberOfKeys: 2,
      lua: eqDisconnect,
    });
    this.redis.defineCommand("eqAddTurn", {
      numberOfKeys: 2,
      lua: eqAddTurn,
    });

    return true;
  }

  async initializeGame(sessionId: string, gameState: MultiplayerGameState) {
    const sessionKey = GameStateManager.getSessionKey(sessionId);
    const playersKey = GameStateManager.getPlayersKey(sessionId);

    const pipeline = this.redis
      .pipeline()
      .call('JSON.SET', sessionKey, '.', JSON.stringify(gameState), 'NX')
      .expire(sessionKey, GameStateManager.ONE_HOUR);

    if (gameState.type === 'singleplayer') {
      // create player token for AI
      pipeline
        .call('HSET', playersKey, 'AI', crypto.randomUUID())
        .expire(playersKey, GameStateManager.ONE_HOUR);
    }

    const result = await pipeline.exec();

    return validatePipelineResult(result);
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
      GameStateManager.getSessionKey(sessionId),
      '.'
    );

    if (!result) {
      throw new ReplyError('NOT_FOUND Session does not exist')
    }

    return this.parseGameState(result as string);
  }

  async addTurn(sessionId: string, turn: CurveTurn, playerName: string, playerToken: string) {
    const sessionKey = GameStateManager.getSessionKey(sessionId);
    const playersKey = GameStateManager.getPlayersKey(sessionId);

    await this.scriptsLoaded;

    return this.parseGameState(
      await this.redis.eqAddTurn(
        sessionKey,
        playersKey,
        JSON.stringify(turn),
        playerName,
        playerToken
      )
    );
  }

  async addAiTurn(sessionId: string, turn: CurveTurn) {
    const sessionKey = GameStateManager.getSessionKey(sessionId);
    const playersKey = GameStateManager.getPlayersKey(sessionId);

    const aiPlayerToken = await this.redis.hget(playersKey, 'AI');

    if (!aiPlayerToken) {
      throw new ReplyError('ERR AI Token is missing, something went very wrong');
    }

    await this.scriptsLoaded;

    return this.parseGameState(
      await this.redis.eqAddTurn(
        sessionKey,
        playersKey,
        JSON.stringify(turn),
        'AI',
        aiPlayerToken
      )
    );
  }

  async join(sessionId: string, newPlayer: Player, playerToken: string) {
    const sessionKey = GameStateManager.getSessionKey(sessionId);
    const playersKey = GameStateManager.getPlayersKey(sessionId);

    const playerName = newPlayer.name;

    await this.scriptsLoaded;

    return this.parseGameState(
      await this.redis.eqJoin(
        sessionKey,
        playersKey,
        playerName,
        JSON.stringify(newPlayer),
        playerToken,
      )
    );
  }

  async leave(sessionId: string, playerName: string, playerToken: string) {
    const sessionKey = GameStateManager.getSessionKey(sessionId);
    const playersKey = GameStateManager.getPlayersKey(sessionId);

    await this.scriptsLoaded;

    return this.parseGameState(
      await this.redis.eqLeave(
        sessionKey,
        playersKey,
        playerName,
        playerToken,
      )
    );
  }

  async connectPlayer(sessionId: string, playerName: string, playerToken: string, connectionToken: string) {
    const sessionKey = GameStateManager.getSessionKey(sessionId);
    const playersKey = GameStateManager.getPlayersKey(sessionId);
    const connectionsKey = GameStateManager.getConnectionsKey(sessionId);

    await this.scriptsLoaded;

    return this.parseGameState(
      await this.redis.eqConnect(
        sessionKey,
        playersKey,
        connectionsKey,
        connectionToken,
        playerName,
        playerToken,
      )
    );
  }

  async disconnectPlayer(sessionId: string, playerName: string, connectionToken: string) {
    const sessionKey = GameStateManager.getSessionKey(sessionId);
    const connectionsKey = GameStateManager.getConnectionsKey(sessionId);

    await this.scriptsLoaded;

    return this.parseGameState(
      await this.redis.eqDisconnect(
        sessionKey,
        connectionsKey,
        connectionToken,
        playerName,
      )
    );
  }

  async deleteGameState(sessionId: string) {
    return this.redis.del(GameStateManager.getSessionKey(sessionId));
  }

  // AI turn retry tracking
  async setAIRetryCount(sessionId: string, count: number): Promise<void> {
    await this.redis.setex(
      GameStateManager.getAiRetriesKey(sessionId),
      GameStateManager.ONE_HOUR,
      count.toString()
    );
  }

  async getAIRetryCount(sessionId: string): Promise<number> {
    const count = await this.redis.get(GameStateManager.getAiRetriesKey(sessionId));

    return count ? parseInt(count, 10) : 0;
  }

  async resetAIRetryCount(sessionId: string): Promise<void> {
    await this.redis.del(GameStateManager.getAiRetriesKey(sessionId));
  }

  // Cleanup
  async disconnect(): Promise<void> {
    this.redis.disconnect();
  }
}

// Singleton instance
let redisClient: GameStateManager | null = null;
export const getRedisClient = (): GameStateManager => {
  if (!redisClient) {
    redisClient = new GameStateManager();
  }

  return redisClient;
};

let gameEventManager: GameEventManager | null = null;
export const getGameEventManager = (): GameEventManager => {
  if (!gameEventManager) {
    gameEventManager = new GameEventManager();
  }

  return gameEventManager;
};

export { GameStateManager, GameEventManager };

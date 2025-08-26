import Redis from 'ioredis';
import type { MultiplayerGameState, GameEvent, GameStatus, GameType, Player } from '@/app/types/multiplayer';
import type { CurveTurn } from '@/app/types/exquisiteCorpse';

class RedisClient {
  private redis: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    this.redis = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
    this.publisher = new Redis(redisUrl);
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

  // Game state management
  async setGameState(sessionId: string, gameState: MultiplayerGameState): Promise<void> {
    await this.setGameStateWithTTL(sessionId, gameState, 24 * 60 * 60); // 24h TTL
  }

  async setGameStateWithTTL(sessionId: string, gameState: MultiplayerGameState, ttlSeconds: number): Promise<void> {
    const pipeline = this.redis.pipeline();

    // Set main game data using hash
    pipeline.hset(`exquisite_corpse:${sessionId}:state`, {
      sessionId: gameState.sessionId,
      gameId: gameState.gameId,
      type: gameState.type,
      status: gameState.status,
      createdAt: gameState.createdAt,
      updatedAt: gameState.updatedAt,
      players: JSON.stringify(gameState.players),
      turns: JSON.stringify(gameState.turns)
    });

    // Update active players set
    pipeline.del(`exquisite_corpse:${sessionId}:active_players`);
    const activePlayers = gameState.players
      .filter(p => p.isActive)
      .map(p => p.id);

    if (activePlayers.length > 0) {
      pipeline.sadd(`exquisite_corpse:${sessionId}:active_players`, ...activePlayers);
    }

    // Update player connections
    gameState.players.forEach(player => {
      pipeline.hset(`exquisite_corpse:player_connections`, player.connectionId, sessionId);
    });

    // Set TTL for cleanup
    pipeline.expire(`exquisite_corpse:${sessionId}:state`, ttlSeconds);
    pipeline.expire(`exquisite_corpse:${sessionId}:active_players`, ttlSeconds);

    await pipeline.exec();
  }

  async getGameState(sessionId: string): Promise<MultiplayerGameState | null> {
    const data = await this.redis.hgetall(`exquisite_corpse:${sessionId}:state`);

    if (!data.sessionId) {
      return null;
    }

    return {
      sessionId: data.sessionId,
      gameId: data.gameId,
      type: data.type as GameType,
      status: data.status as GameStatus,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      players: JSON.parse(data.players || '[]'),
      turns: JSON.parse(data.turns || '[]')
    };
  }

  // Efficient partial updates
  async updateGameStatus(sessionId: string, status: GameStatus): Promise<void> {
    await this.redis.hset(`exquisite_corpse:${sessionId}:state`, {
      status,
      updatedAt: new Date().toISOString()
    });
  }

  async updateCurrentPlayer(sessionId: string, playerId: string): Promise<void> {
    await this.redis.hset(`exquisite_corpse:${sessionId}:state`, {
      currentPlayer: playerId,
      updatedAt: new Date().toISOString()
    });
  }

  // Add a new turn (append-only operation)
  async addTurn(sessionId: string, turn: CurveTurn): Promise<void> {
    const pipeline = this.redis.pipeline();

    // Get current turns, add new one, and update
    const currentTurns = await this.redis.hget(`exquisite_corpse:${sessionId}:state`, 'turns');
    const turns = currentTurns ? JSON.parse(currentTurns) : [];
    turns.push(turn);

    pipeline.hset(`exquisite_corpse:${sessionId}:state`, {
      turns: JSON.stringify(turns),
      updatedAt: new Date().toISOString()
    });

    await pipeline.exec();
  }

  // Update player status
  async updatePlayerStatus(
    sessionId: string,
    playerId: string,
    updates: Partial<Player>
  ): Promise<void> {
    const gameState = await this.getGameState(sessionId);
    if (!gameState) return;

    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    // Update player data
    gameState.players[playerIndex] = {
      ...gameState.players[playerIndex],
      ...updates
    };
    gameState.updatedAt = new Date().toISOString();

    const pipeline = this.redis.pipeline();

    // Update players data
    pipeline.hset(`exquisite_corpse:${sessionId}:state`, {
      players: JSON.stringify(gameState.players),
      updatedAt: gameState.updatedAt
    });

    // Update active players set
    if (updates.isActive !== undefined) {
      if (updates.isActive) {
        pipeline.sadd(`exquisite_corpse:${sessionId}:active_players`, playerId);
      } else {
        pipeline.srem(`exquisite_corpse:${sessionId}:active_players`, playerId);
      }
    }

    // Update connection mapping
    if (updates.connectionId) {
      pipeline.hset(`exquisite_corpse:player_connections`, updates.connectionId, sessionId);
    }

    await pipeline.exec();
  }

  async deleteGameState(sessionId: string): Promise<void> {
    const pipeline = this.redis.pipeline();

    // Get players to clean up connections
    const gameState = await this.getGameState(sessionId);
    if (gameState) {
      gameState.players.forEach(player => {
        pipeline.hdel(`exquisite_corpse:player_connections`, player.connectionId);
      });
    }

    // Delete game data
    pipeline.del(`exquisite_corpse:${sessionId}:state`);
    pipeline.del(`exquisite_corpse:${sessionId}:active_players`);

    await pipeline.exec();
  }

  async gameExists(sessionId: string): Promise<boolean> {
    return (await this.redis.exists(`exquisite_corpse:${sessionId}:state`)) === 1;
  }

  // Get game by connection ID
  async getGameByConnection(connectionId: string): Promise<string | null> {
    return await this.redis.hget(`exquisite_corpse:player_connections`, connectionId);
  }

  // Get active players count
  async getActivePlayersCount(sessionId: string): Promise<number> {
    return await this.redis.scard(`exquisite_corpse:${sessionId}:active_players`);
  }

  // Check if player is active
  async isPlayerActive(sessionId: string, playerId: string): Promise<boolean> {
    const result = await this.redis.sismember(`exquisite_corpse:${sessionId}:active_players`, playerId);
    return result === 1;
  }

  // Event publishing
  async publishEvent<T>(sessionId: string, event: GameEvent<T>): Promise<void> {
    const channel = `exquisite_corpse:${sessionId}:events`;
    await this.publisher.publish(channel, JSON.stringify(event));
  }

  // Event subscription
  async subscribeToGame(sessionId: string, callback: (event: GameEvent) => void): Promise<void> {
    const channel = `exquisite_corpse:${sessionId}:events`;

    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const event = JSON.parse(message) as GameEvent;
          callback(event);
        } catch (error) {
          console.error('Failed to parse event message:', error);
        }
      }
    });

    await this.subscriber.subscribe(channel);
  }

  async unsubscribeFromGame(sessionId: string): Promise<void> {
    const channel = `exquisite_corpse:${sessionId}:events`;
    await this.subscriber.unsubscribe(channel);
  }

  // Player connection tracking
  async setPlayerConnection(sessionId: string, playerId: string, connectionId: string): Promise<void> {
    await this.redis.hset(`exquisite_corpse:player_connections`, connectionId, sessionId);
  }

  async getPlayerConnection(sessionId: string, playerId: string): Promise<string | null> {
    // Get game state to find player's connection ID
    const gameState = await this.getGameState(sessionId);
    if (!gameState) return null;

    const player = gameState.players.find(p => p.id === playerId);
    return player?.connectionId || null;
  }

  async removePlayerConnection(sessionId: string, playerId: string): Promise<void> {
    // Get player's connection ID first
    const connectionId = await this.getPlayerConnection(sessionId, playerId);
    if (connectionId) {
      await this.redis.hdel(`exquisite_corpse:player_connections`, connectionId);
    }
  }

  // Clean up disconnected player by connection ID
  async cleanupPlayerConnection(connectionId: string): Promise<void> {
    const sessionId = await this.redis.hget(`exquisite_corpse:player_connections`, connectionId);
    if (sessionId) {
      // Remove from connection mapping
      await this.redis.hdel(`exquisite_corpse:player_connections`, connectionId);

      // Update player status in game
      const gameState = await this.getGameState(sessionId);
      if (gameState) {
        const player = gameState.players.find(p => p.connectionId === connectionId);
        if (player) {
          await this.updatePlayerStatus(sessionId, player.id, {
            isActive: false,
            connectionStatus: 'disconnected',
            disconnectedAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString()
          });
        }
      }
    }
  }

  // AI turn retry tracking
  async setAIRetryCount(sessionId: string, count: number): Promise<void> {
    const key = `exquisite_corpse:${sessionId}:ai_retries`;
    await this.redis.setex(key, 24 * 60 * 60, count.toString());
  }

  async getAIRetryCount(sessionId: string): Promise<number> {
    const key = `exquisite_corpse:${sessionId}:ai_retries`;
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  async resetAIRetryCount(sessionId: string): Promise<void> {
    const key = `exquisite_corpse:${sessionId}:ai_retries`;
    await this.redis.del(key);
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

import Redis from 'ioredis';
import type { MultiplayerGameState, GameEvent } from '@/app/types/multiplayer';

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
    const key = `exquisite_corpse:${sessionId}:state`;
    await this.redis.setex(key, 24 * 60 * 60, JSON.stringify(gameState)); // 24h TTL
  }

  async getGameState(sessionId: string): Promise<MultiplayerGameState | null> {
    const key = `exquisite_corpse:${sessionId}:state`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteGameState(sessionId: string): Promise<void> {
    const key = `exquisite_corpse:${sessionId}:state`;
    await this.redis.del(key);
  }

  async gameExists(sessionId: string): Promise<boolean> {
    const key = `exquisite_corpse:${sessionId}:state`;
    return (await this.redis.exists(key)) === 1;
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
    const key = `exquisite_corpse:${sessionId}:connections:${playerId}`;
    await this.redis.setex(key, 24 * 60 * 60, connectionId);
  }

  async getPlayerConnection(sessionId: string, playerId: string): Promise<string | null> {
    const key = `exquisite_corpse:${sessionId}:connections:${playerId}`;
    return await this.redis.get(key);
  }

  async removePlayerConnection(sessionId: string, playerId: string): Promise<void> {
    const key = `exquisite_corpse:${sessionId}:connections:${playerId}`;
    await this.redis.del(key);
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

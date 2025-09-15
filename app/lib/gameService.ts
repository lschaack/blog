import { randomUUID } from 'crypto';
import { getGameEventManager, getRedisClient, SSEClient } from './redis';
import type {
  Player,
  GameStateUpdate,
  MultiplayerGameState,
} from '@/app/types/multiplayer';
import { generateAICurveTurn } from '@/app/lib/aiTurnService';
import type { CurveTurn, Line } from '@/app/types/exquisiteCorpse';
import { generateSessionId } from '../exquisite-corpse/sessionId';
import { GameType } from '../api/exquisite-corpse/schemas';
import { prisma } from './prisma';
import { loadEnvConfig } from '@next/env'

export class GameService {
  private redis = getRedisClient();
  private eventManager = getGameEventManager();
  private static MAX_AI_RETRIES = 3;

  async createGame(type: GameType): Promise<{ sessionId: string }> {
    const sessionId = generateSessionId();
    const gameId = randomUUID();

    const players: Record<string, Player> = {};
    if (type === 'singleplayer') {
      players['AI'] = {
        name: 'AI',
        connected: true,
      };
    }

    await this.redis.initializeGame(sessionId, {
      sessionId,
      gameId,
      type,
      turns: [],
      eventLog: [{
        type: 'game_created',
        timestamp: Date.now(),
      }],
      players,
      currentPlayer: null,
    });

    return { sessionId };
  }

  async join(sessionId: string, name: string, token: string) {
    const newPlayer: Player = {
      name,
      connected: false,
    };

    const gameState = await this.redis.join(sessionId, newPlayer, token);

    await this.publishGameState(sessionId, gameState);
  }

  async leave(sessionId: string, playerName: string, playerToken: string): Promise<void> {
    const gameState = await this.redis.leave(sessionId, playerName, playerToken);

    await this.publishGameState(sessionId, gameState);
  }

  async connect(sessionId: string, playerName: string, playerToken: string, connectionToken: string, client: SSEClient) {
    const gameState = await this.redis.connectPlayer(sessionId, playerName, playerToken, connectionToken);

    this.eventManager.subscribeToGame(sessionId, connectionToken, client);

    await this.publishGameState(sessionId, gameState);

    return gameState;
  }

  async disconnect(sessionId: string, playerName: string, connectionToken: string): Promise<void> {
    const gameState = await this.redis.disconnectPlayer(sessionId, playerName, connectionToken);

    this.eventManager.unsubscribeFromGame(sessionId, connectionToken);

    await this.publishGameState(sessionId, gameState);
  }

  async submitTurn(sessionId: string, playerName: string, playerToken: string, path: Line): Promise<void> {
    const turn: CurveTurn = {
      path,
      author: playerName,
      timestamp: new Date().toISOString(),
    };

    const gameState = await this.redis.addTurn(
      sessionId,
      turn,
      playerName,
      playerToken
    );

    await this.publishGameState(sessionId, gameState);

    if (gameState.currentPlayer === 'AI') {
      this.startAITurn(sessionId);
    }
  }

  async startAITurn(sessionId: string): Promise<void> {
    const gameState = await this.redis.startAiTurn(sessionId);

    this.processAITurnBackground(sessionId, gameState);

    await this.publishGameState(sessionId, gameState);
  }

  private async getAITurn(gameState: MultiplayerGameState) {
    const dimensions = { width: 512, height: 512 };
    const aiResponse = await generateAICurveTurn(gameState.turns, dimensions);

    const aiTurn: CurveTurn = {
      ...aiResponse,
      author: 'AI',
      timestamp: new Date().toISOString(),
    };

    return aiTurn;
  }

  private async processAITurnBackground(sessionId: string, gameState: MultiplayerGameState): Promise<void> {
    try {
      const turn = await this.getAITurn(gameState);

      const nextGameState = await this.redis.addAiTurn(sessionId, turn);

      this.publishGameState(sessionId, nextGameState);

      await this.redis.resetAIRetryCount(sessionId);
    } catch (error) {
      console.error(`AI turn failed: ${error}`)
      await this.handleAITurnFailure(sessionId);
    }
  }

  private async handleAITurnFailure(sessionId: string): Promise<void> {
    const retryCount = await this.redis.getAIRetryCount(sessionId);
    const newRetryCount = retryCount + 1;

    if (newRetryCount <= GameService.MAX_AI_RETRIES) {
      await this.redis.setAIRetryCount(sessionId, newRetryCount);
      const gameState = await this.redis.getGameState(sessionId);

      setTimeout(() => {
        this.processAITurnBackground(sessionId, gameState);
      }, 2000 * newRetryCount); // Exponential backoff
    } else {
      const nextGameState = await this.redis.failAiTurn(sessionId);

      this.publishGameState(sessionId, nextGameState);
    }
  }

  private async publishGameState(
    sessionId: string,
    gameState?: MultiplayerGameState,
  ): Promise<void> {
    const event: GameStateUpdate = { status: 'game_update', gameState };

    await this.eventManager.publishEvent(sessionId, event);

    if (gameState) {
      await prisma.exquisiteCorpseGame.upsert({
        where: { uuid: gameState.gameId },
        update: {
          data: gameState,
        },
        create: {
          uuid: gameState.gameId,
          data: gameState,
        }
      });
    }
  }
}

// Singleton instance
let gameService: GameService | null = null;

export const getGameService = (): GameService => {
  if (!gameService) {
    gameService = new GameService();
  }
  return gameService;
};

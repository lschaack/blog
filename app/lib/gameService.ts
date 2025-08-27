import { randomUUID } from 'crypto';
import { getRedisClient } from './redis';
import type {
  MultiplayerGameState,
  Player,
  GameEvent,
  CreateGameRequest,
  JoinGameRequest,
  SubmitTurnRequest
} from '@/app/types/multiplayer';
import { generateAICurveTurn } from '@/app/lib/aiTurnService';
import type { CurveTurn } from '@/app/types/exquisiteCorpse';
import { getCurrentPlayer, isCurrentPlayer } from './gameUtils';

export class GameService {
  private redis = getRedisClient();
  private static MAX_AI_RETRIES = 3;

  async createGame(request: CreateGameRequest): Promise<{ sessionId: string; playerId: string }> {
    const sessionId = this.redis.generateSessionId();
    const gameId = randomUUID();
    const playerId = randomUUID();
    const connectionId = randomUUID();

    // Create initial player
    const now = new Date().toISOString();
    const player: Player = {
      id: playerId,
      name: request.playerName,
      connectionId,
      joinedAt: now,
      isActive: true,
      connectionStatus: 'connected',
      lastSeenAt: now
    };

    // Add AI player for AI games
    const players: Player[] = [player];
    if (request.gameType === 'ai') {
      players.push({
        id: 'ai',
        name: 'AI',
        connectionId: 'ai',
        joinedAt: now + 1, // ensure first player always starts
        isActive: true,
        connectionStatus: 'connected',
        lastSeenAt: now
      });
    }

    // Create initial game state
    const gameState: MultiplayerGameState = {
      sessionId,
      gameId,
      type: request.gameType,
      players,
      status: 'game_started',
      turns: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.redis.initializeGame(sessionId, gameState);
    await this.redis.setPlayerConnection(sessionId, playerId, connectionId);

    // Publish game started event
    await this.publishEvent(sessionId, 'game_started', { game: gameState });

    return { sessionId, playerId };
  }

  async joinGame(sessionId: string, request: JoinGameRequest): Promise<{ playerId: string; isActive: boolean }> {
    // Perform lazy cleanup before joining game
    const gameState = await this.redis.getGameState(sessionId);
    if (!gameState) {
      throw new Error('Game not found');
    }

    const now = new Date().toISOString();

    // Check if this is a reconnection attempt - look for disconnected player with same name
    const existingPlayer = gameState.players.find(p =>
      p.name === request.playerName &&
      p.connectionStatus === 'disconnected' &&
      p.id !== 'ai'
    );

    if (existingPlayer) {
      // Reconnection - reactivate existing player
      const newConnectionId = randomUUID();

      await this.redis.updatePlayerStatus(sessionId, existingPlayer.id, {
        connectionStatus: 'connected',
        connectionId: newConnectionId,
        lastSeenAt: now,
        disconnectedAt: undefined
      });

      await this.redis.setPlayerConnection(sessionId, existingPlayer.id, newConnectionId);

      // Check for player promotions after reconnection - get fresh state
      await this.handlePlayerPromotionsAfterReconnect(sessionId);

      // Get updated player info for event
      const updatedGameState = await this.redis.getGameState(sessionId);
      const updatedPlayer = updatedGameState?.players.find(p => p.id === existingPlayer.id);

      if (updatedPlayer) {
        await this.publishEvent(sessionId, 'player_joined', {
          player: updatedPlayer,
          isActive: updatedPlayer.isActive
        });

        return { playerId: existingPlayer.id, isActive: updatedPlayer.isActive };
      }

      return { playerId: existingPlayer.id, isActive: existingPlayer.isActive };
    }

    // Not a reconnection - create new player
    const playerId = randomUUID();
    const connectionId = randomUUID();

    // Determine if this player should be active
    const connectedActivePlayerCount = gameState.players.filter(p =>
      p.isActive && p.id !== 'ai' && p.connectionStatus === 'connected'
    ).length;
    const maxActivePlayers = gameState.type === 'ai' ? 1 : 2;
    const isActive = connectedActivePlayerCount < maxActivePlayers;

    const newPlayer: Player = {
      id: playerId,
      name: request.playerName,
      connectionId,
      joinedAt: now,
      isActive,
      connectionStatus: 'connected',
      lastSeenAt: now
    };

    // Add new player using fresh state operations
    await this.addNewPlayerToGame(sessionId, newPlayer);
    await this.redis.setPlayerConnection(sessionId, playerId, connectionId);

    // Check for player promotions after new player joins - get fresh state
    await this.handlePlayerPromotionsAfterJoin(sessionId);

    // Publish player joined event
    await this.publishEvent(sessionId, 'player_joined', { player: newPlayer, isActive });

    return { playerId, isActive };
  }

  async submitTurn(sessionId: string, playerId: string, request: SubmitTurnRequest): Promise<void> {
    const gameState = await this.redis.getGameState(sessionId);
    if (!gameState) {
      throw new Error('Game not found');
    }

    // Validate it's the player's turn
    if (!isCurrentPlayer(gameState, playerId)) {
      throw new Error('Not your turn');
    }

    // Validate turn number (if provided)
    const expectedTurnNumber = gameState.turns.length + 1;
    const turnDataWithNumber = request.turnData as { number?: number };
    if (turnDataWithNumber.number && turnDataWithNumber.number !== expectedTurnNumber) {
      throw new Error('Invalid turn number');
    }

    // Create the turn
    const turn: CurveTurn = {
      ...request.turnData,
      author: 'user',
      timestamp: new Date().toISOString(),
      number: expectedTurnNumber
    };

    // FIXME: all of these operations should be pipelined
    await this.redis.addTurn(sessionId, turn);
    await this.redis.updateGameStatus(sessionId, 'turn_ended');

    // Publish turn ended event
    await this.publishEvent(sessionId, 'turn_ended', { turn });

    const nextGameState = await this.redis.getGameState(sessionId);
    const nextPlayer = nextGameState && getCurrentPlayer(nextGameState);
    // If next player is AI, trigger AI turn
    if (nextPlayer?.id === 'ai') {
      await this.startAITurn(sessionId);
    }
  }

  async removePlayer(sessionId: string, playerId: string): Promise<void> {
    const gameState = await this.redis.getGameState(sessionId);
    if (!gameState) {
      return;
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      return;
    }

    // Mark player as disconnected instead of removing
    const now = new Date().toISOString();

    // Use optimized player status update
    await this.redis.updatePlayerStatus(sessionId, playerId, {
      connectionStatus: 'disconnected',
      disconnectedAt: now,
      lastSeenAt: now,
      isActive: false
    });

    // Clean up connection
    await this.redis.removePlayerConnection(sessionId, playerId);

    // Publish player disconnected event
    await this.publishEvent(sessionId, 'player_left', {
      playerId,
      playerName: player.name
    });

    // Get fresh state for promotion checks
    await this.handlePlayerPromotionsAfterDisconnect(sessionId);
  }

  async retryAITurn(sessionId: string): Promise<void> {
    const gameState = await this.redis.getGameState(sessionId);

    if (!gameState) {
      throw new Error('Game not found');
    }

    if (gameState.type !== 'ai') {
      throw new Error('Not an AI game');
    }

    if (getCurrentPlayer(gameState).id !== 'ai') {
      throw new Error('Not AI\'s turn');
    }

    if (gameState.status === 'ai_turn_started') {
      throw new Error('AI turn already in progress');
    }

    await this.redis.resetAIRetryCount(sessionId);
    await this.startAITurn(sessionId);
  }

  async updateDrawingStatus(sessionId: string, playerId: string, isDrawing: boolean): Promise<void> {
    const gameState = await this.redis.getGameState(sessionId);
    if (!gameState || !isCurrentPlayer(gameState, playerId)) {
      return;
    }

    const eventType = isDrawing ? 'player_started_drawing' : 'player_stopped_drawing';
    await this.publishEvent(sessionId, eventType, { playerId, isDrawing });
  }

  async cleanupAbandonedGames(): Promise<number> {
    try {
      const allSessions = await this.redis.getAllGameSessions();
      let cleanedCount = 0;

      for (const sessionId of allSessions) {
        const gameState = await this.redis.getGameState(sessionId);
        if (!gameState) {
          continue; // Game already cleaned up
        }

        const humanPlayers = gameState.players.filter(p => p.id !== 'ai');
        const connectedHumanPlayers = humanPlayers.filter(p => p.connectionStatus === 'connected');

        // If all human players are disconnected, check if they've been disconnected too long
        if (connectedHumanPlayers.length === 0 && humanPlayers.length > 0) {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const playersDisconnectedTooLong = humanPlayers.filter(p =>
            p.disconnectedAt && p.disconnectedAt < oneHourAgo
          );

          if (playersDisconnectedTooLong.length === humanPlayers.length) {
            // All players have been disconnected for over 1 hour, clean up
            await this.redis.updateGameStatus(sessionId, 'game_ended');
            await this.publishEvent(sessionId, 'game_ended', {});
            await this.redis.deleteGameState(sessionId);
            cleanedCount++;
            console.log(`Cleaned up abandoned game: ${sessionId}`);
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`Background cleanup completed: removed ${cleanedCount} abandoned games`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error during background cleanup:', error);
      return 0;
    }
  }

  private async startAITurn(sessionId: string): Promise<void> {
    const gameState = await this.redis.getGameState(sessionId);
    if (!gameState) {
      return;
    }

    // Use optimized status update
    await this.redis.updateGameStatus(sessionId, 'ai_turn_started');

    const turnNumber = gameState.turns.length + 1;
    await this.publishEvent(sessionId, 'ai_turn_started', { turnNumber });

    // Process AI turn in background
    this.processAITurnBackground(sessionId).catch(error => {
      console.error('AI turn failed:', error);
    });
  }

  private async getAITurn(sessionId: string) {
    const gameState = await this.redis.getGameState(sessionId);
    if (!gameState) {
      throw new Error('Game state not found during AI processing');
    }

    // Generate AI turn using server-side logic
    const dimensions = { width: 512, height: 512 };
    const aiResponse = await generateAICurveTurn(gameState.turns, dimensions);

    const aiTurn: CurveTurn = {
      ...aiResponse,
      author: 'ai',
      timestamp: new Date().toISOString(),
      number: gameState.turns.length + 1
    };

    return aiTurn;
  }

  private async processAITurnBackground(sessionId: string): Promise<void> {
    try {
      const turn = await this.getAITurn(sessionId);

      // Use optimized Redis operations
      await this.redis.addTurn(sessionId, turn);
      await this.redis.updateGameStatus(sessionId, 'turn_ended');
      await this.redis.resetAIRetryCount(sessionId);

      // Publish success event
      await this.publishEvent(sessionId, 'turn_ended', { turn });

    } catch (error) {
      await this.handleAITurnFailure(sessionId, error as Error);
    }
  }

  private async handleAITurnFailure(sessionId: string, error: Error): Promise<void> {
    const retryCount = await this.redis.getAIRetryCount(sessionId);
    const newRetryCount = retryCount + 1;

    if (newRetryCount <= GameService.MAX_AI_RETRIES) {
      await this.redis.setAIRetryCount(sessionId, newRetryCount);
      // Retry after a delay
      setTimeout(() => {
        this.processAITurnBackground(sessionId).catch(console.error);
      }, 2000 * newRetryCount); // Exponential backoff
    } else {
      // Max retries reached, mark as failed
      await this.redis.updateGameStatus(sessionId, 'ai_turn_failed');

      await this.publishEvent(sessionId, 'ai_turn_failed', {
        error: error.message,
        retryCount: newRetryCount - 1
      });
    }
  }

  private async addNewPlayerToGame(sessionId: string, newPlayer: Player): Promise<void> {
    await this.redis.addPlayer(sessionId, newPlayer);
  }

  private async handlePlayerPromotionsAfterDisconnect(sessionId: string): Promise<void> {
    const gameState = await this.redis.getGameState(sessionId);
    if (!gameState) return;

    const currentPlayer = getCurrentPlayer(gameState);
    if (!currentPlayer || currentPlayer.connectionStatus === 'disconnected') {
      const connectedActivePlayers = gameState.players
        .filter(p => p.isActive && p.connectionStatus === 'connected' && p.id !== 'ai')
        .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());

      if (connectedActivePlayers.length > 0) {
        const newCurrentPlayer = connectedActivePlayers[0];

        await this.publishEvent(sessionId, 'player_promoted', {
          playerId: newCurrentPlayer.id,
          playerName: newCurrentPlayer.name
        });
      }
    }
  }

  private async handlePlayerPromotionsAfterReconnect(sessionId: string): Promise<void> {
    await this.handlePlayerPromotionsAfterDisconnect(sessionId);
  }

  private async handlePlayerPromotionsAfterJoin(sessionId: string): Promise<void> {
    await this.handlePlayerPromotionsAfterDisconnect(sessionId);
  }

  private async publishEvent<T>(sessionId: string, type: string, data: T): Promise<void> {
    const event: GameEvent<T> = {
      type: type as GameEvent<T>['type'],
      timestamp: new Date().toISOString(),
      gameId: sessionId,
      data
    };

    await this.redis.publishEvent(sessionId, event);
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

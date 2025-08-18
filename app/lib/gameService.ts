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
import type { CurveTurn } from '@/app/types/exquisiteCorpse';

export class GameService {
  private redis = getRedisClient();
  private static MAX_AI_RETRIES = 3;

  async createGame(request: CreateGameRequest): Promise<{ sessionId: string; playerId: string }> {
    const sessionId = this.redis.generateSessionId();
    const gameId = randomUUID();
    const playerId = randomUUID();
    const connectionId = randomUUID();

    // Create initial player
    const player: Player = {
      id: playerId,
      name: request.playerName,
      connectionId,
      joinedAt: new Date().toISOString(),
      isActive: true
    };

    // Add AI player for AI games
    const players: Player[] = [player];
    if (request.gameType === 'ai') {
      players.push({
        id: 'ai',
        name: 'AI',
        connectionId: 'ai',
        joinedAt: new Date().toISOString(),
        isActive: true
      });
    }

    // Create initial game state
    const gameState: MultiplayerGameState = {
      sessionId,
      gameId,
      type: request.gameType,
      players,
      currentPlayer: playerId, // First player always starts
      status: 'game_started',
      turns: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.redis.setGameState(sessionId, gameState);
    await this.redis.setPlayerConnection(sessionId, playerId, connectionId);

    // Publish game started event
    await this.publishEvent(sessionId, 'game_started', { game: gameState });

    return { sessionId, playerId };
  }

  async joinGame(sessionId: string, request: JoinGameRequest): Promise<{ playerId: string; isActive: boolean }> {
    const gameState = await this.redis.getGameState(sessionId);
    if (!gameState) {
      throw new Error('Game not found');
    }

    const playerId = randomUUID();
    const connectionId = randomUUID();

    // Determine if this player should be active
    const activePlayerCount = gameState.players.filter(p => p.isActive && p.id !== 'ai').length;
    const maxActivePlayers = gameState.type === 'ai' ? 1 : 2;
    const isActive = activePlayerCount < maxActivePlayers;

    const newPlayer: Player = {
      id: playerId,
      name: request.playerName,
      connectionId,
      joinedAt: new Date().toISOString(),
      isActive
    };

    gameState.players.push(newPlayer);
    gameState.updatedAt = new Date().toISOString();

    await this.redis.setGameState(sessionId, gameState);
    await this.redis.setPlayerConnection(sessionId, playerId, connectionId);

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
    if (gameState.currentPlayer !== playerId) {
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

    gameState.turns.push(turn);
    gameState.status = 'turn_ended';
    gameState.updatedAt = new Date().toISOString();

    // Determine next player
    const nextPlayer = this.getNextPlayer(gameState, playerId);
    gameState.currentPlayer = nextPlayer;

    await this.redis.setGameState(sessionId, gameState);

    // Publish turn ended event
    await this.publishEvent(sessionId, 'turn_ended', { turn, nextPlayer });

    // If next player is AI, trigger AI turn
    if (nextPlayer === 'ai') {
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

    // Remove player
    gameState.players = gameState.players.filter(p => p.id !== playerId);
    
    // Clean up connection
    await this.redis.removePlayerConnection(sessionId, playerId);

    // Publish player left event
    await this.publishEvent(sessionId, 'player_left', { 
      playerId, 
      playerName: player.name 
    });

    // Check if we need to promote a new active player
    if (player.isActive && gameState.currentPlayer === playerId) {
      const nextActivePlayer = this.promoteNextPlayer(gameState);
      if (nextActivePlayer) {
        gameState.currentPlayer = nextActivePlayer.id;
        await this.publishEvent(sessionId, 'player_promoted', {
          playerId: nextActivePlayer.id,
          playerName: nextActivePlayer.name
        });
      }
    }

    // Check if game should end
    const activeHumanPlayers = gameState.players.filter(p => p.isActive && p.id !== 'ai');
    if (activeHumanPlayers.length === 0) {
      gameState.status = 'game_ended';
      await this.publishEvent(sessionId, 'game_ended', {});
      await this.redis.deleteGameState(sessionId);
      return;
    }

    gameState.updatedAt = new Date().toISOString();
    await this.redis.setGameState(sessionId, gameState);
  }

  async retryAITurn(sessionId: string): Promise<void> {
    const gameState = await this.redis.getGameState(sessionId);
    if (!gameState) {
      throw new Error('Game not found');
    }

    if (gameState.type !== 'ai') {
      throw new Error('Not an AI game');
    }

    if (gameState.currentPlayer !== 'ai') {
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
    if (!gameState || gameState.currentPlayer !== playerId) {
      return;
    }

    const eventType = isDrawing ? 'player_started_drawing' : 'player_stopped_drawing';
    await this.publishEvent(sessionId, eventType, { playerId, isDrawing });
  }

  private async startAITurn(sessionId: string): Promise<void> {
    const gameState = await this.redis.getGameState(sessionId);
    if (!gameState) {
      return;
    }

    gameState.status = 'ai_turn_started';
    gameState.updatedAt = new Date().toISOString();
    await this.redis.setGameState(sessionId, gameState);

    const turnNumber = gameState.turns.length + 1;
    await this.publishEvent(sessionId, 'ai_turn_started', { turnNumber });

    // Process AI turn in background
    this.processAITurnBackground(sessionId).catch(error => {
      console.error('AI turn failed:', error);
    });
  }

  private async processAITurnBackground(sessionId: string): Promise<void> {
    try {
      // Import server-side AI service
      const { generateAICurveTurn } = await import('./aiTurnService');

      const gameState = await this.redis.getGameState(sessionId);
      if (!gameState) {
        throw new Error('Game state not found during AI processing');
      }

      // Generate AI turn using server-side logic
      const dimensions = { width: 512, height: 512 };
      const aiResponse = await generateAICurveTurn(gameState.turns, dimensions);

      // Create AI turn
      const aiTurn: CurveTurn = {
        ...aiResponse,
        author: 'ai',
        timestamp: new Date().toISOString(),
        number: gameState.turns.length + 1
      };

      // Update game state
      gameState.turns.push(aiTurn);
      gameState.status = 'turn_ended';
      gameState.currentPlayer = this.getNextPlayer(gameState, 'ai');
      gameState.updatedAt = new Date().toISOString();

      await this.redis.setGameState(sessionId, gameState);
      await this.redis.resetAIRetryCount(sessionId);

      // Publish success event
      await this.publishEvent(sessionId, 'turn_ended', { 
        turn: aiTurn, 
        nextPlayer: gameState.currentPlayer 
      });

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
      const gameState = await this.redis.getGameState(sessionId);
      if (gameState) {
        gameState.status = 'ai_turn_failed';
        gameState.updatedAt = new Date().toISOString();
        await this.redis.setGameState(sessionId, gameState);
      }

      await this.publishEvent(sessionId, 'ai_turn_failed', {
        error: error.message,
        retryCount: newRetryCount - 1
      });
    }
  }

  private getNextPlayer(gameState: MultiplayerGameState, currentPlayerId: string): string {
    const activePlayers = gameState.players.filter(p => p.isActive);
    const currentIndex = activePlayers.findIndex(p => p.id === currentPlayerId);
    const nextIndex = (currentIndex + 1) % activePlayers.length;
    return activePlayers[nextIndex].id;
  }

  private promoteNextPlayer(gameState: MultiplayerGameState): Player | null {
    const inactivePlayers = gameState.players
      .filter(p => !p.isActive && p.id !== 'ai')
      .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());

    if (inactivePlayers.length > 0) {
      const playerToPromote = inactivePlayers[0];
      playerToPromote.isActive = true;
      return playerToPromote;
    }

    return null;
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
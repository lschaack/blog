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

export class GameService {
  private redis = getRedisClient();
  private static MAX_AI_RETRIES = 3;
  private static DISCONNECTED_GAME_TTL = 60 * 60; // 1 hour in seconds

  async createGame(request: CreateGameRequest): Promise<{ sessionId: string; playerId: string }> {
    // Perform lazy cleanup before creating new game
    await this.cleanupAbandonedGames();
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
        joinedAt: now,
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
    // Perform lazy cleanup before joining game
    await this.cleanupAbandonedGames();
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
      existingPlayer.connectionStatus = 'connected';
      existingPlayer.connectionId = newConnectionId;
      existingPlayer.lastSeenAt = now;
      existingPlayer.disconnectedAt = undefined;

      await this.redis.setPlayerConnection(sessionId, existingPlayer.id, newConnectionId);
      
      // Check for player promotions after reconnection
      await this.handlePlayerPromotions(sessionId, gameState);
      
      // Publish reconnection event
      await this.publishEvent(sessionId, 'player_joined', { 
        player: existingPlayer, 
        isActive: existingPlayer.isActive 
      });

      gameState.updatedAt = now;
      await this.redis.setGameState(sessionId, gameState);

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

    gameState.players.push(newPlayer);
    
    // Check for player promotions after new player joins
    await this.handlePlayerPromotions(sessionId, gameState);
    
    gameState.updatedAt = now;

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

    // Mark player as disconnected instead of removing
    const now = new Date().toISOString();
    player.connectionStatus = 'disconnected';
    player.disconnectedAt = now;
    player.lastSeenAt = now;
    
    // Clean up connection
    await this.redis.removePlayerConnection(sessionId, playerId);

    // Publish player disconnected event
    await this.publishEvent(sessionId, 'player_left', {
      playerId,
      playerName: player.name
    });

    // Check for player promotions after disconnect
    await this.handlePlayerPromotions(sessionId, gameState);

    // Check if ALL human players have been disconnected for more than 1 hour
    const humanPlayers = gameState.players.filter(p => p.id !== 'ai');
    const connectedHumanPlayers = humanPlayers.filter(p => p.connectionStatus === 'connected');
    
    if (connectedHumanPlayers.length === 0) {
      // All humans are disconnected, check if grace period has expired
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const playersDisconnectedTooLong = humanPlayers.filter(p => 
        p.disconnectedAt && p.disconnectedAt < oneHourAgo
      );
      
      if (playersDisconnectedTooLong.length === humanPlayers.length && humanPlayers.length > 0) {
        // All players have been disconnected for over 1 hour, end game
        gameState.status = 'game_ended';
        await this.publishEvent(sessionId, 'game_ended', {});
        await this.redis.deleteGameState(sessionId);
        return;
      }
      
      // All players are disconnected but still within grace period
      // Set shorter TTL so game gets cleaned up automatically after 1 hour
      await this.redis.setGameStateWithTTL(sessionId, gameState, GameService.DISCONNECTED_GAME_TTL);
    }

    gameState.updatedAt = now;
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

  private async handlePlayerPromotions(sessionId: string, gameState: MultiplayerGameState): Promise<void> {
    // Check if current player is disconnected and needs to be replaced
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayer);
    
    if (!currentPlayer || currentPlayer.connectionStatus === 'disconnected') {
      // Find connected active players, ordered by least recently joined (oldest first)
      const connectedActivePlayers = gameState.players
        .filter(p => p.isActive && p.connectionStatus === 'connected' && p.id !== 'ai')
        .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
      
      if (connectedActivePlayers.length > 0) {
        // Promote the least recently joined (oldest) connected active player
        const newCurrentPlayer = connectedActivePlayers[0];
        gameState.currentPlayer = newCurrentPlayer.id;
        
        await this.publishEvent(sessionId, 'player_promoted', {
          playerId: newCurrentPlayer.id,
          playerName: newCurrentPlayer.name
        });
      }
    }
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

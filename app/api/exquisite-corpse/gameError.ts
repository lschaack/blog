type GameErrorType =
  | 'GAME_NOT_FOUND'
  | 'PLAYERS_NOT_FOUND'
  | 'TURN_FAILED'
  | 'AI_TURN_IN_PROGRESS';

export class GameError extends Error {
  type: GameErrorType;

  public static GAME_NOT_FOUND(sessionId: string) {
    return new GameError(`Game ${sessionId} not found`, 'GAME_NOT_FOUND');
  }

  public static PLAYERS_NOT_FOUND(sessionId: string) {
    return new GameError(`Players list for game ${sessionId} not found`, 'PLAYERS_NOT_FOUND');
  }

  // TODO: Delete if unused
  public static TURN_FAILED() {
    return new GameError('Turn failed', 'TURN_FAILED')
  }

  public static AI_TURN_IN_PROGRESS() {
    return new GameError('AI turn in progress', 'AI_TURN_IN_PROGRESS');
  }

  constructor(message: string, type: GameErrorType) {
    super(message);

    this.name = 'GameError';
    this.type = type;
  }
}

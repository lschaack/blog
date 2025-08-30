import { GameState, GameAction, BaseTurn } from "@/app/types/exquisiteCorpse";

// Create initial game state
export const createInitialGameState = <T extends BaseTurn>(): GameState<T> => ({
  turns: [],
  currentTurnIndex: 0,
  isFirstTurn: true,
  isLastTurn: true,
});

// Game state reducer
export const gameReducer = <T extends BaseTurn>(
  state: GameState<T>,
  action: GameAction<T>
): GameState<T> => {
  switch (action.type) {
    case "end_user_turn": {
      const newTurn: T = {
        ...action.payload,
        author: "user",
        timestamp: new Date().toISOString(),
      } as T;

      const newTurns = [...state.turns, newTurn];
      const newCurrentTurnIndex = newTurns.length;

      return {
        ...state,
        turns: newTurns,
        currentTurnIndex: newCurrentTurnIndex,
        isFirstTurn: newCurrentTurnIndex === 1,
        isLastTurn: true,
      };
    }

    case "end_ai_turn": {
      const newTurn: T = {
        ...action.payload,
        author: "ai",
        timestamp: new Date().toISOString(),
      } as T;

      const newTurns = [...state.turns, newTurn];
      const newCurrentTurnIndex = newTurns.length;

      return {
        ...state,
        turns: newTurns,
        currentTurnIndex: newCurrentTurnIndex,
        isFirstTurn: newCurrentTurnIndex === 1,
        isLastTurn: true,
      };
    }

    case "increment_current_turn": {
      const maxIndex = state.turns.length;
      const newIndex = Math.min(state.currentTurnIndex + 1, maxIndex);

      return {
        ...state,
        currentTurnIndex: newIndex,
        isFirstTurn: newIndex === 0,
        isLastTurn: newIndex === maxIndex,
      };
    }

    case "decrement_current_turn": {
      const newIndex = Math.max(state.currentTurnIndex - 1, 0);

      return {
        ...state,
        currentTurnIndex: newIndex,
        isFirstTurn: newIndex === 0,
        isLastTurn: newIndex === state.turns.length,
      };
    }

    case "restore": {
      const newCurrentTurnIndex = Math.min(action.payload.turns.length, action.payload.turns.length);

      return {
        turns: action.payload.turns,
        currentTurnIndex: newCurrentTurnIndex,
        isFirstTurn: newCurrentTurnIndex === 0,
        isLastTurn: newCurrentTurnIndex === action.payload.turns.length,
      };
    }

    case "reset": {
      return createInitialGameState<T>();
    }

    default:
      return state;
  }
};

// Helper functions for game state queries
export const getDisplayTurns = <T extends BaseTurn>(state: GameState<T>): T[] => {
  return state.turns.slice(0, state.currentTurnIndex);
};

export const getCurrentTurnNumber = <T extends BaseTurn>(state: GameState<T>): number => {
  return state.currentTurnIndex + 1;
};

export const getPreviousTurnNumber = <T extends BaseTurn>(state: GameState<T>): number => {
  return state.currentTurnIndex;
};

export const getPreviousTurn = <T extends BaseTurn>(state: GameState<T>) => {
  return state.turns[state.currentTurnIndex - 1]
}

export const getTotalTurns = <T extends BaseTurn>(state: GameState<T>): number => {
  return state.turns.length + 1;
};

export const isViewingCurrentTurn = <T extends BaseTurn>(state: GameState<T>): boolean => {
  return state.currentTurnIndex === state.turns.length;
};

export const canGoToPrevious = <T extends BaseTurn>(state: GameState<T>): boolean => {
  return state.currentTurnIndex > 0;
};

export const canGoToNext = <T extends BaseTurn>(state: GameState<T>): boolean => {
  return state.currentTurnIndex < state.turns.length;
};

export const getLastTurn = <T extends BaseTurn>(state: GameState<T>): T | undefined => {
  return state.turns[state.turns.length - 1];
};

// Helper functions to determine turn author types
export const isAuthorAI = (author: string): boolean => {
  return author === "ai";
};

export const isAuthorUser = (author: string, currentUserId?: string): boolean => {
  if (currentUserId) {
    // In multiplayer, check if author matches current user ID
    return author === currentUserId;
  }
  // In single-player, check if author is "user"
  return author === "user";
};

export const isUserTurn = <T extends BaseTurn>(state: GameState<T>): boolean => {
  const lastTurn = getLastTurn(state);

  return !lastTurn || isAuthorAI(lastTurn.author);
};

export const isAITurn = <T extends BaseTurn>(state: GameState<T>): boolean => {
  const lastTurn = getLastTurn(state);

  return Boolean(lastTurn && !isAuthorAI(lastTurn.author));
};

export const isLastTurnAI = <T extends BaseTurn>(state: GameState<T>): boolean => {
  const prevTurn = getPreviousTurn(state);

  return Boolean(prevTurn && isAuthorAI(prevTurn.author));
}

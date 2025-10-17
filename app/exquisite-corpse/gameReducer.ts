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
        author: "AI",
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

export const getLastTurn = <T extends BaseTurn>(state: GameState<T>): T | undefined => {
  return state.turns[state.turns.length - 1];
};

export const isAuthorAI = (author: string): boolean => {
  return author === "AI";
};

export const isUserTurn = <T extends BaseTurn>(state: GameState<T>): boolean => {
  const lastTurn = getLastTurn(state);

  return !lastTurn || isAuthorAI(lastTurn.author);
};

export const isAITurn = <T extends BaseTurn>(state: GameState<T>): boolean => {
  const lastTurn = getLastTurn(state);

  return Boolean(lastTurn && !isAuthorAI(lastTurn.author));
};


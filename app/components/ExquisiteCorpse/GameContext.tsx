"use client";

import { createContext, useContext, useReducer, ReactNode, Dispatch } from "react";
import { GameState, GameAction, BaseTurn } from "./types";
import { gameReducer, createInitialGameState } from "./gameReducer";

// Context type with dispatch function
export type GameContextValue<T extends BaseTurn> = GameState<T> & {
  dispatch: Dispatch<GameAction<T>>;
};

// Create the context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GameContext = createContext<GameContextValue<any> | null>(null);

// Provider component props
type GameProviderProps<T extends BaseTurn> = {
  children: ReactNode;
  initialState?: GameState<T>;
};

// Generic provider component
export const GameProvider = <T extends BaseTurn>({
  children,
  initialState
}: GameProviderProps<T>) => {
  const [state, dispatch] = useReducer(
    gameReducer<T>,
    initialState || createInitialGameState<T>()
  );

  const value: GameContextValue<T> = {
    ...state,
    dispatch,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

// Hook to use game context
export const useGameContext = <T extends BaseTurn>(): GameContextValue<T> => {
  const context = useContext(GameContext);

  if (!context) {
    throw new Error("useGameContext must be used within a GameProvider");
  }

  return context as GameContextValue<T>;
};

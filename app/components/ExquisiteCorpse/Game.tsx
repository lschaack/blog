import { useCallback, useEffect } from "react";

import { BaseTurn, CanvasDimensions, TurnRenderer } from '@/app/types/exquisiteCorpse';
import { GameProvider, useGameContext } from './GameContext';
import { GameStatus } from './GameStatus';
import { TurnHistory } from './TurnHistory';
import { ExportUtilities } from './ExportUtilities';
import { StateEditor } from './StateEditor';
import { useAITurn } from './useAITurn';
import { getDisplayTurns, isAITurn, isViewingCurrentTurn } from './gameReducer';

export type GameProps<Turn extends BaseTurn> = {
  CurrentTurn: TurnRenderer<Turn>,
  getAITurn: (history: Turn[]) => Promise<Omit<Turn, 'author' | 'number' | 'timestamp'>>;
  dimensions: CanvasDimensions;
};

// Internal game component that uses the context
const GameInternal = <Turn extends BaseTurn>({ CurrentTurn, getAITurn, dimensions }: GameProps<Turn>) => {
  const gameState = useGameContext<Turn>();
  const aiTurn = useAITurn<Turn>(getAITurn);

  // Auto-trigger AI turn when user completes their turn
  useEffect(() => {
    const processAITurnAutomatically = async () => {
      // Only process AI turn if:
      // 1. It's AI's turn (user just finished)
      // 2. AI is not already processing
      // 3. We're viewing the current turn
      if (isAITurn(gameState) && !aiTurn.isProcessing && !aiTurn.hasError && isViewingCurrentTurn(gameState)) {
        try {
          const displayTurns = getDisplayTurns(gameState);
          const payload = await aiTurn.processAITurn(displayTurns);

          // Dispatch AI turn
          gameState.dispatch({
            type: "end_ai_turn",
            payload,
          });
        } catch (error) {
          console.error("AI turn failed:", error);
        }
      }
    };

    processAITurnAutomatically();
  }, [gameState, aiTurn]);

  // Handle user turn completion
  const handleEndTurn = useCallback((turnData: Omit<Turn, "author" | "timestamp" | "number">) => {
    gameState.dispatch({
      type: "end_user_turn",
      payload: turnData
    });
  }, [gameState]);

  return (
    <div className="flex flex-col gap-4 max-w-[512px]">
      <GameStatus
        aiProcessing={aiTurn.isProcessing}
        aiError={aiTurn.hasError ? aiTurn.getErrorMessage(aiTurn.error!) : undefined}
        aiProgress={aiTurn.progress}
      />

      <CurrentTurn
        handleEndTurn={handleEndTurn}
        readOnly={aiTurn.isProcessing}
        canvasDimensions={dimensions}
      />

      <TurnHistory />

      <ExportUtilities />

      <StateEditor />
    </div>
  );
};

export const Game = <Turn extends BaseTurn>({ CurrentTurn, getAITurn, dimensions }: GameProps<Turn>) => {
  return (
    <GameProvider<Turn>>
      <GameInternal
        CurrentTurn={CurrentTurn}
        getAITurn={getAITurn}
        dimensions={dimensions}
      />
    </GameProvider>
  );
};


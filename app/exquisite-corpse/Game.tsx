import { useEffect } from "react";

import { BaseTurn, CanvasDimensions, RenderPNG, TurnMetaRenderer, TurnRenderer } from '@/app/types/exquisiteCorpse';
import { GameProvider, useGameContext } from './GameContext';
import { GameStatus } from './GameStatus';
import { ExportUtilities } from './ExportUtilities';
import { StateEditor } from './StateEditor';
import { useAITurn } from './useAITurn';
import { getDisplayTurns, isAITurn, isViewingCurrentTurn } from './gameReducer';
import { Button } from "@/app/components/Button";
import { TurnManager } from "./TurnManager";
import { Path } from "parse-svg-path";

export type GameProps<Turn extends BaseTurn> = {
  TurnRenderer: TurnRenderer<Turn>;
  TurnMetaRenderer: TurnMetaRenderer<Turn>;
  getTurnFromPath: (path: Path, turns: Turn[]) => Promise<Omit<Turn, keyof BaseTurn> | undefined>;
  renderPNG: RenderPNG<Turn>;
  getAITurn: (history: Turn[]) => Promise<Omit<Turn, keyof BaseTurn>>;
  dimensions: CanvasDimensions;
};

const isDev = process.env.NODE_ENV === "development";

// Internal game component that uses the context
// FIXME: remove dispatches related to current turn
const GameInternal = <Turn extends BaseTurn>({
  TurnRenderer,
  TurnMetaRenderer,
  getTurnFromPath,
  renderPNG,
  getAITurn,
  dimensions
}: GameProps<Turn>) => {
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
  const handleEndTurn = (turnData: Omit<Turn, keyof BaseTurn>) => {
    gameState.dispatch({
      type: "end_user_turn",
      payload: turnData
    });
  };

  const handleReset = () => {
    gameState.dispatch({ type: "reset" });
  };

  return (
    <div className="flex flex-col gap-4 max-w-[512px]">
      <GameStatus
        aiProcessing={aiTurn.isProcessing}
        aiError={aiTurn.hasError ? aiTurn.getErrorMessage(aiTurn.error!) : undefined}
        aiProgress={aiTurn.progress}
      />

      <TurnManager
        handleAddPath={async (path, turns) => {
          const newTurn = await getTurnFromPath(path, turns);

          if (newTurn) {
            handleEndTurn(newTurn);
          } else {
            console.error('Failed to create new turn from path')
          }
        }}
        readOnly={aiTurn.isProcessing}
        dimensions={dimensions}
        turns={gameState.turns}
        TurnRenderer={TurnRenderer}
        TurnMetaRenderer={TurnMetaRenderer}
      />

      <Button
        label="Reset"
        onClick={handleReset}
        className="w-full"
        disabled={gameState.turns.length === 0}
      />

      <ExportUtilities renderPNG={renderPNG} />

      {isDev && <StateEditor />}
    </div>
  );
};

export const Game = <Turn extends BaseTurn>(props: GameProps<Turn>) => {
  return (
    <GameProvider<Turn>>
      <GameInternal {...props} />
    </GameProvider>
  );
};


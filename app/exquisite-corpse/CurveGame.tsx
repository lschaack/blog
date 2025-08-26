import { BaseTurn, CanvasDimensions, CurveTurn, GameContext, RenderPNG } from '@/app/types/exquisiteCorpse';
import { CurveTurnRenderer } from './CurveTurnRenderer';
import { renderLinesToBase64, checkImageSizeLimit } from "./imageContext";
import { getGeminiService } from "./geminiAI";
import { Game, GameProps } from "./Game";
import { useCallback } from 'react';

export const getAICurveTurn = async (
  history: CurveTurn[],
  dimensions: CanvasDimensions,
) => {
  // Step 1: Render current game state to image
  const base64Image = await renderLinesToBase64(
    history.map(turn => turn.path),
    dimensions.width,
    dimensions.height
  );

  // Step 2: Validate image size
  if (!checkImageSizeLimit(base64Image)) {
    throw new Error("Generated image is too large for AI processing");
  }

  // Step 3: Create game context
  const gameContext: GameContext<CurveTurn> = {
    image: base64Image,
    canvasDimensions: dimensions,
    currentTurn: history.length + 1,
    history: history
  };

  // Step 4: Call AI service
  const geminiService = getGeminiService();
  const aiResponse = await geminiService.generateCurveTurn(gameContext);

  // Return the turn data (without metadata fields that will be added by reducer)
  return aiResponse as Omit<CurveTurn, keyof BaseTurn>;
}

const renderCurveTurnPNG = (history: CurveTurn[], index: number, dimensions: CanvasDimensions) => {
  return renderLinesToBase64(
    history.slice(0, index).map(({ path }) => path),
    dimensions.width,
    dimensions.height
  );
}

export const CurveGame = ({ dimensions }: Pick<GameProps<CurveTurn>, 'dimensions'>) => {
  const renderPNG = useCallback<RenderPNG<CurveTurn>>((history, index) => {
    return renderCurveTurnPNG(history, index, dimensions);
  }, [dimensions]);

  return (
    <Game<CurveTurn>
      CurrentTurn={CurveTurnRenderer}
      renderPNG={renderPNG}
      dimensions={dimensions}
      getAITurn={history => getAICurveTurn(history, dimensions)}
    />
  )
}

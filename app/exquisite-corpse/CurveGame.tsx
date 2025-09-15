import { BaseTurn, CanvasDimensions, CurveTurn, GameContext, RenderPNG } from '@/app/types/exquisiteCorpse';
import { CurveTurnRenderer } from './CurveTurnRenderer';
import { renderLinesToBase64 } from "./imageContext";
import { getGeminiService } from "./geminiAI";
import { Game, GameProps } from "./Game";
import { useCallback } from 'react';

export const getAICurveTurn = async (
  history: CurveTurn[],
  dimensions: CanvasDimensions,
) => {
  const gameContext: GameContext<CurveTurn> = {
    canvasDimensions: dimensions,
    history: history
  };

  const geminiService = getGeminiService();
  const aiResponse = await geminiService.generateCurveTurn(gameContext);

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

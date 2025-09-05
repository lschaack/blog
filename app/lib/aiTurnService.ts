import type { CurveTurn, GameContext, CanvasDimensions } from '@/app/types/exquisiteCorpse';
import { getGpt5CurveDrawingService } from '@/app/api/exquisite-corpse/draw-curve/gpt5-curve-drawing-service';

// Server-side AI turn generation using direct service calls
export const generateAICurveTurn = async (
  history: CurveTurn[],
  dimensions: CanvasDimensions,
) => {
  const gameContext: Omit<GameContext<CurveTurn>, 'image'> = {
    canvasDimensions: dimensions,
    history: history
  };

  const gpt5Service = getGpt5CurveDrawingService();

  return await gpt5Service.generateTurn(gameContext);
};

import { BaseTurn, CanvasDimensions, ImageGeminiFlashPreviewTurn, Path, RenderPNG } from '@/app/types/exquisiteCorpse';
import { ImageTurnMetaRenderer, ImageTurnRenderer } from './ImageTurnRenderer';
import { getGeminiService } from "./geminiAI";
import { Game, GameProps } from "./Game";
import { ImageGameContext } from '../api/exquisite-corpse/schemas';
import { renderLinesToBase64 } from './imageContext';

const getAIImageTurn = async (
  history: ImageGeminiFlashPreviewTurn[],
  dimensions: CanvasDimensions,
): Promise<ImageGeminiFlashPreviewTurn> => {
  // For image-based turns, we send the most recent image to the AI
  // If there's no history, we start with a blank white canvas
  let baseImage: string;

  if (history.length === 0) {
    // Create a blank white canvas as base64
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    baseImage = canvas.toDataURL('image/png');
  } else {
    // Use the most recent turn's image
    baseImage = history[history.length - 1].image;
  }

  // Create game context with just the image context
  const gameContext: ImageGameContext = {
    image: baseImage,
    canvasDimensions: dimensions,
    history: history.map(({ author, timestamp, interpretation }) => ({
      author,
      timestamp,
      interpretation,
    }))
  };

  // Call AI service for image-based turn
  const geminiService = getGeminiService();
  const aiResponse = await geminiService.generateImageTurn(gameContext);

  // Return the turn data (without metadata fields that will be added by reducer)
  return {
    image: aiResponse.image,
    interpretation: aiResponse.interpretation,
  } as ImageGeminiFlashPreviewTurn;
}

const renderImageTurnPNG: RenderPNG<ImageGeminiFlashPreviewTurn> = (history, index) => {
  return Promise.resolve(
    history.at(
      Math.max(0, Math.min(index - 1, history.length - 1))
    )!.image
  );
}

export const ImageGame = ({ dimensions }: Pick<GameProps<ImageGeminiFlashPreviewTurn>, 'dimensions'>) => {
  const getTurnFromPath = async (path: Path, turns: ImageGeminiFlashPreviewTurn[]) => {
    try {
      const backgroundImage = turns.findLast(turn => !!turn.image)?.image;

      const imageData = await renderLinesToBase64(
        [path],
        dimensions.width,
        dimensions.height,
        backgroundImage,
      );

      return {
        image: imageData
      } as Omit<ImageGeminiFlashPreviewTurn, keyof BaseTurn>;
    } catch (error) {
      console.error('Failed to render turn to image:', error);
    }
  }

  return (
    <Game<ImageGeminiFlashPreviewTurn>
      TurnRenderer={ImageTurnRenderer}
      TurnMetaRenderer={ImageTurnMetaRenderer}
      getTurnFromPath={getTurnFromPath}
      dimensions={dimensions}
      renderPNG={renderImageTurnPNG}
      getAITurn={history => getAIImageTurn(history, dimensions)}
    />
  )
}

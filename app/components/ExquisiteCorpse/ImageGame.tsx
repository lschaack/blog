import { CanvasDimensions, ImageTurn } from './types';
import { ImageTurnRenderer } from './ImageTurnRenderer';
import { getGeminiService, GameContext } from "./geminiAI";
import { Game, GameProps } from "./Game";

const getAIImageTurn = async (
  history: ImageTurn[],
  dimensions: CanvasDimensions,
): Promise<ImageTurn> => {
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
  const gameContext: GameContext = {
    image: baseImage,
    canvasDimensions: dimensions,
    currentTurn: history.length + 1,
    history: history.map((turn, index) => ({
      turn: index + 1,
      author: turn.author,
      interpretation: turn.interpretation,
      reasoning: turn.reasoning
    }))
  };

  // Call AI service for image-based turn
  const geminiService = getGeminiService();
  const aiResponse = await geminiService.generateImageTurn(gameContext);

  // Return the turn data (without metadata fields that will be added by reducer)
  return {
    image: aiResponse.image,
    interpretation: aiResponse.interpretation,
    reasoning: aiResponse.reasoning
  } as ImageTurn;
}

export const ImageGame = ({ dimensions }: Pick<GameProps<ImageTurn>, 'dimensions'>) => {
  return (
    <Game<ImageTurn>
      CurrentTurn={ImageTurnRenderer}
      dimensions={dimensions}
      getAITurn={history => getAIImageTurn(history, dimensions)}
    />
  )
}
import { NextRequest, NextResponse } from 'next/server';
import { ImageDrawingService } from './image-drawing-service';
import { GameContext, BaseTurn } from '@/app/types/exquisiteCorpse';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const context: GameContext<BaseTurn> = await request.json();

    // Validate request body
    if (!context || !context.image || !context.canvasDimensions) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // For draw-image route, create a context with only the latest image to avoid
    // sending an increasing number of images back and forth as turns are added
    const imageOnlyContext: GameContext<BaseTurn> = {
      ...context,
      image: context.image, // Only pass the latest image
    };

    const imageService = new ImageDrawingService(apiKey);
    const response = await imageService.generateTurn<BaseTurn>(imageOnlyContext);

    return NextResponse.json(response);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ImageDrawingService } from './image-drawing-service';
import { GameContext, ImageGeminiFlashPreviewTurn } from '@/app/types/exquisiteCorpse';
import { ImageGameContextSchema } from '../schemas';
import z from 'zod';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const context = ImageGameContextSchema.parse(body);

    // For draw-image route, create a context with only the latest image to avoid
    // sending an increasing number of images back and forth as turns are added
    const imageOnlyContext: GameContext<ImageGeminiFlashPreviewTurn> = {
      ...context,
      image: context.image, // Only pass the latest image
    };

    const imageService = new ImageDrawingService(apiKey);
    const response = await imageService.generateTurn<ImageGeminiFlashPreviewTurn>(imageOnlyContext);

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ImageDrawingService } from './image-drawing-service';
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

    const imageService = new ImageDrawingService(apiKey);
    const response = await imageService.generateTurn(context);

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod error in draw-image request', error);

      return NextResponse.json(
        { error: `Found issues in paths:\n\t${error.errors.map((iss) => iss.path.join('.')).join('\n\t')}` },
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

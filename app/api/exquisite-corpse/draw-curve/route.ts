import { NextRequest, NextResponse } from 'next/server';
import { CurveDrawingService } from './curve-drawing-service';
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

    const curveService = new CurveDrawingService(apiKey);
    const response = await curveService.generateTurn<BaseTurn>(context);

    return NextResponse.json(response);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { GPT5CurveDrawingService } from '../draw-curve/gpt5-curve-drawing-service';
import { GameContext, CurveTurn } from '@/app/types/exquisiteCorpse';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const context: GameContext<CurveTurn> = await request.json();

    // Validate request body
    if (!context || !context.image || !context.canvasDimensions) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const curveService = new GPT5CurveDrawingService(apiKey);
    const response = await curveService.generateTurn(context);

    return NextResponse.json(response);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

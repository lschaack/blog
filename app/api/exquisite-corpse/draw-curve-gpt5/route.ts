import { NextRequest, NextResponse } from 'next/server';
import { GPT5CurveDrawingService } from '../draw-curve/gpt5-curve-drawing-service';
import { GameContext, CurveTurn } from '@/app/types/exquisiteCorpse';
import { CurveGameContextSchema } from '../schemas';
import z from 'zod';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const body: GameContext<CurveTurn> = await request.json();
    const context = CurveGameContextSchema.parse(body);

    const curveService = new GPT5CurveDrawingService(apiKey);
    const response = await curveService.generateTurn(context);

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

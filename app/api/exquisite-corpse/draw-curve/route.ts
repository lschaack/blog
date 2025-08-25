import { NextRequest, NextResponse } from 'next/server';
import { CurveDrawingService } from './curve-drawing-service';
import { CurveGameContextSchema } from '../schemas';
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
    const context = CurveGameContextSchema.parse(body);

    const curveService = new CurveDrawingService(apiKey);
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

import { NextRequest, NextResponse } from 'next/server';
import { GeminiService, GameContext } from '../gemini-service';

export type AIImageResponse = {
  interpretation: string;
  image: string; // base64 encoded image representing the AI's addition
  reasoning: string;
};

function validateResponse(response: unknown): AIImageResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid AI response format');
  }

  const { interpretation, image, reasoning } = response as { interpretation: unknown; image: unknown; reasoning: unknown };

  if (typeof interpretation !== 'string' || interpretation.trim().length === 0) {
    throw new Error('Invalid or missing interpretation');
  }

  if (typeof image !== 'string' || image.trim().length === 0) {
    throw new Error('Invalid or missing image');
  }

  if (typeof reasoning !== 'string' || reasoning.trim().length === 0) {
    throw new Error('Invalid or missing reasoning');
  }

  return {
    interpretation: interpretation.trim(),
    image: image.trim(),
    reasoning: reasoning.trim(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const context: GameContext = await request.json();

    // Validate request body
    if (!context || !context.image || !context.canvasDimensions) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const geminiService = new GeminiService(apiKey);
    const response = await geminiService.generateContent(context, (response) => {
      return validateResponse(response);
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
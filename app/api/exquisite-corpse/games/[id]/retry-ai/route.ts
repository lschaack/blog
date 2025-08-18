import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '@/app/lib/gameService';

type Params = {
  id: string;
};

export async function GET(
  request: NextRequest,
  props: { params: Promise<Params> }
) {
  try {
    const params = await props.params;
    const sessionId = params.id;
    const gameService = getGameService();
    
    await gameService.retryAITurn(sessionId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Retry AI turn error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Game not found') {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }
      if (error.message === 'Not an AI game') {
        return NextResponse.json(
          { error: 'Not an AI game' },
          { status: 400 }
        );
      }
      if (error.message === 'Not AI\'s turn') {
        return NextResponse.json(
          { error: 'Not AI\'s turn' },
          { status: 400 }
        );
      }
      if (error.message === 'AI turn already in progress') {
        return NextResponse.json(
          { error: 'AI turn already in progress' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
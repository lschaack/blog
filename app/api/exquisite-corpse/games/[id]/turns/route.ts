import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '@/app/lib/gameService';
import type { SubmitTurnRequest } from '@/app/types/multiplayer';

type Params = {
  id: string;
};

export async function POST(
  request: NextRequest,
  props: { params: Promise<Params> }
) {
  try {
    const params = await props.params;
    const sessionId = params.id;
    const body = await request.json();

    // Extract playerId from headers or body
    const playerId = request.headers.get('x-player-id') || body.playerId;
    if (!playerId) {
      return NextResponse.json(
        { error: 'Missing player ID in headers or body' },
        { status: 400 }
      );
    }

    // Validate turn data
    if (!body.turnData) {
      return NextResponse.json(
        { error: 'Missing turnData' },
        { status: 400 }
      );
    }

    const submitRequest: SubmitTurnRequest = {
      turnData: body.turnData
    };

    const gameService = getGameService();
    await gameService.submitTurn(sessionId, playerId, submitRequest);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Submit turn error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Game not found') {
        return NextResponse.json(
          { error: 'Game not found' },
          { status: 404 }
        );
      }
      if (error.message === 'Not your turn') {
        return NextResponse.json(
          { error: 'Not your turn' },
          { status: 403 }
        );
      }
      if (error.message === 'Invalid turn number') {
        return NextResponse.json(
          { error: 'Invalid turn number' },
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
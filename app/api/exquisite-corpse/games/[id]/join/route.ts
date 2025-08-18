import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '@/app/lib/gameService';
import type { JoinGameRequest } from '@/app/types/multiplayer';

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
    const body: JoinGameRequest = await request.json();

    // Validate request
    if (!body.playerName) {
      return NextResponse.json(
        { error: 'Missing required field: playerName' },
        { status: 400 }
      );
    }

    if (body.playerName.trim().length === 0) {
      return NextResponse.json(
        { error: 'playerName cannot be empty' },
        { status: 400 }
      );
    }

    const gameService = getGameService();
    const result = await gameService.joinGame(sessionId, body);

    return NextResponse.json({
      playerId: result.playerId,
      isActive: result.isActive
    });

  } catch (error) {
    console.error('Join game error:', error);
    
    if (error instanceof Error && error.message === 'Game not found') {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
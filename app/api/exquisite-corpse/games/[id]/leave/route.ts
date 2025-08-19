import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '@/app/lib/gameService';

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
    
    // Try to get player ID from header first, then from request body
    let playerId = request.headers.get('x-player-id');
    
    if (!playerId) {
      try {
        const body = await request.json();
        playerId = body.playerId;
      } catch {
        // Ignore JSON parse errors, playerId might be in header
      }
    }

    if (!playerId) {
      return NextResponse.json(
        { error: 'Missing player ID' },
        { status: 400 }
      );
    }

    const gameService = getGameService();
    await gameService.removePlayer(sessionId, playerId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to leave game:', error);
    return NextResponse.json(
      { error: 'Failed to leave game' },
      { status: 500 }
    );
  }
}
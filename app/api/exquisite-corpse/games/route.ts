import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '@/app/lib/gameService';
import type { CreateGameRequest } from '@/app/types/multiplayer';

export async function POST(request: NextRequest) {
  try {
    const body: CreateGameRequest = await request.json();

    // Validate request
    if (!body.gameType || !body.playerName) {
      return NextResponse.json(
        { error: 'Missing required fields: gameType, playerName' },
        { status: 400 }
      );
    }

    if (!['multiplayer', 'ai'].includes(body.gameType)) {
      return NextResponse.json(
        { error: 'Invalid gameType. Must be "multiplayer" or "ai"' },
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
    const result = await gameService.createGame(body);

    return NextResponse.json({
      sessionId: result.sessionId,
      playerId: result.playerId
    });

  } catch (error) {
    console.error('Create game error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
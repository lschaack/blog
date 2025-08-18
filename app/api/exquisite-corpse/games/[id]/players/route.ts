import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/app/lib/redis';

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
    const redis = getRedisClient();
    
    const gameState = await redis.getGameState(sessionId);
    if (!gameState) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Return players with minimal info
    const players = gameState.players.map(player => ({
      id: player.id,
      name: player.name,
      isActive: player.isActive,
      joinedAt: player.joinedAt
    }));

    return NextResponse.json({
      players,
      currentPlayer: gameState.currentPlayer
    });

  } catch (error) {
    console.error('Get players error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/app/lib/redis';
import { Params } from './params';

export async function GET(
  request: NextRequest,
  props: { params: Promise<Params> }
) {
  try {
    const params = await props.params;
    const sessionId = params.sessionId;
    const redis = getRedisClient();

    const gameState = await redis.getGameState(sessionId);
    if (!gameState) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(gameState);

  } catch (error) {
    console.error('Get game state error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<Params> }
) {
  try {
    const params = await props.params;
    const sessionId = params.sessionId;
    const redis = getRedisClient();

    const gameExists = await redis.gameExists(sessionId);
    if (!gameExists) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    await redis.deleteGameState(sessionId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete game error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

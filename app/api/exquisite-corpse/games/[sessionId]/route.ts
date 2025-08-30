import { NextResponse } from 'next/server';
import { getRedisClient } from '@/app/lib/redis';
import { Params } from './params';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { withRedisErrorHandler } from '@/app/api/middleware/redis';
import { compose } from '@/app/api/middleware/compose';

export const GET = compose(
  withCatchallErrorHandler,
  withRedisErrorHandler,
)(
  async (_, ctx: { params: Promise<Params> }) => {
    const params = await ctx.params;
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
  }
);

export const DELETE = compose(
  withCatchallErrorHandler,
  withRedisErrorHandler,
)(
  async (_, ctx: { params: Promise<Params> }) => {
    const params = await ctx.params;
    const sessionId = params.sessionId;
    const redis = getRedisClient();

    // TODO: Add 404 for specific error from game not existing
    await redis.deleteGameState(sessionId);

    return NextResponse.json({ success: true });
  }
);

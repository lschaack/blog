import { NextResponse } from 'next/server';

import { getGameService } from '@/app/lib/gameService';
import { Params } from '../params';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { withRedisErrorHandler } from '@/app/api/middleware/redis';
import { withRequiredCookies } from '@/app/api/middleware/cookies';
import { compose } from '@/app/api/middleware/compose';

export const POST = compose(
  withRequiredCookies('playerId'),
  withCatchallErrorHandler,
  withRedisErrorHandler,
)(
  async (
    _,
    ctx: {
      params: Promise<Params>,
      cookies: { playerId: string }
    }
  ) => {
    const { sessionId } = await ctx.params;
    const { cookies: { playerId } } = ctx;

    await getGameService().removePlayer(sessionId, playerId);

    return NextResponse.json({ success: true });
  }
)

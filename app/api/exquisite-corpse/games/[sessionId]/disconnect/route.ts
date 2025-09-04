import { NextResponse } from 'next/server';

import { getGameService } from '@/app/lib/gameService';
import { Params } from '../params';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { withRedisErrorHandler } from '@/app/api/middleware/redis';
import { withRequiredCookies } from '@/app/api/middleware/cookies';
import { compose } from '@/app/api/middleware/compose';

// FIXME: Remove subscription?
export const POST = compose(
  withRequiredCookies('playerName'),
  withCatchallErrorHandler,
  withRedisErrorHandler,
)(
  async (
    _,
    ctx: {
      params: Promise<Params>,
      cookies: { playerName: string }
    }
  ) => {
    const { sessionId } = await ctx.params;
    const { cookies: { playerName } } = ctx;

    await getGameService().removePlayer(sessionId, playerName);

    return NextResponse.json({ success: true });
  }
)

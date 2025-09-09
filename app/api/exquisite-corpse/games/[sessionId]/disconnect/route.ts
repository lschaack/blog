import { NextResponse } from 'next/server';

import { Params } from '../params';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { withRedisErrorHandler } from '@/app/api/middleware/redis';
import { withRequiredCookies } from '@/app/api/middleware/cookies';
import { compose } from '@/app/api/middleware/compose';
import { getGameEventManager } from '@/app/lib/redis';

export const POST = compose(
  withRequiredCookies('connectionToken'),
  withCatchallErrorHandler,
  withRedisErrorHandler,
)(
  async (
    _,
    ctx: {
      params: Promise<Params>,
      cookies: { connectionToken: string }
    }
  ) => {
    const { sessionId } = await ctx.params;
    const { cookies: { connectionToken } } = ctx;

    await getGameEventManager().unsubscribeFromGame(sessionId, connectionToken);

    return NextResponse.json({ success: true });
  }
)

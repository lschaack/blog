import { NextResponse } from 'next/server';
import { getGameService } from '@/app/lib/gameService';
import { Params } from '../params';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { withRedisErrorHandler } from '@/app/api/middleware/redis';
import { compose } from '@/app/api/middleware/compose';

export const GET = compose(
  withCatchallErrorHandler,
  withRedisErrorHandler,
)(
  async (
    _,
    ctx: { params: Promise<Params> }
  ) => {
    const params = await ctx.params;
    const sessionId = params.sessionId;
    const gameService = getGameService();

    await gameService.retryAITurn(sessionId);

    return NextResponse.json({ success: true });
  }
)

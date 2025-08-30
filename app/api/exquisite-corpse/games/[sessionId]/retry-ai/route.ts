import { NextResponse } from 'next/server';
import { getGameService } from '@/app/lib/gameService';
import { Params } from '../params';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { withRedisErrorHandler } from '@/app/api/middleware/redis';
import { compose } from '@/app/api/middleware/compose';
import { withGameErrorHandler } from '@/app/api/middleware/game';

export const GET = compose(
  withCatchallErrorHandler,
  withGameErrorHandler,
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

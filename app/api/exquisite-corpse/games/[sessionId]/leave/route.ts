import { NextRequest, NextResponse } from 'next/server';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { withRedisErrorHandler } from '@/app/api/middleware/redis';
import { compose } from '@/app/api/middleware/compose';
import { GameParams } from '../../../schemas';
import { getExquisiteCorpseSessionService } from '@/app/lib/exquisiteCorpseSessionService';
import { withRequiredCookies } from '@/app/api/middleware/cookies';
import { deletePlayerCookies } from '../cookies';

export const POST = compose(
  withRequiredCookies('playerName', 'playerToken'),
  withCatchallErrorHandler,
  withRedisErrorHandler,
)(
  async (
    _: NextRequest,
    ctx: {
      params: Promise<GameParams>,
      cookies: { playerName: string, playerToken: string },
    }
  ) => {
    const { sessionId } = await ctx.params;
    const { cookies: { playerName, playerToken } } = ctx;

    await getExquisiteCorpseSessionService().leave(sessionId, playerName, playerToken);

    await deletePlayerCookies(sessionId, playerName, playerToken)

    return NextResponse.json({ success: true });
  }
)

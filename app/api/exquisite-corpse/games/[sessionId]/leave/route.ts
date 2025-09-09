import { NextRequest, NextResponse } from 'next/server';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { withRedisErrorHandler } from '@/app/api/middleware/redis';
import { compose } from '@/app/api/middleware/compose';
import { GameParams } from '../../../schemas';
import { getGameService } from '@/app/lib/gameService';
import { withRequiredCookies } from '@/app/api/middleware/cookies';
import { cookies } from 'next/headers';

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

    await getGameService().leave(sessionId, playerName, playerToken);

    const cookieStore = await cookies();
    cookieStore.delete('playerName');
    cookieStore.delete('playerToken');

    return NextResponse.json({ success: true });
  }
)

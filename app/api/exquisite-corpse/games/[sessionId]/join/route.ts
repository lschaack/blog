import { NextRequest, NextResponse } from 'next/server';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { withRedisErrorHandler } from '@/app/api/middleware/redis';
import { compose } from '@/app/api/middleware/compose';
import { GameParams, JoinGameRequest, JoinGameRequestSchema } from '../../../schemas';
import { getGameService } from '@/app/lib/gameService';
import { withZodRequestValidation } from '@/app/api/middleware/zod';
import { setPlayerCookies } from '../cookies';
import { cookies } from 'next/headers';

export const POST = compose(
  withCatchallErrorHandler,
  withRedisErrorHandler,
  withZodRequestValidation(JoinGameRequestSchema),
)(
  async (
    _: NextRequest,
    ctx: {
      params: Promise<GameParams>,
      validatedBody: Promise<JoinGameRequest>
    }
  ) => {
    const { sessionId } = await ctx.params;
    const { playerName } = await ctx.validatedBody;

    const cookieStore = await cookies();
    const existingPlayerName = cookieStore.get('playerName');

    if (existingPlayerName) {
      // FIXME: on the frontend, show "leave" and "reconnect as {playerName}"
      return NextResponse.json(
        { error: 'Please leave the game before rejoining' },
        { status: 409 },
      );
    }

    const playerToken = crypto.randomUUID();

    await getGameService().join(sessionId, playerName, playerToken);

    await setPlayerCookies(sessionId, playerName, playerToken);

    return NextResponse.json({ success: true });
  }
)

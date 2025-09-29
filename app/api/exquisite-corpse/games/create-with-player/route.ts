import { NextResponse } from 'next/server';

import { getExquisiteCorpseSessionService } from '@/app/lib/exquisiteCorpseSessionService';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { withRedisErrorHandler } from '@/app/api/middleware/redis';
import { withZodRequestValidation } from '@/app/api/middleware/zod';
import { compose } from '@/app/api/middleware/compose';
import { CreateWithPlayerRequest, CreateWithPlayerRequestSchema, GameParams } from '../../schemas';
import { setPlayerCookies } from '../[sessionId]/cookies';

export const POST = compose(
  withCatchallErrorHandler,
  withRedisErrorHandler,
  withZodRequestValidation(CreateWithPlayerRequestSchema),
)(
  async (
    _,
    ctx: {
      params: Promise<GameParams>,
      validatedBody: Promise<CreateWithPlayerRequest>
    }
  ) => {
    const { gameType, playerName, dimensions } = await ctx.validatedBody;
    const playerToken = crypto.randomUUID();
    const gameService = getExquisiteCorpseSessionService();

    const { sessionId } = await gameService.createGame(gameType, dimensions);

    await gameService.join(sessionId, playerName, playerToken);
    await setPlayerCookies(sessionId, playerName, playerToken);

    return NextResponse.json({ sessionId });
  }
)

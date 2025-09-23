import { NextResponse } from 'next/server';

import { getGameService } from '@/app/lib/gameService';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { withRedisErrorHandler } from '@/app/api/middleware/redis';
import { withZodRequestValidation } from '@/app/api/middleware/zod';
import { compose } from '@/app/api/middleware/compose';
import { CreateGameRequest, CreateGameRequestSchema, GameParams } from '../../schemas';

export const POST = compose(
  withCatchallErrorHandler,
  withRedisErrorHandler,
  withZodRequestValidation(CreateGameRequestSchema),
)(
  async (
    _,
    ctx: {
      params: Promise<GameParams>,
      validatedBody: Promise<CreateGameRequest>
    }
  ) => {
    const { gameType, dimensions } = await ctx.validatedBody;

    const result = await getGameService().createGame(gameType, dimensions);

    return NextResponse.json(result);
  }
)

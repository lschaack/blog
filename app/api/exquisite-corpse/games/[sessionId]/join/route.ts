import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import z from 'zod';

import { getGameService } from '@/app/lib/gameService';
import { PlayerNameSchema } from '../../../schemas';
import { Params } from '../params';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { withRedisErrorHandler } from '@/app/api/middleware/redis';
import { withZodRequestValidation } from '@/app/api/middleware/zod';
import { compose } from '@/app/api/middleware/compose';

const JoinRequestSchema = z.object({
  playerName: PlayerNameSchema,
})

export const POST = compose(
  withCatchallErrorHandler,
  withRedisErrorHandler,
  withZodRequestValidation(JoinRequestSchema),
)(
  async (
    _,
    ctx: {
      params: Promise<Params>,
      validatedBody: Promise<z.infer<typeof JoinRequestSchema>>
    }
  ) => {
    const { sessionId } = await ctx.params;
    const validatedBody = await ctx.validatedBody;

    // TODO: add 404 if game doesn't exist
    const result = await getGameService().joinGame(sessionId, validatedBody);

    const cookieStore = await cookies();
    cookieStore.set('playerId', result.playerName);

    return NextResponse.json(result);
  }
)

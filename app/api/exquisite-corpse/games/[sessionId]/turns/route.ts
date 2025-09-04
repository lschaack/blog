import { NextResponse } from 'next/server';
import z from 'zod';
import { getGameService } from '@/app/lib/gameService';
import { Params } from '../params';
import { CurveTurnSchema } from '../../../schemas';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { withRedisErrorHandler } from '@/app/api/middleware/redis';
import { withZodRequestValidation } from '@/app/api/middleware/zod';
import { withRequiredCookies } from '@/app/api/middleware/cookies';
import { compose } from '@/app/api/middleware/compose';

const SubmitTurnRequestSchema = CurveTurnSchema.pick({ path: true });

export const POST = compose(
  withRequiredCookies('playerName'),
  withCatchallErrorHandler,
  withRedisErrorHandler,
  withZodRequestValidation(SubmitTurnRequestSchema),
)(
  async (
    _,
    ctx: {
      params: Promise<Params>,
      cookies: { playerName: string },
      validatedBody: Promise<z.infer<typeof SubmitTurnRequestSchema>>
    }
  ) => {
    const validatedBody = await ctx.validatedBody;
    const { sessionId } = await ctx.params;
    const { cookies: { playerName } } = ctx;

    await getGameService().submitTurn(sessionId, playerName, validatedBody.path);

    return NextResponse.json({ success: true });
  }
)

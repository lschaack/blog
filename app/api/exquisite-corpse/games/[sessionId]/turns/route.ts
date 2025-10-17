import { NextResponse } from 'next/server';
import z from 'zod';
import { getExquisiteCorpseSessionService } from '@/app/lib/exquisiteCorpseSessionService';
import { Params } from '../params';
import { CurveTurnSchema } from '../../../schemas';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { withRedisErrorHandler } from '@/app/api/middleware/redis';
import { withZodRequestValidation } from '@/app/api/middleware/zod';
import { withRequiredCookies } from '@/app/api/middleware/cookies';
import { compose } from '@/app/api/middleware/compose';

const SubmitTurnRequestSchema = CurveTurnSchema.pick({ path: true });

export const POST = compose(
  withRequiredCookies('playerName', 'playerToken'),
  withCatchallErrorHandler,
  withRedisErrorHandler,
  withZodRequestValidation(SubmitTurnRequestSchema),
)(
  async (
    _,
    ctx: {
      params: Promise<Params>,
      cookies: { playerName: string, playerToken: string },
      validatedBody: Promise<z.infer<typeof SubmitTurnRequestSchema>>
    }
  ) => {
    const validatedBody = await ctx.validatedBody;
    const { sessionId } = await ctx.params;
    const { cookies: { playerName, playerToken } } = ctx;

    await getExquisiteCorpseSessionService().submitTurn(sessionId, playerName, playerToken, validatedBody.path);

    return NextResponse.json({ success: true });
  }
)

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from "zod";

import { getGameService } from '@/app/lib/gameService';
import { PlayerNameSchema } from '../../schemas';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { withRedisErrorHandler } from '@/app/api/middleware/redis';
import { withZodRequestValidation } from '@/app/api/middleware/zod';
import { compose } from '@/app/api/middleware/compose';
import { Params } from '../[sessionId]/params';

const CreateGameRequestSchema = z.object({
  gameType: z.union([z.literal("multiplayer"), z.literal("singleplayer")], {
    message: "Invalid gameType. Must be \"multiplayer\" or \"singleplayer\""
  }),
  playerName: PlayerNameSchema,
})

export const POST = compose(
  withCatchallErrorHandler,
  withRedisErrorHandler,
  withZodRequestValidation(CreateGameRequestSchema),
)(
  async (
    _,
    ctx: {
      params: Promise<Params>,
      validatedBody: Promise<z.infer<typeof CreateGameRequestSchema>>
    }
  ) => {
    const validatedBody = await ctx.validatedBody;

    const result = await getGameService().createGame(validatedBody);

    const cookieStore = await cookies();
    cookieStore.set('playerId', result.playerName);

    return NextResponse.json(result);
  }
)

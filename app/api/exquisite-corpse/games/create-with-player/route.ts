import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from "zod";

import { getGameService } from '@/app/lib/gameService';
import { PlayerNameSchema } from '../../schemas';

const CreateGameRequestSchema = z.object({
  gameType: z.union([z.literal("multiplayer"), z.literal("singleplayer")], {
    message: "Invalid gameType. Must be \"multiplayer\" or \"ai\""
  }),
  playerName: PlayerNameSchema,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateGameRequestSchema.parse(body);
    const result = await getGameService().createGame(parsed);

    const cookieStore = await cookies();
    cookieStore.set('exquisite_corpse_player_id', result.playerId);

    return NextResponse.json({
      sessionId: result.sessionId,
      playerId: result.playerId
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }
}



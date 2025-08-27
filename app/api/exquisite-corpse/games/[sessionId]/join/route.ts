import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '@/app/lib/gameService';
import { PlayerNameSchema } from '../../../schemas';
import z from 'zod';
import { Params } from '../params';

const JoinRequestSchema = z.object({
  playerName: PlayerNameSchema,
})

export async function POST(
  request: NextRequest,
  props: { params: Promise<Params> }
) {
  try {
    const params = await props.params;
    const sessionId = params.sessionId;
    const body = await request.json();
    const joinRequest = JoinRequestSchema.parse(body);

    const gameService = getGameService();
    const result = await gameService.joinGame(sessionId, joinRequest);

    return NextResponse.json({
      playerId: result.playerId,
      isActive: result.isActive
    });

  } catch (error) {
    console.error('Join game error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Game not found') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

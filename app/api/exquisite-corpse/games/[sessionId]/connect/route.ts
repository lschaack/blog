import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/app/lib/redis';
import { getGameService } from '@/app/lib/gameService';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { REPLY_ERROR_SPLITTER, withRedisErrorHandler } from '@/app/api/middleware/redis';
import { compose } from '@/app/api/middleware/compose';
import { GameParams } from '../../../schemas';
import { cookies } from 'next/headers';
import { GameEvent } from '@/app/types/multiplayer';
import { getMissingCookieResponse } from '@/app/api/middleware/cookies';
import { CUSTOM_REPLY_ERROR_TYPE } from '@/app/types/exquisiteCorpse';
import { ReplyError } from 'ioredis';

const ONE_DAY_S = 60 * 60 * 24;

const getSuccessStream = (sessionId: string, playerName: string, playerToken: string, request: NextRequest) => {
  const redis = getRedisClient();
  const gameService = getGameService();

  // Set up SSE stream
  const encoder = new TextEncoder();
  let heartbeatInterval: NodeJS.Timeout;
  let isConnectionActive = true;

  return new NextResponse(
    new ReadableStream({
      async start(controller) {
        try {
          const initialGameState = await redis.getGameState(sessionId);
          const initialStateEvent: GameEvent = {
            status: 'loaded',
            gameState: initialGameState,
          }

          const data = `event: game_update\ndata: ${JSON.stringify(initialStateEvent)}\n\n`;

          controller.enqueue(encoder.encode(data));
        } catch (error) {
          throw new Error(`Failed to get initial game state: ${error}`)
        }

        // Set up heartbeat every 30 seconds
        heartbeatInterval = setInterval(() => {
          if (isConnectionActive) {
            try {
              const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`;
              controller.enqueue(encoder.encode(heartbeat));
            } catch {
              console.log('Heartbeat failed, closing connection');
              cleanup();
            }
          }
        }, 30000);

        // Subscribe to Redis events
        const redisEventHandler = async (event: GameEvent) => {
          if (isConnectionActive) {
            try {
              const data = `event: game_update\ndata: ${JSON.stringify(event)}\n\n`;

              controller.enqueue(encoder.encode(data));
            } catch {
              console.log('Failed to send event, closing connection');
              cleanup();
            }
          }
        };

        redis.subscribeToGame(sessionId, redisEventHandler).catch(error => {
          console.error('Failed to subscribe to game events:', error);
          cleanup();
        });

        const cleanup = () => {
          isConnectionActive = false;
          clearInterval(heartbeatInterval);

          // Remove player when connection closes
          gameService.removePlayer(sessionId, playerName, playerToken).catch(error => {
            console.error('Failed to disconnect player:', error);
          });

          // Unsubscribe from Redis
          redis.unsubscribeFromGame(sessionId, redisEventHandler).catch(error => {
            console.error('Failed to unsubscribe from game:', error);
          });

          try {
            controller.close();
          } catch {
            console.log('Controller already closed');
          }
        };

        // Handle connection close
        request.signal.addEventListener('abort', cleanup);
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  );
}

// NOTE: Can't use traditional errors w/SSE, but we can use a stream which sends
// a single error event before immediately closing itself
const getCrashAndBurnStream = (errorEventData: { message: string }) => {
  return new NextResponse(
    new ReadableStream({
      start(controller) {
        const errorEvent = `event: error\ndata: ${JSON.stringify(errorEventData)}\n\n`;

        controller.enqueue(new TextEncoder().encode(errorEvent));
        controller.close();
      }
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'close',
      },
    }
  );
}

export const GET = compose(
  withCatchallErrorHandler,
  withRedisErrorHandler,
)(
  async (
    request: NextRequest,
    ctx: {
      params: Promise<GameParams>,
      cookies: { playerName: string },
    }
  ) => {
    const { sessionId } = await ctx.params;

    const { searchParams } = new URL(request.url);
    const playerNameRequest = searchParams.get('playerName');

    const cookieStore = await cookies();

    const playerNameCookie = cookieStore.get('playerName');
    const playerTokenCookie = cookieStore.get('playerToken');

    const playerName = playerNameRequest ?? playerNameCookie?.value;
    const playerToken = playerTokenCookie?.value ?? crypto.randomUUID();

    if (playerNameRequest) {
      cookieStore.set({
        name: 'playerName',
        value: playerNameRequest,
        maxAge: 60 * 60 * 24,
        path: `/api/exquisite-corpse/games/${sessionId}/`
      });
    } else if (!cookieStore.has('playerName')) {
      return getMissingCookieResponse('playerName');
    }

    if (!playerName) {
      return getCrashAndBurnStream({
        message: 'Missing player name, use the join game flow! Or add a playerName query param if you\'re feeling freaky.'
      })
    }

    const gameService = getGameService();

    try {
      // TODO: if the token is valid but doesn't match the provided name, show:
      // - "join as {current name}"
      // - "rejoin under new name"
      await gameService.addPlayer(sessionId, playerName, playerToken);
    } catch (error) {
      if (error instanceof ReplyError) {
        const { type } = (REPLY_ERROR_SPLITTER.exec((error as Error).message)?.groups ?? {}) as { type?: CUSTOM_REPLY_ERROR_TYPE };

        const errorEventData = { message: '' };
        if (type === 'FORBIDDEN') {
          errorEventData.message = 'This game is already full. Try making a new one!';
        } else if (type === 'NOT_FOUND') {
          errorEventData.message = 'This game does not exist or has been cleaned up. Try making a new one!';
        } else if (type === 'CONFLICT') {
          errorEventData.message = `A player with the name "${playerName}" is already in the game.`;
        } else {
          errorEventData.message = 'Not sure what went wrong, but I\'m impressed that you managed to encounter this message!';
        }

        return getCrashAndBurnStream(errorEventData);
      } else {
        throw error;
      }
    }

    if (!cookieStore.has('playerName')) {
      cookieStore.set({
        name: 'playerName',
        value: playerName,
        maxAge: ONE_DAY_S,
        path: `/api/exquisite-corpse/games/${sessionId}/`
      });
    }

    if (!cookieStore.has('playerToken')) {
      cookieStore.set({
        name: 'playerToken',
        value: playerToken,
        maxAge: ONE_DAY_S,
        path: `/api/exquisite-corpse/games/${sessionId}/`
      });
    }

    return getSuccessStream(sessionId, playerName, playerToken, request);
  }
)

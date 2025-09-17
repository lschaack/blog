import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '@/app/lib/gameService';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { createConnectionError, withRedisErrorHandler } from '@/app/api/middleware/redis';
import { compose } from '@/app/api/middleware/compose';
import { GameParams } from '../../../schemas';
import { ReplyError } from 'ioredis';
import { cookies } from 'next/headers';
import { ONE_DAY_S } from '@/app/utils/time';
import { GameStateUpdate } from '@/app/types/multiplayer';
import { ConnectionError, DEFAULT_CONNECTION_ERROR } from '@/app/lib/connectionError';

// NOTE: Can't use traditional errors w/SSE, but we can use a stream which sends
// a single error event before immediately closing itself
const getCrashAndBurnStream = (connectionError: ConnectionError) => {
  return new NextResponse(
    new ReadableStream({
      start(controller) {
        const errorEvent = `event: error\ndata: ${JSON.stringify(connectionError)}\n\n`;

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

const getConnectionError = (error: unknown, playerName: string): ConnectionError => {
  if (error instanceof ReplyError) {
    const { error: connectionError } = createConnectionError(error);

    // improve error message if I have a good idea of what caused it
    if (connectionError.code === 403001) {
      connectionError.message = `Cannot verify that you are actually ${playerName}. Use the join game flow!`;
    } else if (connectionError.code === 404001) {
      connectionError.message = 'This game does not exist or has been cleaned up. Try making a new one!';
    } else if (connectionError.code === 404002) {
      connectionError.message = `Player "${playerName}" is not in the game. Use the join game flow!`;
    }

    return connectionError;
  }

  else return DEFAULT_CONNECTION_ERROR;
}

export const GET = compose(
  withCatchallErrorHandler,
  withRedisErrorHandler,
)(
  async (
    request: NextRequest,
    ctx: {
      params: Promise<GameParams>,
      cookies: { playerName: string, playerToken: string },
    }
  ) => {
    const { sessionId } = await ctx.params;
    const cookieStore = await cookies();

    const playerName = cookieStore.get('playerName')?.value;
    const playerToken = cookieStore.get('playerToken')?.value;

    if (!playerName || !playerToken) {
      return getCrashAndBurnStream({
        code: 403002,
        message: 'Missing player info, use the join game flow!'
      });
    }

    const connectionToken = crypto.randomUUID();

    // NOTE: ideally would only set this on successful connection
    // but it's a bad idea to await the end of the start method of the stream
    // and this needs to be called before the response is initially sent to work
    (await cookies()).set({
      name: 'connectionToken',
      value: connectionToken,
      maxAge: ONE_DAY_S,
      path: `/api/exquisite-corpse/games/${sessionId}`
    });

    const gameService = getGameService();

    // Set up SSE stream
    const encoder = new TextEncoder();
    let heartbeatInterval: NodeJS.Timeout;

    const stream = new ReadableStream({
      async start(controller) {
        // Set up heartbeat every 30 seconds
        heartbeatInterval = setInterval(() => {
          try {
            const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`;
            controller.enqueue(encoder.encode(heartbeat));
          } catch {
            console.log('Heartbeat failed, closing connection');
            cleanup();
          }
        }, 30000);

        const cleanup = () => {
          clearInterval(heartbeatInterval);

          gameService.disconnect(sessionId, playerName, connectionToken).catch(error => {
            console.error('Failed to disconnect player:', error);
          });

          try {
            controller.close();
          } catch {
            console.log('Controller already closed');
          }
        };

        request.signal.addEventListener('abort', cleanup);

        try {
          const initialGameState = await getGameService().connect(
            sessionId,
            playerName,
            playerToken,
            connectionToken,
            { controller, cleanup }
          );

          const initialGameStateEvent: GameStateUpdate = {
            status: 'game_update',
            gameState: initialGameState,
          }

          controller.enqueue(encoder.encode(
            `event: game_update\ndata: ${JSON.stringify(initialGameStateEvent)}\n\n`
          ));
        } catch (error) {
          console.log(error);

          const connectionError = getConnectionError(error, playerName);
          const errorEvent = `event: error\ndata: ${JSON.stringify(connectionError)}\n\n`;

          controller.enqueue(encoder.encode(errorEvent));

          return cleanup();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Accept-Encoding': 'gzip',
      },
    })
  }
)

import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/app/lib/redis';
import { getGameService } from '@/app/lib/gameService';
import { Params } from '../params';
import { withCatchallErrorHandler } from '@/app/api/middleware/catchall';
import { withRedisErrorHandler } from '@/app/api/middleware/redis';
import { withRequiredCookies } from '@/app/api/middleware/cookies';
import { compose } from '@/app/api/middleware/compose';

export const GET = compose(
  withRequiredCookies('playerId'),
  withCatchallErrorHandler,
  withRedisErrorHandler,
)(
  async (
    request: NextRequest,
    ctx: {
      params: Promise<Params>,
      cookies: { playerId: string }
    }
  ) => {
    const { sessionId } = await ctx.params;
    const { cookies: { playerId } } = ctx;

    // Verify game exists
    const redis = getRedisClient();
    const playerExistsInGame = await redis.playerExistsInGame(sessionId, playerId);

    if (!playerExistsInGame) {
      return NextResponse.json(
        { error: `Player "${playerId}" not found in session ${sessionId}` },
        { status: 404 }
      );
    }

    const gameService = getGameService();
    await gameService.reconnectPlayer(sessionId, playerId);

    // Set up SSE stream
    const encoder = new TextEncoder();
    let heartbeatInterval: NodeJS.Timeout;
    let isConnectionActive = true;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const initialGameState = await redis.getGameState(sessionId);
          const data = `event: game_update\ndata: ${JSON.stringify(initialGameState)}\n\n`;

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
        // FIXME: Avoid extra redis round trips from fetching game here
        const getRedisEventHandler = (sessionId: string) => async () => {
          if (isConnectionActive) {
            try {
              const gameState = await redis.getGameState(sessionId);
              const data = `event: game_update\ndata: ${JSON.stringify(gameState)}\n\n`;

              controller.enqueue(encoder.encode(data));
            } catch {
              console.log('Failed to send event, closing connection');
              cleanup();
            }
          }
        };

        redis.subscribeToGame(sessionId, getRedisEventHandler(sessionId)).catch(error => {
          console.error('Failed to subscribe to game events:', error);
          cleanup();
        });

        const cleanup = () => {
          isConnectionActive = false;
          clearInterval(heartbeatInterval);

          // Remove player when connection closes
          gameService.disconnectPlayer(sessionId, playerId).catch(error => {
            console.error('Failed to disconnect player:', error);
          });

          // Unsubscribe from Redis
          redis.unsubscribeFromGame(sessionId).catch(error => {
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
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
)

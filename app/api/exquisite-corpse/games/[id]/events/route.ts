import { NextRequest } from 'next/server';
import { getRedisClient } from '@/app/lib/redis';
import { getGameService } from '@/app/lib/gameService';
import type { GameEvent } from '@/app/types/multiplayer';

type Params = {
  id: string;
};

export async function GET(
  request: NextRequest,
  props: { params: Promise<Params> }
) {
  const params = await props.params;
  const sessionId = params.id;
  const url = new URL(request.url);
  const playerId = url.searchParams.get('playerId') || request.headers.get('x-player-id');
  
  if (!playerId) {
    return new Response('Missing player ID', { status: 400 });
  }

  // Verify game exists
  const redis = getRedisClient();
  const gameExists = await redis.gameExists(sessionId);
  if (!gameExists) {
    return new Response('Game not found', { status: 404 });
  }

  // Set up SSE stream
  const encoder = new TextEncoder();
  let heartbeatInterval: NodeJS.Timeout;
  let isConnectionActive = true;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(encoder.encode(data));

      // Set up heartbeat every 30 seconds
      heartbeatInterval = setInterval(() => {
        if (isConnectionActive) {
          try {
            const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`;
            controller.enqueue(encoder.encode(heartbeat));
          } catch {
            console.log('Heartbeat failed, closing connection');
            cleanup();
          }
        }
      }, 30000);

      // Subscribe to Redis events
      const eventHandler = (event: GameEvent) => {
        if (isConnectionActive) {
          try {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          } catch {
            console.log('Failed to send event, closing connection');
            cleanup();
          }
        }
      };

      redis.subscribeToGame(sessionId, eventHandler).catch(error => {
        console.error('Failed to subscribe to game events:', error);
        cleanup();
      });

      const cleanup = () => {
        isConnectionActive = false;
        clearInterval(heartbeatInterval);
        
        // Remove player when connection closes
        const gameService = getGameService();
        gameService.removePlayer(sessionId, playerId).catch(error => {
          console.error('Failed to remove player on disconnect:', error);
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

    cancel() {
      isConnectionActive = false;
      clearInterval(heartbeatInterval);
      
      // Remove player when connection closes
      const gameService = getGameService();
      gameService.removePlayer(sessionId, playerId).catch(error => {
        console.error('Failed to remove player on cancel:', error);
      });

      // Unsubscribe from Redis
      redis.unsubscribeFromGame(sessionId).catch(error => {
        console.error('Failed to unsubscribe from game:', error);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'x-player-id',
    },
  });
}
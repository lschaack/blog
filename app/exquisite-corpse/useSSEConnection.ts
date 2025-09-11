import { useEffect, useRef, useState, useCallback } from 'react';
import type { MultiplayerGameState } from '@/app/types/multiplayer';

type SSEConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export type SSEConnection = {
  connectionState: SSEConnectionState;
  error: string | null;
  gameState: MultiplayerGameState | null;
  reconnect: () => void;
};

export const useSSEConnection = (
  sessionId: string | null,
): SSEConnection => {
  const [connectionState, setConnectionState] = useState<SSEConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!sessionId) {
      setConnectionState('disconnected');
      return;
    }

    if (eventSourceRef.current) {
      cleanup();
    }

    setConnectionState('connecting');
    setError(null);

    try {
      const url = new URL(
        `/api/exquisite-corpse/games/${sessionId}/connect`,
        window.location.origin
      );

      const customEventSource = new EventSource(url.toString());
      eventSourceRef.current = customEventSource;

      customEventSource.onopen = () => {
        console.log('SSE connection opened');
        setConnectionState('connected');
        setError(null);
      };

      customEventSource.addEventListener('game_update', (event: MessageEvent<string>) => {
        try {
          const { gameState: nextGameState } = JSON.parse(event.data);

          setGameState(prevGameState => {
            const prevLastEvent = prevGameState?.eventLog.at(-1);
            const nextLastEvent = nextGameState?.eventLog.at(-1);

            const prevTimestamp = prevLastEvent?.timestamp ?? -1;
            const nextTimestamp = nextLastEvent?.timestamp ?? 0;

            if (!prevLastEvent || nextTimestamp > prevTimestamp) {
              return nextGameState;
            } else {
              return prevGameState;
            }
          });
        } catch (error) {
          throw new Error(`Failed to parse game state ${event.data}: ${error}`);
        }
      });

      customEventSource.addEventListener('error', (errorEvent) => {
        setConnectionState('error');

        // see if there's a custom message from a predictable error state
        // FIXME: add handler for application/json errors
        if ((errorEvent as MessageEvent).data) {
          try {
            const parsed = JSON.parse((errorEvent as MessageEvent).data);

            if (parsed.message) {
              setError(parsed.message);
              customEventSource.close();

              return;
            }
          } finally {
            // swallow error - not sure what this is but assuming it's unrecoverable
          }
        }

        setError('Something went wrong enough that I can\'t actually tell you what it is');

        customEventSource.close();
      });

      customEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'heartbeat' || data.type === 'connected') {
            return;
          } else {
            console.warn(`Received event with unknown type "${data.type}"`)
          }
        } catch (err) {
          console.error('Failed to parse SSE message:', err);
        }
      };

    } catch (err) {
      console.error('Failed to create SSE connection:', err);
      setConnectionState('error');
      setError('Failed to connect');
    }
  }, [sessionId, cleanup]);

  // Initial connection and game state fetch
  useEffect(() => {
    if (sessionId) {
      connect();
    } else {
      cleanup();
      setConnectionState('disconnected');
      setGameState(null);
    }

    return cleanup;
  }, [sessionId, connect, cleanup]);

  // Cleanup on unmount and handle beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Try to notify server of disconnect when page is unloading
      if (sessionId) {
        navigator.sendBeacon(`/api/exquisite-corpse/games/${sessionId}/disconnect`);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanup();
    };
  }, [cleanup, sessionId]);

  const reconnect = useCallback(() => {
    cleanup();
    if (sessionId) connect();
  }, [sessionId, connect, cleanup]);

  return {
    connectionState,
    error,
    gameState,
    reconnect
  };
};

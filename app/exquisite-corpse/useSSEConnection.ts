import { useEffect, useRef, useState, useCallback } from 'react';
import type { MultiplayerGameState, GameStatus } from '@/app/types/multiplayer';

type SSEConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

type UseSSEConnectionReturn = {
  connectionState: SSEConnectionState;
  error: string | null;
  gameState: MultiplayerGameState | null;
  status: GameStatus;
  reconnect: () => void;
};

export const useSSEConnection = (
  sessionId: string | null,
  playerName?: string,
): UseSSEConnectionReturn => {
  const [connectionState, setConnectionState] = useState<SSEConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
  const [status, setStatus] = useState<GameStatus>('loading');

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
        `/api/exquisite-corpse/games/${sessionId}/connect?playerName=${playerName}`,
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
          const { gameState: nextGameState, status } = JSON.parse(event.data);

          setStatus(status);
          setGameState(prevGameState => {
            if (nextGameState && nextGameState.timestamp > (prevGameState?.timestamp ?? -1)) {
              return nextGameState;
            } else {
              return prevGameState;
            }
          });
        } catch (error) {
          throw new Error(`Failed to parse game state ${event.data}: ${error}`);
        }
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

      customEventSource.onerror = (errorEvent) => {
        console.warn('SSE error:', errorEvent);

        setConnectionState('error');

        // see if there's a custom message from a predictable error state
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

        setError('Connection lost');
      };
    } catch (err) {
      console.error('Failed to create SSE connection:', err);
      setConnectionState('error');
      setError('Failed to connect');
    }
  }, [sessionId, cleanup, playerName]);

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
  // FIXME: Cleanup is automatic when the SSE connection closes
  // But this makes sense to add if I bring back the joined/connected difference
  //
  //useEffect(() => {
  //  const handleBeforeUnload = () => {
  //    // Try to notify server of disconnect when page is unloading
  //    if (sessionId) {
  //      navigator.sendBeacon(`/api/exquisite-corpse/games/${sessionId}/disconnect`);
  //    }
  //  };
  //
  //  window.addEventListener('beforeunload', handleBeforeUnload);
  //
  //  return () => {
  //    window.removeEventListener('beforeunload', handleBeforeUnload);
  //    cleanup();
  //  };
  //}, [cleanup, sessionId]);

  const reconnect = useCallback(() => {
    cleanup();
    if (sessionId) connect();
  }, [sessionId, connect, cleanup]);

  return {
    connectionState,
    error,
    gameState,
    status,
    reconnect
  };
};

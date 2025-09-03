import { useEffect, useRef, useState, useCallback } from 'react';
import type { MultiplayerGameState } from '@/app/types/multiplayer';

type SSEConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

type UseSSEConnectionReturn = {
  connectionState: SSEConnectionState;
  isConnected: boolean;
  error: string | null;
  gameState: MultiplayerGameState | null;
  reconnect: () => void;
};

export const useSSEConnection = (
  sessionId: string | null,
): UseSSEConnectionReturn => {
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
      const url = new URL(`/api/exquisite-corpse/games/${sessionId}/connect`, window.location.origin);

      const customEventSource = new EventSource(url.toString());
      eventSourceRef.current = customEventSource;

      customEventSource.onopen = () => {
        console.log('SSE connection opened');
        setConnectionState('connected');
        setError(null);
      };

      customEventSource.addEventListener('game_update', event => {
        try {
          const gameState = JSON.parse(event.data);

          setGameState(gameState);
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

      customEventSource.onerror = (err) => {
        console.warn('SSE error:', err);
        setConnectionState('error');
        setError('Connection lost');

        // FIXME: Add back retries
        //reconnectTimeoutRef.current = setTimeout(() => {
        //  if (sessionId) {
        //    connect();
        //  }
        //}, 5000);
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
    isConnected: connectionState === 'connected',
    error,
    gameState,
    reconnect
  };
};

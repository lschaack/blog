import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameEvent, MultiplayerGameState } from '@/app/types/multiplayer';

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

    const fetchGameState = async () => {
      if (!sessionId) return;
      try {
        const response = await fetch(`/api/exquisite-corpse/games/${sessionId}`);
        if (response.ok) {
          const state = await response.json();
          setGameState(state);
        }
      } catch (err) {
        console.error('Failed to fetch game state:', err);
      }
    };

    try {
      const url = new URL(`/api/exquisite-corpse/games/${sessionId}/connect`, window.location.origin);

      const customEventSource = new EventSource(url.toString());
      eventSourceRef.current = customEventSource;

      customEventSource.onopen = () => {
        console.log('SSE connection opened');
        setConnectionState('connected');
        setError(null);
      };

      customEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'heartbeat' || data.type === 'connected') {
            // Handle system messages
            return;
          }

          // Handle game events
          const gameEvent = data as GameEvent;
          console.log('Received game event:', gameEvent);

          // Update game state based on events or fetch fresh state
          fetchGameState();

        } catch (err) {
          console.error('Failed to parse SSE message:', err);
        }
      };

      customEventSource.onerror = (err) => {
        console.error('SSE error:', err);
        setConnectionState('error');
        setError('Connection lost');

        // FIXME:
        // Attempt to reconnect after a delay
        //reconnectTimeoutRef.current = setTimeout(() => {
        //  if (sessionId && playerId) {
        //    connect();
        //  }
        //}, 3000);
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
      // Fetch initial game state
      const fetchInitialState = async () => {
        try {
          const response = await fetch(`/api/exquisite-corpse/games/${sessionId}`);
          if (response.ok) {
            const state = await response.json();
            setGameState(state);
          }
        } catch (err) {
          console.error('Failed to fetch initial game state:', err);
        }
      };
      fetchInitialState();
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

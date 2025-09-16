import { useEffect, useRef, useState, useCallback } from 'react';
import type { MultiplayerGameState } from '@/app/types/multiplayer';

type SSEConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export type SSEConnection = {
  connectionState: SSEConnectionState;
  error: string | null;
  gameState: MultiplayerGameState | null;
  reconnect: () => void;
};

const createSSEConnection = (
  sessionId: string,
  handleGameUpdate: (dispatch: (prevState: MultiplayerGameState | null) => MultiplayerGameState) => void,
  handleError: (message: string) => void,
) => {
  return new Promise<EventSource>((resolve, reject) => {
    const url = new URL(
      `/api/exquisite-corpse/games/${sessionId}/connect`,
      window.location.origin
    );

    const customEventSource = new EventSource(url.toString());

    customEventSource.onopen = () => {
      console.log('SSE connection opened');

      resolve(customEventSource);
    };

    customEventSource.addEventListener('game_update', (event: MessageEvent<string>) => {
      try {
        const { gameState: nextGameState } = JSON.parse(event.data);

        handleGameUpdate(prevGameState => {
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

    customEventSource.onerror = (errorEvent) => {
      let errorMessage = 'Something went wrong enough that I can\'t actually tell you what it is';

      // see if there's a custom message from a predictable error state
      if ((errorEvent as MessageEvent).data) {
        try {
          const parsed = JSON.parse((errorEvent as MessageEvent).data);

          if (parsed.message) errorMessage = parsed.message;
        } finally { }
      }

      customEventSource.close();

      reject(errorMessage); // the promise has likely already resolved anyway
      handleError(errorMessage);
    };

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
  });
}

export const useSSEConnection = (
  sessionId: string,
): SSEConnection => {
  const [connectionState, setConnectionState] = useState<SSEConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);

  const eventSourceRef = useRef<EventSource>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
  }, []);

  const _connect = useCallback(async (isAutoReconnect = false) => {
    if (eventSourceRef.current) {
      cleanup();
    }

    // autoreconnect only happens on top of an existing connection and shouldn't
    // cause a render, so avoid updating status when keeping connection open
    if (!isAutoReconnect) {
      setConnectionState('connecting');
      setError(null);
    }

    try {
      const eventSource = await createSSEConnection(
        sessionId,
        setGameState,
        errorMessage => {
          setConnectionState('error');
          setError(errorMessage);
        }
      );

      if (!isAutoReconnect) {
        setConnectionState('connected');
        setError(null);
      }

      return eventSource;
    } catch (err) {
      console.error('Failed to create SSE connection:', err);

      setConnectionState('error');

      if (typeof err === 'string') {
        setError(err);
      } else {
        setError('Failed to connect');
      }

      return null;
    }
  }, [sessionId, cleanup]);

  // NOTE: try to reconnect 30s before the connection closes automatically
  // https://vercel.com/docs/functions/limitations#max-duration
  const connectWithAutoRefresh = useCallback(async (isAutoReconnect = false) => {
    try {
      const eventSource = await _connect(isAutoReconnect);

      if (eventSource) {
        eventSourceRef.current?.close();
        eventSourceRef.current = eventSource;

        // TODO: ^^^ switch to Pusher or similar
        timeoutIdRef.current = setTimeout(() => connectWithAutoRefresh(true), 1000 * 60 * 4.5);
      }
    } finally { } // _connect handles error messages
  }, [_connect]);

  // Try to notify server of disconnect when page is unloading
  useEffect(() => {
    const handleBeforeUnload = () => {
      navigator.sendBeacon(`/api/exquisite-corpse/games/${sessionId}/disconnect`);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanup();
    };
  }, [cleanup, sessionId]);

  // Initial connection and game state fetch
  useEffect(() => {
    connectWithAutoRefresh();

    return cleanup;
  }, [cleanup, connectWithAutoRefresh]);

  const reconnect = useCallback(() => {
    cleanup();
    connectWithAutoRefresh();
  }, [cleanup, connectWithAutoRefresh]);

  return {
    connectionState,
    error,
    gameState,
    reconnect
  };
};

"use client";

import { useCallback, useState } from 'react';
import { useRouter } from "next/navigation";
import clsx from 'clsx';
import { Circle, CircleDot, CircleDashed, CircleDotDashed, Share } from "lucide-react";
import { track } from '@vercel/analytics';

import { useSSEConnection } from './useSSEConnection';
import { MultiplayerCurveTurnRenderer } from './MultiplayerCurveTurnRenderer';
import { Button } from '@/app/components/Button';
import type { CurveTurn, BaseTurn } from '@/app/types/exquisiteCorpse';
import { downloadBlob } from '@/app/utils/blob';
import { leaveGame, retryAI, submitTurn } from './requests';
import { MultiplayerGameState, Player } from '../types/multiplayer';

type PlayerStatusIconProps = {
  isCurrent: boolean;
  isConnected: boolean;
}
const PlayerStatusIcon = ({ isCurrent, isConnected }: PlayerStatusIconProps) => {
  // keep all icons mounted so they crossfade on opacity change
  return (
    <div className="w-6 h-6 min-w-6 min-h-6 relative">
      <CircleDot
        className={clsx(
          "crossfade",
          isCurrent && isConnected ? "opacity-100" : "opacity-0"
        )}
      />
      <Circle
        className={clsx(
          "crossfade",
          !isCurrent && isConnected ? "opacity-100" : "opacity-0"
        )}
      />
      <CircleDotDashed
        className={clsx(
          "crossfade",
          isCurrent && !isConnected ? "opacity-100" : "opacity-0"
        )}
      />
      <CircleDashed
        className={clsx(
          "crossfade",
          !isCurrent && !isConnected ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}

type PlayerInfoProps = {
  player: Player;
  isCurrent: boolean;
  isYou: boolean;
}
const getPlayerBackground = (isCurrent: boolean, isConnected: boolean, isYou: boolean) => {
  if (isCurrent) {
    if (isYou) {
      return 'bg-amber-200';
    } else if (isConnected) {
      return 'bg-sky-200';
    } else {
      return 'bg-slate-200';
    }
  } else {
    if (isConnected) {
      return 'bg-green-200';
    } else {
      return 'bg-gray-200';
    }
  }
}
const PlayerInfo = ({ player: { name, connected: isConnected }, isCurrent, isYou }: PlayerInfoProps) => {
  return (
    <li className="flex items-center gap-1">
      <PlayerStatusIcon isCurrent={isCurrent} isConnected={isConnected} />
      <span
        className={clsx(
          'px-2 py-1 rounded text-sm',
          'overflow-hidden text-ellipsis',
          'transition-colors ease-out duration-150',
          getPlayerBackground(isCurrent, isConnected, isYou),
        )}
      >
        {name}
      </span>
    </li>
  );
}

type PlayersProps = {
  gameState: MultiplayerGameState;
  playerName: string;
}
const Players = ({ gameState, playerName }: PlayersProps) => {
  const { currentPlayer: currentPlayerName } = gameState;

  return (
    <div className="card grow max-w-full">
      <h3 className="text-lg font-semibold underline underline-offset-4">Players</h3>
      <ol className="mt-2 grid grid-rows-2 auto-cols-fr grid-flow-col gap-2">
        {Object.values(gameState.players).map(player => (
          <PlayerInfo
            key={player.name}
            player={player}
            isCurrent={player.name === currentPlayerName}
            isYou={player.name === playerName}
          />
        ))}
      </ol>
    </div>
  );
}

type ActionsProps = {
  gameState: MultiplayerGameState;
  onLeaveGame: () => void;
  onShareError: (message: string) => void;
};
export const Actions = ({ gameState, onLeaveGame, onShareError }: ActionsProps) => {
  const { sessionId } = gameState;

  const handleShareSession = useCallback(async () => {
    const message = {
      url: `${location.protocol}//${location.host}/exquisite-corpse/join?sessionId=${sessionId}`
    }

    try {
      await navigator.share(message);
    } catch (error) {
      if (error instanceof Error) {
        switch (error.name) {
          case 'AbortError': break; // this is fine
          default: {
            track('ShareError', { name: error.name, message: error.message });
            navigator.clipboard.writeText(message.url);
          }
          case 'InvalidStateError':
          case 'TypeError':
          case 'DataError': {
            onShareError('Something went wrong, copied link to clipboard')
            break;
          }
          case 'NotAllowedError': {
            onShareError('Sharing not allowed, copied link to clipboard');
            break;
          }
        }
      }
    }
  }, [onShareError, sessionId]);

  return (
    <div className="card grow-2 flex-1 flex flex-col gap-1">
      <Button
        label={
          <span className="flex justify-center items-center">
            <span>Invite&nbsp;</span>
            <Share size={16} className="inline-block" />
          </span>}
        onClick={handleShareSession}
        friendly
      />
      <Button
        label="Leave"
        onClick={onLeaveGame}
        danger
      />
    </div>
  );
}

const getStatus = (state: MultiplayerGameState, playerName: string) => {
  if (state.type === 'singleplayer') {
    if (state.currentPlayer === 'AI') {
      for (let i = state.eventLog.length - 1; i >= 0; i--) {
        const event = state.eventLog[i];

        if (event.type === 'ai_turn_failed') {
          return (
            <span>
              AI turn failed 😵&nbsp;
              <Button
                label="retry"
                onClick={() => retryAI(state.sessionId)}
              />
            </span>
          )
        } else if (event.type === 'turn_ended') {
          break;
        }
      }

      return "AI turn in progress";
    } else {
      return "It's your turn, start drawing!"
    }
  } else {
    if (state.currentPlayer === null) {
      return "Waiting on another player to join...";
    } else if (state.currentPlayer === playerName) {
      return "It's your turn, start drawing!";
    } else {
      return `Waiting on ${state.currentPlayer}`;
    }
  }
}

type GameStatusProps = {
  gameState: MultiplayerGameState;
  playerName: string;
  gameplayError?: string;
};
const GameStatus = ({ gameState, playerName }: GameStatusProps) => {
  return (
    <p className="card w-full m-auto text-center">
      {getStatus(gameState, playerName)}
    </p>
  );
}

type MultiplayerGameSessionProps = {
  sessionId: string;
  playerName?: string;
  dimensions: { width: number; height: number };
};
export const MultiplayerGameSession = ({
  sessionId,
  playerName,
  dimensions,
}: MultiplayerGameSessionProps) => {
  const SSEConnection = useSSEConnection(sessionId);
  const {
    connectionState,
    gameState,
    reconnect,
    error: connectionError,
  } = SSEConnection;

  const router = useRouter();

  const handleLeaveGame = useCallback(() => {
    leaveGame(sessionId);

    router.push('/exquisite-corpse');
  }, [sessionId, router]);

  // FIXME: !playerName error message
  if (connectionState !== 'connected' || !gameState || !playerName) {
    return (
      <div className="flex flex-col gap-4 max-w-[512px] mx-auto p-6">
        <div className="card text-center">
          <div className="font-semibold text-2xl [font-variant:all-small-caps]">
            {connectionState}
          </div>
          {connectionError && (
            <div className="text-red-600 font-semibold font-geist-mono mt-2 max-w-[30ch]">
              {connectionError}
            </div>
          )}
        </div>

        {connectionError && (
          <Button
            label="Reconnect"
            onClick={reconnect}
            className="w-full"
          />
        )}

        <Button
          label="Return to Lobby"
          onClick={handleLeaveGame}
          className="w-full"
        />
      </div>
    );
  } else {
    return (
      <ActiveSession
        sessionId={sessionId}
        playerName={playerName}
        dimensions={dimensions}
        gameState={gameState}
        handleLeaveGame={handleLeaveGame}
      />
    )
  }
}

const ActiveSession = ({
  sessionId,
  playerName,
  dimensions,
  gameState,
  handleLeaveGame,
}: MultiplayerGameSessionProps & {
  playerName: string;
  gameState: MultiplayerGameState;
  handleLeaveGame: () => void;
}) => {
  const [shareError, setShareError] = useState<string | null>(null);

  const handleSubmitTurn = useCallback((turnData: Omit<CurveTurn, keyof BaseTurn>) => {
    return submitTurn(sessionId, turnData);
  }, [sessionId]);

  const handleDownloadJSON = useCallback(() => {
    if (!gameState) return;

    const jsonString = JSON.stringify(gameState, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    downloadBlob(blob, `multiplayer-game-${sessionId}-${Date.now()}.json`);
  }, [gameState, sessionId]);

  // Show loading/connecting state
  // TODO: put this in its own component and check player name exists

  // FIXME: better handling for this case
  if (!playerName) {
    console.error('No player name')

    return null;
  }

  const isCurrentPlayer = playerName === gameState.currentPlayer;

  return (
    <div className="flex flex-col gap-4 max-w-[512px] mx-auto">
      <div className="flex flex-wrap gap-4">
        <Players
          gameState={gameState}
          playerName={playerName}
        />
        <Actions
          gameState={gameState}
          onLeaveGame={handleLeaveGame}
          onShareError={setShareError}
        />
      </div>

      <GameStatus gameState={gameState} playerName={playerName} />

      <MultiplayerCurveTurnRenderer
        handleEndTurn={handleSubmitTurn}
        readOnly={!isCurrentPlayer}
        canvasDimensions={dimensions}
        turns={gameState.turns}
        currentTurnIndex={gameState.turns.length}
      />

      <Button
        label="Download JSON"
        onClick={handleDownloadJSON}
        disabled={!gameState || gameState.turns.length === 0}
        friendly
      />
    </div>
  );
};

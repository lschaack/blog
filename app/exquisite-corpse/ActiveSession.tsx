import { useCallback, useState } from 'react';
import clsx from 'clsx';
import {
  Circle,
  CircleDot,
  CircleDashed,
  CircleDotDashed,
  Copy,
  CopyCheck,
  Share,
} from "lucide-react";
import { track } from '@vercel/analytics';
import { motion, AnimatePresence } from 'motion/react';

import { Button } from '@/app/components/Button';
import type { CurveTurn, BaseTurn } from '@/app/types/exquisiteCorpse';
import { downloadBlob } from '@/app/utils/blob';
import { retryAI, submitTurn } from './requests';
import { MultiplayerGameState, Player } from '../types/multiplayer';
import { renderPathCommandsToSvg } from '../utils/svg';
import { TurnManager } from './TurnManager';
import { CurveTurnRenderer } from './CurveTurnRenderer';
import { CurveTurnMetaRenderer } from './CurveTurnMetaRenderer';

type PlayerStatusIconProps = {
  isCurrent: boolean;
  isConnected: boolean;
}
const PlayerStatusIcon = ({ isCurrent, isConnected }: PlayerStatusIconProps) => {
  // keep all icons mounted so they crossfade on opacity change
  return (
    <AnimatePresence mode="popLayout">
      {isCurrent ? (
        isConnected ? (
          <motion.div
            key="CircleDot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <CircleDot />
          </motion.div>
        ) : (
          <motion.div
            key="CircleDotDashed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <CircleDotDashed />
          </motion.div>
        )
      ) : (
        isConnected ? (
          <motion.div
            key="Circle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Circle />
          </motion.div>
        ) : (
          <motion.div
            key="CircleDashed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <CircleDashed />
          </motion.div>
        )
      )}
    </AnimatePresence>
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
};
export const Actions = ({ gameState, onLeaveGame }: ActionsProps) => {
  const { sessionId } = gameState;

  const handleDownloadSVG = useCallback(() => {
    if (!gameState) return;

    // TODO: put dimensions in game state
    const svg = renderPathCommandsToSvg(gameState.turns.map(({ path }) => path), gameState.dimensions);
    const blob = new Blob([svg], { type: 'image/svg+xml' });

    const lastTitledTurn = gameState.turns.findLast(turn => !!turn.title);
    const title = lastTitledTurn?.title ?? `${sessionId}-${Date.now()}`;

    downloadBlob(blob, `${title}.svg`);
  }, [gameState, sessionId]);

  return (
    <div className="card grow-2 flex-1 flex flex-col gap-1">
      <Button
        label="Download SVG"
        onClick={handleDownloadSVG}
        disabled={!gameState || gameState.turns.length === 0}
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
      return "Waiting for another player to join...";
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
    <p className="card w-full m-auto text-center font-geist-mono">
      {getStatus(gameState, playerName)}
    </p>
  );
}

type CopySessionIDButtonProps = { sessionId: string };
const CopySessionIDButton = ({ sessionId }: CopySessionIDButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  }

  return (
    <div className="card flex items-center text-xl font-semibold gap-4">
      <motion.button
        className="flex items-center gap-2"
        onClick={handleCopy}
        whileHover={{ scale: 1.10 }}
        transition={{ duration: 0.1 }}
      >
        <span className="font-geist-mono font-semibold tracking-widest text-lg" >
          {sessionId}
        </span>

        <span>
          <AnimatePresence mode="wait">
            {!copied ? (
              <motion.div
                key="copy"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.1 }}
              >
                <Copy />
              </motion.div>
            ) : (
              <motion.div
                key="copied"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.1 }}
                className="text-green-600"
              >
                <CopyCheck />
              </motion.div>
            )}
          </AnimatePresence>
        </span>
      </motion.button>
    </div>
  )
}

type InviteButtonProps = {
  sessionId: string;
};
const InviteButton = ({ sessionId }: InviteButtonProps) => {
  const handleShareSession = useCallback(async () => {
    const message = {
      url: `${location.protocol}//${location.host}/exquisite-corpse/join?sessionId=${sessionId}`
    }

    // TODO: show these errors for 10s in the status panel
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
            //onShareError('Something went wrong, copied link to clipboard')
            break;
          }
          case 'NotAllowedError': {
            //onShareError('Sharing not allowed, copied link to clipboard');
            break;
          }
        }
      }
    }
  }, [sessionId]);

  return (
    <div className="card flex items-center font-semibold gap-4">
      <motion.button
        className="flex items-center gap-2"
        onClick={handleShareSession}
        whileHover={{ scale: 1.10 }}
        whileTap="tap"
        transition={{ duration: 0.1 }}
      >
        <span className="font-semibold text-lg" >
          Invite
        </span>

        <motion.div
          key="share"
          variants={{
            tap: {
              y: -6,
            }
          }}
        >
          <Share />
        </motion.div>
      </motion.button>
    </div>
  )
}

export type GameSessionProps = {
  sessionId: string;
  playerName: string;
};
export const ActiveSession = ({
  sessionId,
  playerName,
  gameState,
  handleLeaveGame,
}: GameSessionProps & {
  playerName: string;
  gameState: MultiplayerGameState;
  handleLeaveGame: () => void;
}) => {
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
    <div className="flex flex-col gap-4 max-w-xl mx-auto">
      <div className="flex justify-between gap-4">
        <CopySessionIDButton sessionId={sessionId} />
        <InviteButton sessionId={sessionId} />
      </div>

      <div className="flex flex-wrap gap-4">
        <Players
          gameState={gameState}
          playerName={playerName}
        />
        <Actions
          gameState={gameState}
          onLeaveGame={handleLeaveGame}
        />
      </div>

      <GameStatus gameState={gameState} playerName={playerName} />

      <TurnManager<CurveTurn>
        handleAddPath={path => handleSubmitTurn({ path })}
        readOnly={!isCurrentPlayer}
        dimensions={gameState.dimensions}
        turns={gameState.turns}
        TurnRenderer={CurveTurnRenderer}
        TurnMetaRenderer={CurveTurnMetaRenderer}
      />

      {process.env.NODE_ENV === 'development' && (
        <Button
          label="Download JSON"
          onClick={handleDownloadJSON}
          disabled={!gameState || gameState.turns.length === 0}
          friendly
        />
      )}
    </div>
  );
};

import { useState } from 'react';
import type { GameType } from '@/app/types/multiplayer';
import { LobbyMenu } from './LobbyMenu';
import { CreateGameForm } from './CreateGameForm';
import { JoinGameForm } from './JoinGameForm';

type LobbyMode = 'menu' | 'create' | 'join';

type GameLobbyProps = {
  onGameJoined: (sessionId: string, playerId: string) => void;
};

export const GameLobby = ({ onGameJoined }: GameLobbyProps) => {
  const [mode, setMode] = useState<LobbyMode>('menu');
  const [gameType, setGameType] = useState<GameType>('singleplayer');

  const handleCreateGame = (selectedGameType: GameType) => {
    setGameType(selectedGameType);
    setMode('create');
  };

  const handleJoinGame = () => {
    setMode('join');
  };

  const handleBack = () => {
    setMode('menu');
  };

  if (mode === 'menu') {
    return (
      <LobbyMenu
        onCreateGame={handleCreateGame}
        onJoinGame={handleJoinGame}
      />
    );
  }

  if (mode === 'create') {
    return (
      <CreateGameForm
        gameType={gameType}
        onBack={handleBack}
        onGameCreated={onGameJoined}
      />
    );
  }

  if (mode === 'join') {
    return (
      <JoinGameForm
        onBack={handleBack}
        onGameJoined={onGameJoined}
      />
    );
  }

  return null;
};

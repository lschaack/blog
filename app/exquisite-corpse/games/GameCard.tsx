"use client";

import { motion } from 'motion/react';

import { MultiplayerGameState } from "@/app/types/multiplayer"
import { renderPathCommandsToSvg } from "@/app/utils/svg";
import { useMemo } from 'react';

type GameCardProps = {
  gameData: MultiplayerGameState,
}
export function GameCard({ gameData }: GameCardProps) {
  const svg = useMemo(() => renderPathCommandsToSvg(
    gameData.turns.map(turn => turn.path),
    gameData.dimensions,
    0.5
  ), [gameData.dimensions, gameData.turns]);

  return (
    <motion.a
      href={`/exquisite-corpse/games/${gameData.gameId}`}
      className="card p-0! block"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 1 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

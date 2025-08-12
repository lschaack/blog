"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useGameContext } from "./GameContext";
import { BaseTurn, SerializableGameState } from "./types";
import { Button } from '@/app/components/Button';

export const StateEditor = <T extends BaseTurn>() => {
  const gameState = useGameContext<T>();
  const [jsonText, setJsonText] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Create serializable game state for JSON editor
  const serializableGameState: SerializableGameState<T> = useMemo(() => ({
    turns: gameState.turns
  }), [gameState.turns]);

  // Update JSON text when game state changes
  const gameStateJSON = useMemo(() => {
    return JSON.stringify(serializableGameState, null, 2);
  }, [serializableGameState]);

  useEffect(() => {
    setJsonText(gameStateJSON);
    setJsonError(null);
  }, [gameStateJSON]);

  const handleSyncFromJSON = useCallback(() => {
    try {
      const parsedState = JSON.parse(jsonText) as SerializableGameState<T>;

      // Validate structure
      if (!parsedState.turns || !Array.isArray(parsedState.turns)) {
        throw new Error("Invalid game state: 'turns' must be an array");
      }

      // Validate turn structure
      parsedState.turns.forEach((turn, index) => {
        if (!turn.author || !['user', 'ai'].includes(turn.author)) {
          throw new Error(`Turn ${index + 1}: 'author' must be 'user' or 'ai'`);
        }
        if (typeof turn.number !== 'number') {
          throw new Error(`Turn ${index + 1}: 'number' must be a number`);
        }
        if (!turn.timestamp || typeof turn.timestamp !== 'string') {
          throw new Error(`Turn ${index + 1}: 'timestamp' must be a string`);
        }
        
        // Validate specific turn types
        if ('line' in turn) {
          if (!turn.line || !Array.isArray(turn.line)) {
            throw new Error(`Turn ${index + 1}: 'line' must be an array`);
          }
        } else if ('image' in turn) {
          if (!turn.image || typeof turn.image !== 'string') {
            throw new Error(`Turn ${index + 1}: 'image' must be a string`);
          }
        } else {
          throw new Error(`Turn ${index + 1}: must have either 'line' or 'image' property`);
        }
      });

      // Dispatch restore action
      gameState.dispatch({ type: "restore", payload: parsedState });
      setJsonError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid JSON format";
      setJsonError(errorMessage);
    }
  }, [jsonText, gameState]);

  const handleResetToCurrentState = useCallback(() => {
    setJsonText(gameStateJSON);
    setJsonError(null);
  }, [gameStateJSON]);

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded">
      <h3 className="font-semibold mb-2">Game State (JSON)</h3>
      <textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        className={`w-full h-64 p-2 font-mono text-sm border rounded resize-y ${
          jsonError ? 'border-red-500 bg-red-50' : 'border-gray-300'
        }`}
        placeholder="Game state will appear here..."
      />
      {jsonError && (
        <div className="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded">
          Error: {jsonError}
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <Button
          label="Sync from JSON"
          onClick={handleSyncFromJSON}
          className="flex-1"
          disabled={!jsonText.trim()}
        />
        <Button
          label="Reset to Current"
          onClick={handleResetToCurrentState}
          className="flex-1"
        />
      </div>
    </div>
  );
};
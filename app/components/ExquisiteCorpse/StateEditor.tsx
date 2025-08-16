"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useGameContext } from "./GameContext";
import { BaseTurn, ExportedGameState, SerializableGameState } from "@/app/types/exquisiteCorpse";
import { Button } from '@/app/components/Button';

export const StateEditor = <T extends BaseTurn>() => {
  const gameState = useGameContext<T>();
  const [jsonText, setJsonText] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

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
      const parsedState = JSON.parse(jsonText) as SerializableGameState<T> | ExportedGameState<T>;

      const restoredState = 'gameState' in parsedState
        ? parsedState.gameState
        : parsedState;

      // Dispatch restore action
      gameState.dispatch({ type: "restore", payload: restoredState });
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'));

    if (!jsonFile) {
      setJsonError('Please drop a JSON file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setJsonText(content);
        setJsonError(null);
      } catch (error) {
        setJsonError('Failed to read file');
      }
    };
    reader.readAsText(jsonFile);
  }, []);

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded">
      <h3 className="font-semibold mb-2">Game State (JSON)</h3>
      <textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full h-64 p-2 font-mono text-sm border rounded resize-y transition-colors ${
          jsonError 
            ? 'border-red-500 bg-red-50' 
            : isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300'
        }`}
        placeholder="Game state will appear here... (or drag and drop a JSON file)"
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

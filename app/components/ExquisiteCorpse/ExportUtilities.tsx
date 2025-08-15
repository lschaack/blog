import { useCallback } from "react";
import { useGameContext } from "./GameContext";
import { BaseTurn, RenderPNG } from "@/app/types/exquisiteCorpse";
import { Button } from '@/app/components/Button';
import { ensureStartsWith } from "@/app/utils/string";

// PNG export utility
const exportToPNG = (base64: string): void => {
  const a = document.createElement("a");
  a.href = ensureStartsWith(base64, 'data:image/png;base64,');
  a.download = "sketch.png";
  a.click();
};

// JSON export utility
const exportToJSON = <T extends BaseTurn>(gameState: { turns: T[] }): void => {
  const exportData = {
    version: 1,
    timestamp: Date.now(),
    gameState: {
      turns: gameState.turns
    }
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `exquisite-corpse-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

type ExportUtilitiesProps<Turn extends BaseTurn> = {
  renderPNG: RenderPNG<Turn>;
}
export const ExportUtilities = <T extends BaseTurn>({ renderPNG }: ExportUtilitiesProps<T>) => {
  const gameState = useGameContext<T>();

  const handleExportPNG = () => {
    renderPNG(gameState.turns, gameState.currentTurnIndex).then(exportToPNG);
  }

  const handleExportJSON = useCallback(() => {
    exportToJSON(gameState);
  }, [gameState]);

  return (
    <div className="flex gap-2">
      <Button
        label="Export JSON"
        onClick={handleExportJSON}
        className="flex-1"
      />
      <Button
        label="Render PNG"
        onClick={handleExportPNG}
        className="flex-1"
      />
    </div>
  );
};

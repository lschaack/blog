"use client";

import { useState, useCallback, useMemo } from "react";
import { Sketchpad } from "./Sketchpad";
import { Button } from '@/app/components/Button';
import { useHistory } from './useUndoRedo';
import { Path } from "@/app/types/exquisiteCorpse";
import { renderPathCommandsToSvg } from '@/app/utils/svg';
import { downloadBlob } from "@/app/utils/blob";

export const TrainingInterface = () => {
  // Form state
  const [exampleName, setExampleName] = useState<string>("");
  const [interpretation, setInterpretation] = useState<string>("");
  const [reasoning, setReasoning] = useState<string>("");

  // Undo/Redo state for line management
  const {
    current: currentLine,
    setCurrent: setCurrentLine,
    undo,
    redo,
    canUndo,
    canRedo,
    clear: clearLines
  } = useHistory<Path[]>([]);

  // Canvas dimensions (consistent with Game component)
  const canvasDimensions = useMemo(() => ({ width: 512, height: 512 }), []);


  // Handler for adding lines from Sketchpad
  const handleAddLine = useCallback((newLine: Path) => {
    setCurrentLine([...currentLine, newLine]);
  }, [currentLine, setCurrentLine]);

  // Generate and download JSON file
  const handleDownloadExample = useCallback(async () => {
    if (!exampleName.trim() || !interpretation.trim() || !reasoning.trim() || currentLine.length === 0) {
      alert("Please fill in all fields and draw at least one line before downloading.");
      return;
    }

    try {
      // Get all lines except the last one for gameState
      const allLinesExceptLast = currentLine.slice(0, -1);
      const lastLine = currentLine[currentLine.length - 1];

      // Generate SVG for gameState (all lines except the last)
      const gameState = renderPathCommandsToSvg(allLinesExceptLast, canvasDimensions);

      // Create JSON structure
      const jsonData = {
        history: currentLine,
        example: {
          gameState,
          response: {
            interpretation: interpretation.trim(),
            reasoning: reasoning.trim(),
            path: lastLine.map(command => command.join(' ')).join(' '),
            title: exampleName.trim(),
          }
        }
      };

      // Create and download file
      const jsonContent = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });

      downloadBlob(blob, `training-example-${exampleName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.json`);
    } catch (error) {
      console.error('Failed to generate training example:', error);
      alert('Failed to generate training example. Please try again.');
    }
  }, [exampleName, interpretation, reasoning, currentLine, canvasDimensions]);

  // Clear all fields and drawing
  const handleClear = useCallback(() => {
    setExampleName("");
    setInterpretation("");
    setReasoning("");
    clearLines();
  }, [clearLines]);


  return (
    <div className="flex flex-col gap-4 max-w-[512px]">
      <div className="text-center p-2 bg-gray-100 rounded">
        <div className="font-semibold">Training Data Generator</div>
        <div className="text-sm text-gray-600">Create examples for AI few-shot training</div>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div>
          <label htmlFor="example-name" className="block text-sm font-medium text-gray-700 mb-1">
            Example Name
          </label>
          <input
            id="example-name"
            type="text"
            value={exampleName}
            onChange={(e) => setExampleName(e.target.value)}
            placeholder="e.g., 'Simple Cat Drawing'"
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="interpretation" className="block text-sm font-medium text-gray-700 mb-1">
            Interpretation
          </label>
          <textarea
            id="interpretation"
            value={interpretation}
            onChange={(e) => setInterpretation(e.target.value)}
            placeholder="Describe what this drawing represents and any important details..."
            rows={3}
            className="w-full p-2 border border-gray-300 rounded resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="reasoning" className="block text-sm font-medium text-gray-700 mb-1">
            Reasoning
          </label>
          <textarea
            id="reasoning"
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Describe your last change and why it adds to your interpretation..."
            rows={3}
            className="w-full p-2 border border-gray-300 rounded resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Drawing area */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Drawing
        </label>

        <Sketchpad
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          lines={currentLine}
          handleAddLine={handleAddLine}
        />
      </div>

      {/* Undo/Redo controls */}
      <div className="flex gap-2">
        <Button
          label="Undo"
          onClick={undo}
          disabled={!canUndo}
          className="flex-1"
        />
        <Button
          label="Redo"
          onClick={redo}
          disabled={!canRedo}
          className="flex-1"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          label="Clear All"
          onClick={handleClear}
          disabled={!exampleName && !interpretation && !reasoning && currentLine.length === 0}
          className="flex-1"
        />
        <Button
          label="Download Example"
          onClick={handleDownloadExample}
          disabled={!exampleName.trim() || !interpretation.trim() || !reasoning.trim() || currentLine.length === 0}
          className="flex-1"
        />
      </div>

      {/* Current status */}
      <div className="p-3 bg-gray-50 rounded text-sm">
        <div className="space-y-1">
          <div>
            <span className="font-medium">Name:</span> {exampleName || <span className="text-gray-400">Not set</span>}
          </div>
          <div>
            <span className="font-medium">Interpretation:</span> {interpretation || <span className="text-gray-400">Not set</span>}
          </div>
          <div>
            <span className="font-medium">Reasoning:</span> {reasoning || <span className="text-gray-400">Not set</span>}
          </div>
          <div>
            <span className="font-medium">Lines drawn:</span> {currentLine.length}
          </div>
          <div>
            <span className="font-medium">Total curves:</span> {currentLine.reduce((total, line) => total + line.length, 0)}
          </div>
        </div>
      </div>

    </div>
  );
};


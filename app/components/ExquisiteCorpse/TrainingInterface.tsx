"use client";

import { useState, useCallback, useMemo } from "react";
import { Sketchpad, Line } from "./Sketchpad";
import { Button } from '@/app/components/Button';
import { useUndoRedo } from './useUndoRedo';
import { renderGameStateToBase64 } from './imageContext';

export const TrainingInterface = () => {
  // Form state
  const [exampleName, setExampleName] = useState<string>("");
  const [exampleDescription, setExampleDescription] = useState<string>("");

  // Undo/Redo state for line management
  const {
    current: currentLine,
    setCurrent: setCurrentLine,
    undo,
    redo,
    canUndo,
    canRedo,
    clear: clearLines
  } = useUndoRedo<Line[]>([]);

  // Canvas dimensions (consistent with Game component)
  const canvasDimensions = useMemo(() => ({ width: 512, height: 512 }), []);

  // Handler for adding lines from Sketchpad
  const handleAddLine = useCallback((newLines: Line[]) => {
    setCurrentLine(newLines);
  }, [setCurrentLine]);

  // Generate and download XML file
  const handleDownloadExample = useCallback(async () => {
    if (!exampleName.trim() || !exampleDescription.trim() || currentLine.length === 0) {
      alert("Please fill in all fields and draw at least one line before downloading.");
      return;
    }

    try {
      // Generate base64 image
      const base64Image = await renderGameStateToBase64(
        currentLine,
        canvasDimensions.width,
        canvasDimensions.height
      );

      // Generate XML content with image
      const xmlContent = generateXML(
        exampleName.trim(), 
        exampleDescription.trim(), 
        currentLine, 
        base64Image
      );

      // Create and download file
      const blob = new Blob([xmlContent], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `training-example-${exampleName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate training example:', error);
      alert('Failed to generate training example. Please try again.');
    }
  }, [exampleName, exampleDescription, currentLine, canvasDimensions]);

  // Clear all fields and drawing
  const handleClear = useCallback(() => {
    setExampleName("");
    setExampleDescription("");
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
          <label htmlFor="example-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="example-description"
            value={exampleDescription}
            onChange={(e) => setExampleDescription(e.target.value)}
            placeholder="Describe what this drawing represents and any important details..."
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
          disabled={!exampleName && !exampleDescription && currentLine.length === 0}
          className="flex-1"
        />
        <Button
          label="Download Example"
          onClick={handleDownloadExample}
          disabled={!exampleName.trim() || !exampleDescription.trim() || currentLine.length === 0}
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
            <span className="font-medium">Description:</span> {exampleDescription || <span className="text-gray-400">Not set</span>}
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

// Generate XML content for the training example
const generateXML = (name: string, description: string, lines: Line[], base64Image: string): string => {
  const xmlLines = lines.map(line => {
    const curves = line.map(curve => {
      // Format: [[startX, startY], [cp1X, cp1Y], [cp2X, cp2Y], [endX, endY]]
      const [start, cp1, cp2, end] = curve;
      return `      <BezierCurve>[[${start[0]}, ${start[1]}], [${cp1[0]}, ${cp1[1]}], [${cp2[0]}, ${cp2[1]}], [${end[0]}, ${end[1]}]]</BezierCurve>`;
    }).join('\n');

    return `    <Line>
${curves}
    </Line>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Example>
  <Name>${escapeXml(name)}</Name>
  <Description>${escapeXml(description)}</Description>
  <Image>${base64Image}</Image>
${xmlLines}
</Example>`;
};

// Escape special XML characters
const escapeXml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

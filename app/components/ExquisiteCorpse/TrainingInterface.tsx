"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { Sketchpad } from "./Sketchpad";
import { Button } from '@/app/components/Button';
import { useUndoRedo } from './useUndoRedo';
import { renderGameStateToBase64 } from './imageContext';
import { BezierCurve, Line } from "@/app/types/exquisiteCorpse";

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

  // File input ref for converter
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Load existing training example file for editing
  const handleLoadFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xml')) {
      alert('Please select an XML file.');
      return;
    }

    try {
      const xmlText = await file.text();
      const parsedData = parseXML(xmlText);

      if (!parsedData) {
        alert('Failed to parse XML file. Please ensure it\'s a valid training example.');
        return;
      }

      // Load the data into the form for editing
      setExampleName(parsedData.name);
      setExampleDescription(parsedData.description);
      setCurrentLine(parsedData.lines);

      alert('Example loaded successfully! You can now edit and save it.');
    } catch (error) {
      console.error('Failed to load file:', error);
      alert('Failed to load file. Please check the file format and try again.');
    }

    // Reset file input
    event.target.value = '';
  }, [setCurrentLine]);

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

      {/* Load existing example section */}
      <div className="border-t pt-4">
        <div className="text-center p-2 bg-green-50 rounded mb-2">
          <div className="font-semibold text-green-800">Load & Edit</div>
          <div className="text-sm text-green-600">Load an existing training example file for editing</div>
        </div>

        <Button
          label="Load Example File"
          onClick={handleLoadFile}
          className="w-full"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".xml"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

// Parse XML format training example (supports both old and new formats)
type ParsedTrainingExample = {
  name: string;
  description: string;
  lines: Line[];
};

const parseXML = (xmlText: string): ParsedTrainingExample | null => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Check for parser errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error('XML parsing error:', parserError.textContent);
      return null;
    }

    const example = xmlDoc.querySelector('Example');
    if (!example) {
      console.error('No Example element found');
      return null;
    }

    // Extract name and description
    const nameElement = example.querySelector('Name');
    const descriptionElement = example.querySelector('Description');

    if (!nameElement || !descriptionElement) {
      console.error('Missing Name or Description element');
      return null;
    }

    const name = nameElement.textContent?.trim() || '';
    const description = descriptionElement.textContent?.trim() || '';

    // Extract lines and curves
    const lineElements = example.querySelectorAll('Line');
    const lines: Line[] = [];

    for (const lineElement of lineElements) {
      const curveElements = lineElement.querySelectorAll('BezierCurve');
      const curves: BezierCurve[] = [];

      for (const curveElement of curveElements) {
        const curveText = curveElement.textContent?.trim();
        if (!curveText) continue;

        try {
          // Parse the curve format: [[startX, startY], [cp1X, cp1Y], [cp2X, cp2Y], [endX, endY]]
          const curveData = JSON.parse(curveText) as BezierCurve;

          // Validate curve structure
          if (Array.isArray(curveData) && curveData.length === 4 &&
            curveData.every(point => Array.isArray(point) && point.length === 2)) {
            curves.push(curveData);
          } else {
            console.warn('Invalid curve data:', curveData);
          }
        } catch (error) {
          console.warn('Failed to parse curve:', curveText, error);
        }
      }

      if (curves.length > 0) {
        lines.push(curves);
      }
    }

    if (lines.length === 0) {
      console.error('No valid lines found in XML');
      return null;
    }

    return { name, description, lines };
  } catch (error) {
    console.error('Failed to parse XML:', error);
    return null;
  }
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

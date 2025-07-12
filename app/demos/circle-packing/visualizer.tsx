'use client'

import React, { useRef, useEffect, useState } from 'react';
import { CirclePacker } from '@/app/utils/circlePacker';
import { Circle } from '@timohausmann/quadtree-ts';

interface Sector {
  startAngle: number;
  endAngle: number;
  width: number;
}

interface PackingState {
  circles: Circle[];
  currentCircle?: Circle;
  unoccupiedSectors?: Sector[];
}

interface CanvasVisualizerProps {
  width?: number;
  height?: number;
  minRadius?: number;
  maxRadius?: number;
}

export default function CirclePackerVisualizer({
  width = 1024,
  height = 1024,
  minRadius = 16,
  maxRadius = 256,
}: CanvasVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [currentCircle, setCurrentCircle] = useState<Circle | undefined>();
  const [unoccupiedSectors, setUnoccupiedSectors] = useState<Sector[]>([]);
  const [showSectors, setShowSectors] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [params, setParams] = useState({
    width,
    height,
    minRadius,
    maxRadius
  });

  const generateCircles = React.useCallback(async () => {
    setIsGenerating(true);
    try {
      const onAddCircle = async (state: Partial<PackingState>) => {
        if (state.circles) setCircles([...state.circles]);
        if (state.currentCircle) setCurrentCircle(state.currentCircle);
        if (state.unoccupiedSectors) setUnoccupiedSectors([...state.unoccupiedSectors]);

        // Small delay to allow rendering
        await new Promise(resolve => setTimeout(resolve, 20));
      };

      const packer = new CirclePacker(params, onAddCircle, 2);
      const packedCircles = await packer.pack();
      setCircles(packedCircles);
    } catch (error) {
      console.error('Error generating circles:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [params]);

  const drawCircles = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw boundary
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, params.width, params.height);

    // Draw unoccupied sectors for current circle
    if (showSectors && currentCircle && unoccupiedSectors.length > 0) {
      ctx.save();
      unoccupiedSectors.forEach((sector, index) => {
        ctx.beginPath();
        ctx.moveTo(currentCircle.x, currentCircle.y);
        ctx.arc(
          currentCircle.x,
          currentCircle.y,
          currentCircle.r + params.maxRadius,
          sector.startAngle,
          sector.endAngle
        );
        ctx.closePath();

        // Use different colors for each sector
        const hue = (index * 60) % 360;
        ctx.fillStyle = `hsla(${hue}, 50%, 80%, 0.3)`;
        ctx.fill();

        ctx.strokeStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      ctx.restore();
    }

    // Highlight current circle
    if (currentCircle) {
      ctx.beginPath();
      ctx.arc(currentCircle.x, currentCircle.y, currentCircle.r, 0, 2 * Math.PI);
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Draw circles
    circles.forEach((circle, index) => {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.r, 0, 2 * Math.PI);

      // Use different colors for visual distinction
      const hue = (index * 137.5) % 360;
      const isNotLast = index < circles.length - 1;
      ctx.fillStyle = `hsla(${hue}, ${isNotLast ? '70%, 60%' : '100%, 95%'}, 0.7)`;
      ctx.fill();

      ctx.strokeStyle = `hsl(${hue}, 70%, 40%)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw circle count
    ctx.fillStyle = '#333';
    ctx.font = '16px monospace';
    ctx.fillText(`Circles: ${circles.length}`, 10, 25);
    if (currentCircle) {
      ctx.fillText(`Sectors: ${unoccupiedSectors.length}`, 10, 45);
    }
  }, [circles, currentCircle, unoccupiedSectors, showSectors, params]);

  useEffect(() => {
    drawCircles();
  }, [drawCircles]);

  useEffect(() => {
    generateCircles();
  }, [generateCircles]);

  return (
    <div className="flex flex-col gap-4 p-4" >
      <div className="flex flex-wrap gap-4 items-center" >
        <div className="flex items-center gap-2" >
          <label htmlFor="width" className="text-sm font-medium" > Width: </label>
          < input
            id="width"
            type="number"
            value={params.width}
            onChange={(e) => setParams(prev => ({ ...prev, width: Number(e.target.value) }))
            }
            className="w-20 px-2 py-1 border rounded"
            min="100"
            max="1200"
          />
        </div>

        < div className="flex items-center gap-2" >
          <label htmlFor="height" className="text-sm font-medium" > Height: </label>
          < input
            id="height"
            type="number"
            value={params.height}
            onChange={(e) => setParams(prev => ({ ...prev, height: Number(e.target.value) }))}
            className="w-20 px-2 py-1 border rounded"
            min="100"
            max="900"
          />
        </div>

        < div className="flex items-center gap-2" >
          <label htmlFor="minRadius" className="text-sm font-medium" > Min Radius: </label>
          < input
            id="minRadius"
            type="number"
            value={params.minRadius}
            onChange={(e) => setParams(prev => ({ ...prev, minRadius: Number(e.target.value) }))}
            className="w-20 px-2 py-1 border rounded"
            min="1"
            max="50"
          />
        </div>

        < div className="flex items-center gap-2" >
          <label htmlFor="maxRadius" className="text-sm font-medium" > Max Radius: </label>
          < input
            id="maxRadius"
            type="number"
            value={params.maxRadius}
            onChange={(e) => setParams(prev => ({ ...prev, maxRadius: Number(e.target.value) }))}
            className="w-20 px-2 py-1 border rounded"
            min="2"
            max="100"
          />
        </div>

        < button
          onClick={generateCircles}
          disabled={isGenerating}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isGenerating ? 'Generating...' : 'Generate New'}
        </button>

        < button
          onClick={() => setShowSectors(!showSectors)}
          className={`px-4 py-2 rounded ${showSectors ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'} text-white`}
        >
          {showSectors ? 'Hide Sectors' : 'Show Sectors'}
        </button>
      </div>

      < div className="border rounded overflow-hidden self-center" >
        <canvas
          ref={canvasRef}
          width={params.width}
          height={params.height}
          className="block"
        />
      </div>

      < div className="text-sm text-gray-600" >
        <p>Generated {circles.length} circles </p>
        < p > Area coverage: {
          circles.length > 0 ?
            ((circles.reduce((sum, c) => sum + Math.PI * c.r * c.r, 0) / (params.width * params.height)) * 100).toFixed(1)
            : 0
        }% </p>
      </div>
    </div>
  );
}


'use client'

import React, { useRef, useEffect, useState, FC, useCallback } from 'react';
import { CirclePacker, PackingState } from '@/app/utils/circlePacker';
import { InputNumber } from '@/app/components/InputNumber';
import { Button } from '@/app/components/Button';

type CirclePackerOptions = {
  width: number;
  height: number;
  minRadius: number;
  maxRadius: number;
}

type PackedCirclesProps = Partial<CirclePackerOptions>

const DEFAULT_CIRCLE_PACKER_OPTIONS: CirclePackerOptions = {
  width: 512,
  height: 512,
  minRadius: 16,
  maxRadius: 128,
}

//const PackedCircles: FC<PackedCirclesProps> = ({
//  width = 1024,
//  height = 1024,
//  minRadius = 16,
//  maxRadius = 256,
//}) => {
//  return (
//    <div className="border rounded overflow-hidden self-center" >
//      <canvas
//        ref={canvasRef}
//        width={params.width}
//        height={params.height}
//        className="block"
//      />
//    </div>
//  )
//}

const drawCircles = (state: CirclePacker['state'], canvas: HTMLCanvasElement, params: CirclePackerOptions) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { circles, currentCircle, unoccupiedSectors } = state;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw boundary
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, params.width, params.height);

  // Draw unoccupied sectors for current circle
  if (currentCircle && unoccupiedSectors.length > 0) {
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
};

export default function CirclePackerVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState(DEFAULT_CIRCLE_PACKER_OPTIONS);

  const onUpdate = useCallback((state: PackingState) => {
    if (canvasRef.current) {
      drawCircles(state, canvasRef.current, options);
      // Small delay to allow rendering
      return new Promise<void>(resolve => setTimeout(resolve, 20));
    }

    return Promise.resolve();
  }, [options]);

  const [packer, setPacker] = useState<CirclePacker>(new CirclePacker(
    DEFAULT_CIRCLE_PACKER_OPTIONS,
    'pop',
    undefined,
    onUpdate,
    2,
  ));

  const generateCircles = useCallback(() => {
    setPacker(new CirclePacker(
      options,
      'pop',
      undefined,
      onUpdate,
      2,
    ));
  }, [onUpdate, options]);

  useEffect(() => {
    setIsGenerating(true);

    packer.pack().then(() => setIsGenerating(false));
  }, [packer]);

  const coverage = packer
    ? ((packer.state.circles
      .reduce((sum, c) => sum + Math.PI * c.r * c.r, 0) / (options.width * options.height)) * 100)
      .toFixed(1)
    : 0;

  return (
    <div className="flex flex-col gap-4 p-4 max-w-full" >
      <div className="flex flex-wrap gap-12 items-center justify-between" >
        <InputNumber
          id="width"
          label="Width"
          value={options.width}
          onChange={nextValue => setOptions(prev => ({ ...prev, width: Number(nextValue) }))}
          min={100}
          max={1200}
        />

        <InputNumber
          id="height"
          label="Height"
          value={options.height}
          onChange={nextValue => setOptions(prev => ({ ...prev, height: Number(nextValue) }))}
          min={100}
          max={1200}
        />

        <InputNumber
          id="minRadius"
          label="Min radius"
          value={options.minRadius}
          onChange={nextValue => setOptions(prev => ({ ...prev, minRadius: Number(nextValue) }))}
          min={1}
          max={32}
        />

        <InputNumber
          id="maxRadius"
          label="Max radius"
          value={options.maxRadius}
          onChange={nextValue => setOptions(prev => ({ ...prev, maxRadius: Number(nextValue) }))}
          min={64}
          max={256}
        />
      </div>

      <Button
        onClick={generateCircles}
        label={isGenerating ? 'Generating...' : 'Generate New'}
        disabled={isGenerating}
      />

      <Button
        onClick={packer.cancel}
        label="Cancel"
        disabled={!isGenerating}
      />

      <div className="border rounded overflow-hidden self-center" >
        <canvas
          ref={canvasRef}
          width={options.width}
          height={options.height}
          className="block"
        />
      </div>

      <div className="text-sm text-gray-600">
        <p>Generated {packer?.state.circles.length ?? 0} circles</p>
        <p>Area coverage: {coverage}%</p>
      </div>
    </div>
  );
}


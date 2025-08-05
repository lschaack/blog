"use client";

import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import clamp from "lodash/clamp";

import { PackingStrategy, RandomStrategy } from "@/app/utils/circlePacker";
import { BubbleField } from "@/app/utils/BubbleField";
import { magnitude } from "@/app/utils/mutableVector";
import { useAnimationFrames } from "@/app/hooks/useAnimationFrames";
import { useResizeValue } from "@/app/hooks/useResizeValue";

const STROKE_WIDTH = 16;

const virginiaSky400 = {
  r: 74,
  g: 125,
  b: 205,
};

const saguaro300 = {
  r: 161,
  g: 218,
  b: 98,
};

const pricklyPear300 = {
  r: 240,
  g: 117,
  b: 181,
};

const triangle = (x: number) => 1 - Math.abs(clamp(x * 2, -1, 1));

const getColor = (pos: number) => {
  const first = triangle(pos);
  const second = triangle(pos - 0.5);
  const third = triangle(pos - 1);

  return {
    r: virginiaSky400.r * first + saguaro300.r * second + pricklyPear300.r * third,
    g: virginiaSky400.g * first + saguaro300.g * second + pricklyPear300.g * third,
    b: virginiaSky400.b * first + saguaro300.b * second + pricklyPear300.b * third,
  }
}

const drawBubbles = (bubbleField: BubbleField, canvas: HTMLCanvasElement) => {
  if (!bubbleField || !canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // FIXME: Don't calculate this every frame for every bubble
  const diagonalLength = magnitude([canvas.width, canvas.height]);
  const allBubbles = bubbleField.getAllBubbles();

  // Draw each bubble
  for (const bubble of allBubbles) {
    const presentation = bubble.getPresentation();
    const outerRectangle = presentation.getOuterRectangle();

    // Calculate position for gradient (using original center position)
    const centerX = presentation.getX() + presentation.getWidth() / 2;
    const centerY = presentation.getY() + presentation.getHeight() / 2;
    const pos = magnitude([centerX, centerY]) / diagonalLength;
    const color = getColor(pos);
    const radiusX = outerRectangle.width / 2;
    const radiusY = outerRectangle.height / 2;

    // Draw bubble as rounded rectangle
    ctx.beginPath();
    ctx.ellipse(
      outerRectangle.x + radiusX,
      outerRectangle.y + radiusY,
      Math.max(0, radiusX - STROKE_WIDTH / 2),
      Math.max(0, radiusY - STROKE_WIDTH / 2),
      0,
      0,
      2 * Math.PI,
    );

    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    ctx.fill();

    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.stroke();
  }
};


export type PackedBubbleProps = {
  seed: number;
  packingStrategy: PackingStrategy;
  randomStrategy: RandomStrategy;
  maxWidth: number;
  minRadius: number;
  ratio: number;
  dpi: number;
}
export const PackedBubbles: FC<PackedBubbleProps> = ({
  seed,
  packingStrategy,
  randomStrategy,
  minRadius,
  ratio,
  maxWidth,
  dpi,
}) => {
  const [bubbleField, setBubbleField] = useState<BubbleField | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const packingArea = useMemo(
    () => ({
      width: maxWidth * dpi,
      height: maxWidth * dpi,
      minRadius: minRadius * dpi,
      maxRadius: Math.round(minRadius * ratio) * dpi,
    }),
    [dpi, maxWidth, minRadius, ratio]
  );

  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const prevCanvas = useRef<HTMLCanvasElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const canvasRect = useResizeValue(
    useCallback(() => canvas.current?.getBoundingClientRect(), []),
    undefined,
    useCallback(() => [document.documentElement], []),
  )

  // Initialize BubbleField when container dimensions are available
  useEffect(() => {
    const field = new BubbleField({
      seed,
      packingStrategy,
      randomStrategy,
      packingArea,
    });

    field.initialize().then(() => {
      setBubbleField(field);
    });
  }, [dpi, maxWidth, minRadius, packingArea, packingStrategy, randomStrategy, ratio, seed]);

  // Animation loop
  useAnimationFrames(
    (deltaTime) => {
      if (!bubbleField || !canvas.current) return;

      bubbleField.step(deltaTime);
      drawBubbles(bubbleField, canvas.current);

      // Stop animation if no active bubbles
      if (bubbleField.getActiveBubblesCount() === 0) {
        setIsAnimating(false);
      }
    },
    isAnimating
  );

  // Mouse move handler
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!bubbleField || !canvasRect) return;
    const currentX = event.clientX - canvasRect.left;
    const currentY = event.clientY - canvasRect.top;

    bubbleField.handleMouseMove(
      currentX * dpi,
      currentY * dpi,
      lastMousePos.current.x * dpi,
      lastMousePos.current.y * dpi,
    );

    lastMousePos.current.x = currentX;
    lastMousePos.current.y = currentY;

    // Start animation if there are active bubbles
    if (bubbleField.getActiveBubblesCount() > 0) {
      setIsAnimating(true);
    }
  }, [bubbleField, canvasRect, dpi]);

  // Avoid edge case where frame is cleared w/o redrawing on prop change
  useEffect(() => {
    if (bubbleField && canvas.current) {
      bubbleField.step(0);
      drawBubbles(bubbleField, canvas.current);
    }
  }, [bubbleField]);

  prevCanvas.current = canvas.current;

  return (
    <div
      ref={container}
      className="relative aspect-square w-full bg-transparent"
      style={{ maxWidth }}
    >
      <canvas
        ref={canvas}
        width={packingArea.width}
        height={packingArea.height}
        style={{
          maxWidth: maxWidth,
          maxHeight: maxWidth,
        }}
        onMouseMove={handleMouseMove}
      />
    </div>
  );
}

"use client";

import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import clamp from "lodash/clamp";

import { PackingStrategy, RandomStrategy } from "@/app/utils/circlePacker";
import { BubbleField } from "@/app/utils/BubbleField";
import { magnitude } from "@/app/utils/mutableVector";
import { AnimationCallback, useAnimationFrames } from "@/app/hooks/useAnimationFrames";

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

const drawBubbles = (bubbleField: BubbleField, canvas: HTMLCanvasElement, diagonalLength: number) => {
  if (!bubbleField || !canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

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
  maxHeight?: number;
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
  maxHeight = maxWidth,
  dpi,
}) => {
  const [bubbleField, setBubbleField] = useState<BubbleField | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const packingArea = useMemo(
    () => ({
      width: maxWidth * dpi,
      height: maxHeight * dpi,
      minRadius: minRadius * dpi,
      maxRadius: Math.round(minRadius * ratio) * dpi,
    }),
    [dpi, maxHeight, maxWidth, minRadius, ratio]
  );

  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const diagonalLength = Math.sqrt(Math.pow(maxWidth * dpi, 2) + Math.pow(maxHeight * dpi, 2));

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
  }, [packingArea, packingStrategy, randomStrategy, seed]);

  const animate: AnimationCallback = useCallback((deltaTime) => {
    if (!bubbleField || !canvas.current) return;

    bubbleField.step(deltaTime);
    drawBubbles(bubbleField, canvas.current, diagonalLength);

    // Stop animation if no active bubbles
    if (bubbleField.getActiveBubblesCount() === 0) {
      setIsAnimating(false);
    }
  }, [bubbleField, diagonalLength]);

  // Animation loop
  useAnimationFrames(animate, isAnimating);

  // Mouse move handler
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!bubbleField || !canvas.current) return;

    const { width: baseWidth, height: baseHeight } = canvas.current;

    // NOTE: Getting the bounding client and recomputing scale on every mouse move is super
    // inefficient, but it runs at 60fps on a 20x slowdown (~1.5 slower than low-end mobile
    // on my machine), so it's fine for now until I get around to making a really robust
    // dom rect caching hook
    const { left, top, width: measuredWidth, height: measuredHeight } = canvas.current.getBoundingClientRect();
    const currentX = event.clientX - left;
    const currentY = event.clientY - top;
    const scaleX = baseWidth / measuredWidth;
    const scaleY = baseHeight / measuredHeight;

    bubbleField.handleMouseMove(
      currentX * scaleX,
      currentY * scaleY,
      lastMousePos.current.x * scaleX,
      lastMousePos.current.y * scaleY,
    );

    lastMousePos.current.x = currentX;
    lastMousePos.current.y = currentY;

    // Start animation if there are active bubbles
    if (bubbleField.getActiveBubblesCount() > 0) {
      setIsAnimating(true);
    }
  }, [bubbleField]);

  // Avoid edge case where frame is cleared w/o redrawing on prop change
  useEffect(() => {
    if (bubbleField && canvas.current) {
      bubbleField.step(0);
      drawBubbles(bubbleField, canvas.current, diagonalLength);
    }
  }, [bubbleField, diagonalLength]);

  return (
    <div ref={container}>
      <canvas
        ref={canvas}
        className="w-full"
        width={packingArea.width}
        height={packingArea.height}
        style={{
          maxWidth: maxWidth,
          maxHeight: maxHeight,
        }}
        onMouseMove={handleMouseMove}
      />
    </div>
  );
}

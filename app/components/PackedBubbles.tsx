"use client";

import { FC, useCallback, useEffect, useRef, useState } from "react";
import clamp from "lodash/clamp";

import { PackingStrategy, RandomStrategy } from "@/app/utils/circlePacker";
import { BubbleField } from "@/app/utils/BubbleField";
import { magnitude } from "@/app/utils/mutableVector";
import { useResizeValue } from "@/app/hooks/useResizeValue";
import { useAnimationFrames } from "@/app/hooks/useAnimationFrames";

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

export type PackedBubbleProps = {
  seed: number;
  packingStrategy: PackingStrategy;
  randomStrategy: RandomStrategy;
  maxWidth: number;
  minRadius: number;
  ratio: number;
}
export const PackedBubbles: FC<PackedBubbleProps> = ({
  seed,
  packingStrategy,
  randomStrategy,
  minRadius,
  ratio,
  maxWidth,
}) => {
  const [bubbleField, setBubbleField] = useState<BubbleField | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const containerWidth = useResizeValue<number>(
    () => container.current?.clientWidth ?? 0,
    0,
    () => [container.current],
    true
  );

  // Initialize BubbleField when container dimensions are available
  useEffect(() => {
    if (containerWidth) {
      const field = new BubbleField({
        seed,
        packingStrategy,
        randomStrategy,
        packingArea: {
          width: containerWidth,
          height: containerWidth,
          minRadius,
          maxRadius: Math.round(minRadius * ratio),
        }
      });

      field.initialize().then(() => {
        setBubbleField(field);
      });
    }
  }, [containerWidth, minRadius, packingStrategy, randomStrategy, ratio, seed]);

  // Animation loop
  useAnimationFrames(
    (deltaTime) => {
      if (!bubbleField || !canvas.current) return;

      bubbleField.step(deltaTime);
      drawBubbles();

      // Stop animation if no active bubbles
      if (bubbleField.getActiveBubblesCount() === 0) {
        setIsAnimating(false);
      }
    },
    true // isAnimating
  );

  // Mouse move handler
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!bubbleField || !canvas.current) return;

    const rect = canvas.current.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    bubbleField.handleMouseMove(
      currentX,
      currentY,
      lastMousePos.current.x,
      lastMousePos.current.y
    );

    lastMousePos.current = { x: currentX, y: currentY };

    // Start animation if there are active bubbles
    if (bubbleField.getActiveBubblesCount() > 0) {
      setIsAnimating(true);
    }
  };

  // Draw bubbles to canvas
  const drawBubbles = useCallback(() => {
    if (!bubbleField || !canvas.current) return;

    const ctx = canvas.current.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, containerWidth, containerWidth);

    const diagonalLength = magnitude([containerWidth, containerWidth]);
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

      // Draw bubble as rounded rectangle
      ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      ctx.beginPath();
      const radiusX = outerRectangle.width / 2;
      const radiusY = outerRectangle.height / 2;
      ctx.ellipse(
        outerRectangle.x + radiusX,
        outerRectangle.y + radiusY,
        radiusX,
        radiusY,
        0,
        0,
        2 * Math.PI,
      )
      //ctx.roundRect(
      //  meta.x,
      //  meta.y,
      //  meta.width,
      //  meta.height,
      //  Math.min(meta.width, meta.height) / 2 // Full rounding
      //);
      //console.log(ctx.getTransform());
      ctx.fill();
    }
  }, [bubbleField, containerWidth]);

  // Initial draw when bubble field is ready
  useEffect(() => {
    if (bubbleField) {
      drawBubbles();
    }
  }, [bubbleField, drawBubbles]);

  return (
    <div
      ref={container}
      className="relative aspect-square w-full bg-transparent"
      style={{ maxWidth }}
    >
      <canvas
        ref={canvas}
        width={containerWidth}
        height={containerWidth}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
      />
    </div>
  );
}

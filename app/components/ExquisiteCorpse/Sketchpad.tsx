"use client";

import { FC, useEffect, useRef, useState } from "react";
import fitCurve from 'fit-curve';

type Point = [number, number];
type BezierCurve = [Point, Point, Point, Point]; // [p1, cp1, cp2, p2]
type Line = BezierCurve[];

type SketchpadProps = {
  width: number;
  height: number;
  handleAddLine?: (lines: Line[]) => void;
}
// Flow:
// - user mouses down
// - start recording mouse positions
// - animate the recording — on each frame:
//   - read latest line data and fit a bezier curve
//   - don't commit the curve while the line is being drawn
//   - render all lines to the canvas, including the newly-fit temporary curve
// - user mouses up
// - fit the line and commit the resulting curve
export const Sketchpad: FC<SketchpadProps> = ({ width, height, handleAddLine }) => {
  const [dpi, setDpi] = useState<number>();
  useEffect(() => setDpi(window.devicePixelRatio), []);

  const [lines, setLines] = useState<Line[]>();
  const currPoints = useRef<number[]>([]);

  const canvas = useRef<HTMLCanvasElement>(null);

  return (
    <canvas ref={canvas} width={width} height={height} />
  );
}

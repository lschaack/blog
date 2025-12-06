import { FC, useEffect, useMemo, useReducer, useRef, useState } from "react";
import clsx from "clsx";
import { DrawCommand, Path, PathCommand } from 'parse-svg-path';
import { CanvasDimensions } from "@/app/types/exquisiteCorpse";
import { breakUpPath, pathToD, getSeparation, getDirectionChange, splitPathIntoLines, PathSegment, getCurvatureSamples, getAnimationTimingFunction } from "../utils/svg";

const PEN_LIFT_COST_S = 0.02;
const DIRECTION_CHANGE_COST_S = 0.01;

function getInterLineDelay(
  prevLine: Array<PathSegment<DrawCommand>> | undefined,
  nextLine: Array<PathSegment<DrawCommand>> | undefined,
  drawSpeed: number,
) {
  const prevSegment = prevLine?.at(-1);
  const nextSegment = nextLine?.at(0);

  if (!prevSegment || !nextSegment) {
    return 0;
  }

  const separation = prevSegment
    ? getSeparation(prevSegment, nextSegment)
    : 0;
  // TODO: ensure this is having the intended effect
  const directionChange = prevSegment
    ? getDirectionChange(prevSegment, nextSegment)
    : 0;

  const didLiftPen = Number(separation > 0);
  const didNotLiftPen = 1 - didLiftPen;

  const penLiftCost = didLiftPen * PEN_LIFT_COST_S;
  const directionChangeCost = didNotLiftPen * DIRECTION_CHANGE_COST_S * directionChange;

  return penLiftCost + directionChangeCost + separation / (drawSpeed * 10);
}

// Custom hook for path length
function usePathLength() {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState<number | null>(null);

  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      setPathLength(length);
    }
  }, []);

  return [pathRef, pathLength] as const;
}

// NOTE: Expects a single move command - if path contains multiple move commands,
// all paths will be drawn simultaneously
type SelfDrawingSinglePathProps = Omit<SelfDrawingPathProps, 'path'> & {
  path: PathCommand[];
  paused: boolean;
  handleAnimationEnd: () => void;
  timingFunction?: string;
  delay?: number;
  enableMarkers?: boolean;
};
const SelfDrawingSinglePath: FC<SelfDrawingSinglePathProps> = ({
  path,
  paused,
  handleAnimationEnd,
  className,
  drawSpeed,
  timingFunction = 'ease',
  delay = 0,
  enableMarkers = false,
}) => {
  const [pathRef, rawPathLength] = usePathLength();
  const pathLength = rawPathLength ?? 0;

  const doAnimate = rawPathLength !== null && !paused;
  const rawDuration = pathLength / drawSpeed;

  const d = useMemo(() => pathToD(path), [path]);

  return (
    <path
      ref={pathRef}
      className={clsx(
        className,
        'animate-draw',
        pathLength ? 'visible' : 'hidden'
      )}
      d={d}
      onAnimationEnd={handleAnimationEnd}
      style={{
        strokeDasharray: pathLength,
        strokeDashoffset: pathLength,
        animation: doAnimate
          ? `draw ${rawDuration}s ${timingFunction} ${delay}s forwards`
          : 'unset',
      }}
      {...(enableMarkers ? {
        markerStart: "url(#dot)",
        markerMid: "url(#dot)",
        markerEnd: "url(#dot)"
      } : {}
      )}
    />
  );
}

type PathAnimationEvent =
  | 'increment'
  | 'reset';
type SelfDrawingPathProps = {
  path: Path;
  className?: string;
  drawSpeed: number;
  enableMarkers?: boolean;
}
const SelfDrawingPath: FC<SelfDrawingPathProps> = ({
  path,
  className,
  drawSpeed,
  enableMarkers = false,
}) => {
  const [currentAnimationIndex, dispatch] = useReducer<number, [PathAnimationEvent]>((index, type) => {
    switch (type) {
      case 'increment': return index + 1;
      case 'reset': return 0;
      default: throw new Error(`Unknown action ${type}`);
    }
  }, 0);

  const [lineData, setLineData] = useState<Array<{
    line: PathCommand[];
    delay: number;
    animationTimingFunction: string
  }>>([]);

  useEffect(() => {
    const lines = splitPathIntoLines(path);
    const linesAsSegments = lines.map(breakUpPath);

    const lineData = [];
    for (let i = 0; i < linesAsSegments.length; i++) {
      const lineSegments = linesAsSegments[i];
      const prevLineSegments = linesAsSegments[i - 1];

      const delay = getInterLineDelay(lineSegments, prevLineSegments, drawSpeed);

      // FIXME: lines with higher avg curvature should take longer to draw
      const animationTimingFunction = getAnimationTimingFunction(lineSegments);

      lineData.push({
        line: lines[i],
        delay,
        animationTimingFunction,
      });
    }

    setLineData(lineData);
  }, [drawSpeed, path]);

  return (
    lineData.map(({
      line,
      delay,
      animationTimingFunction,
    }, index) => {
      return (
        <SelfDrawingSinglePath
          key={`single-path-${index}`}
          path={line}
          paused={index > currentAnimationIndex}
          handleAnimationEnd={() => dispatch('increment')}
          className={className}
          drawSpeed={drawSpeed}
          timingFunction={animationTimingFunction}
          delay={delay}
          enableMarkers={enableMarkers}
        />
      );
    })
  )
}

type SelfDrawingSketchProps = {
  dimensions: CanvasDimensions;
  paths: Path[];
  animate?: 'all' | 'final';
  className?: string;
  drawSpeed?: number;
  enableMarkers?: boolean;
};
export const SelfDrawingSketch: FC<SelfDrawingSketchProps> = ({
  dimensions: { width, height },
  paths,
  animate = 'final',
  className,
  drawSpeed = 400,
  enableMarkers = true,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      <defs>
        <marker id="dot" markerWidth="8" markerHeight="8" refX="4" refY="4">
          <circle cx="4" cy="4" r="2" fill="#657E95" />
        </marker>
      </defs>
      <g strokeLinecap="round" strokeWidth={2} stroke="#000">
        {paths.map((path, index) => (
          animate === 'all' || index === paths.length - 1 ? (
            <SelfDrawingPath
              key={`path-${index}`}
              path={path}
              drawSpeed={drawSpeed}
              enableMarkers={enableMarkers}
            />
          ) : (
            <path
              key={`path-${index}`}
              d={pathToD(path)}
              {...(enableMarkers ? {
                markerStart: "url(#dot)",
                markerMid: "url(#dot)",
                markerEnd: "url(#dot)"
              } : {})}
            />
          )
        ))}
      </g>
    </svg>
  )
}

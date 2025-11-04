import { FC, useEffect, useMemo, useReducer, useRef, useState } from "react";
import clsx from "clsx";
import { DrawCommand, Path, PathCommand } from 'parse-svg-path';
import { CanvasDimensions } from "@/app/types/exquisiteCorpse";
import { breakUpPath, getAnimationTimingFunction, pathToD, getSeparation, getDirectionChange, splitPathIntoLines, PathSegment, getSegmentCost, costsToSomething } from "../utils/svg";

const PEN_LIFT_COST_S = 0.075;
const DIRECTION_CHANGE_COST_S = 0.05;

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

  const delay = penLiftCost + directionChangeCost + separation / (drawSpeed * 2);
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
};
const SelfDrawingSinglePath: FC<SelfDrawingSinglePathProps> = ({
  path,
  paused,
  handleAnimationEnd,
  className,
  drawSpeed,
  timingFunction = 'ease',
  delay = 0,
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
}
const SelfDrawingPath: FC<SelfDrawingPathProps> = ({
  path,
  className,
  drawSpeed,
}) => {
  const [currentAnimationIndex, dispatch] = useReducer<number, [PathAnimationEvent]>((index, type) => {
    switch (type) {
      case 'increment': return index + 1;
      case 'reset': return 0;
      default: throw new Error(`Unknown action ${type}`);
    }
  }, 0);

  const lineData = useMemo(() => {
    // split path into lines
    const lines = splitPathIntoLines(path);
    // split each line into segments
    const linesAsSegments = lines.map(breakUpPath);
    /**
     * for each line:
     *   produce a delay (excepting the first)
     *   calculate costs w/breakUpPath, internals of getAnimationTimingFunction
     *   ensure costs work both intra- and inter-line
     *   use costs as a modifier for acceleration
     *   produce animation timing function w/physical metaphor, accelerating from 0 and decelerating to min for cost > 1
     *   rely on css linear() for smoothing
     */

    const lineData = [];
    for (let i = 0; i < linesAsSegments.length; i++) {
      const lineSegments = linesAsSegments[i];
      const prevLineSegments = linesAsSegments[i - 1];

      const delay = getInterLineDelay(lineSegments, prevLineSegments, drawSpeed);

      const costs = lineSegments.flatMap(segment => getSegmentCost(segment).costs);
      const animationTimingFunction = costsToSomething(costs);

      lineData.push({
        line: lines[i],
        delay: i > 0 ? 0 : delay,
        animationTimingFunction,
      });
    }

    return lineData;
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
};
export const SelfDrawingSketch: FC<SelfDrawingSketchProps> = ({
  dimensions: { width, height },
  paths,
  animate = 'final',
  className,
  drawSpeed = 100,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      <g strokeLinecap="round" strokeWidth={2} stroke="#000">
        {paths.map((path, index) => (
          animate === 'all' || index === paths.length - 1 ? (
            <SelfDrawingPath
              key={`path-${index}`}
              path={path}
              drawSpeed={drawSpeed}
            />
          ) : (
            <path
              key={`path-${index}`}
              d={pathToD(path)}
            />
          )
        ))}
      </g>
    </svg>
  )
}

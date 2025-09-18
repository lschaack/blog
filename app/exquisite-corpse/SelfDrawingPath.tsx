import { FC, useEffect, useMemo, useReducer, useRef, useState } from "react";
import clsx from "clsx";
import { ParsedPath, PathCommand } from 'parse-svg-path';
import { CanvasDimensions } from "@/app/types/exquisiteCorpse";
import { breakUpPath, getAnimationTimingFunction, pathToD, getSeparation, getDirectionChange } from "../utils/svg";

const PEN_LIFT_COST_S = 0.075;
const DIRECTION_CHANGE_COST_S = 0.1;

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
  path: ParsedPath;
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

  const segmentData = useMemo(() => {
    // split path into segments with estimatable curvature
    const segments = breakUpPath(path);
    const segmentData = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const animationTimingFunction = getAnimationTimingFunction(segment);

      if (i > 0) {
        const prevSegment = segments[i - 1];

        const separation = getSeparation(prevSegment, segment);
        const directionChange = getDirectionChange(prevSegment, segment);

        const didLiftPen = Number(separation > 0);
        const didNotLiftPen = 1 - didLiftPen;

        const penLiftCost = didLiftPen * PEN_LIFT_COST_S;
        const directionChangeCost = didNotLiftPen * DIRECTION_CHANGE_COST_S * directionChange;

        const delay = penLiftCost + directionChangeCost + separation / (drawSpeed * 2);

        segmentData.push({
          segment,
          delay,
          animationTimingFunction,
        })
      } else {
        segmentData.push({
          segment,
          delay: 0,
          animationTimingFunction,
        })
      }
    }

    return segmentData;
  }, [drawSpeed, path]);

  return (
    segmentData.map(({
      segment,
      delay,
      animationTimingFunction: { timingFunction, cost }
    }, index) => {
      return (
        <SelfDrawingSinglePath
          key={`single-path-${index}`}
          path={segment}
          paused={index > currentAnimationIndex}
          handleAnimationEnd={() => dispatch('increment')}
          className={className}
          drawSpeed={drawSpeed / cost}
          timingFunction={timingFunction}
          delay={delay}
        />
      );
    })
  )
}

type SelfDrawingSketchProps = {
  dimensions: CanvasDimensions;
  paths: ParsedPath[];
  animate?: 'all' | 'final';
  className?: string;
  drawSpeed?: number;
};
export const SelfDrawingSketch: FC<SelfDrawingSketchProps> = ({
  dimensions: { width, height },
  paths,
  animate = 'final',
  className,
  drawSpeed = 800,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      {paths.map((path, index) => (
        animate === 'all' || index === paths.length - 1 ? (
          <SelfDrawingPath
            key={`path-${index}`}
            className="stroke-2 stroke-black"
            path={path}
            drawSpeed={drawSpeed}
          />
        ) : (
          <path
            key={`path-${index}`}
            className="stroke-2 stroke-black"
            d={pathToD(path)}
          />
        )
      ))}
    </svg>
  )
}

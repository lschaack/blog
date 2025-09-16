import { FC, useEffect, useMemo, useReducer, useRef, useState } from "react";
import clsx from "clsx";
import { ParsedPath, PathCommand } from 'parse-svg-path';
import { CanvasDimensions } from "@/app/types/exquisiteCorpse";
import { breakUpPath, getAnimationTimingFunction, getEndPosition, pathToD } from "../utils/svg";
import { easeOutRational } from "../utils/easingFunctions";

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
  waiting?: boolean;
  finished?: boolean;
  handleAnimationEnd: () => void;
  timingFunction?: string;
  delay?: number;
};
const SelfDrawingSinglePath: FC<SelfDrawingSinglePathProps> = ({
  path,
  waiting = false,
  finished = false,
  handleAnimationEnd,
  className,
  drawSpeed: rawDrawSpeed,
  timingFunction = 'ease',
  delay = 0,
}) => {
  const [pathRef, rawPathLength] = usePathLength();
  const pathLength = rawPathLength ?? 0;

  const minDrawSpeed = rawDrawSpeed / 4;
  const drawSpeed = easeOutRational(rawDrawSpeed - minDrawSpeed, 50, pathLength)
  const doAnimate = rawPathLength !== null && !waiting;
  const duration = pathLength / drawSpeed;

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
        strokeDashoffset: finished ? 0 : pathLength,
        animation: doAnimate
          ? `draw ${duration}s ${timingFunction} ${delay}s forwards`
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

  const pathSegments = useMemo(() => {
    dispatch('reset');

    // split path into segments with estimatable curvature
    return breakUpPath(path).map(segment => ({
      segment,
      ...getAnimationTimingFunction(segment),
    }));
  }, [path]);

  const delays = useMemo(() => {
    const delays = [];

    for (let i = 0; i < pathSegments.length; i++) {
      if (i > 0) {
        const [prevEndX, prevEndY] = getEndPosition(pathSegments[i - 1].segment);
        const [, currStartX, currStartY] = pathSegments[i].segment[0];
        const distance = Math.sqrt((currStartX - prevEndX) ** 2 + (currStartY - prevEndY) ** 2);

        delays.push(distance / (drawSpeed));
      } else {
        delays.push(0);
      }
    }

    return delays;
  }, [drawSpeed, pathSegments]);

  return (
    pathSegments.map(({ segment, timingFunction, cost }, index) => {
      const delay = delays[index];

      return (
        <SelfDrawingSinglePath
          key={`single-path-${index}`}
          path={segment}
          waiting={index > currentAnimationIndex}
          finished={index < currentAnimationIndex}
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
      <g stroke="#000" strokeWidth={2} strokeLinecap="round" fill="none">
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

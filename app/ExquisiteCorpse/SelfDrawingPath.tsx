import { FC, useEffect, useMemo, useReducer, useRef, useState } from "react";
import clsx from "clsx";
import { ParsedPath } from 'parse-svg-path';
import { CanvasDimensions } from "@/app/types/exquisiteCorpse";

// Custom hook for path length
function usePathLength() {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);

  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      setPathLength(length);
    }
  }, []);

  return [pathRef, pathLength] as const;
}

type SelfDrawingSinglePathProps = Omit<SelfDrawingPathProps, 'path'> & {
  d: string;
  paused: boolean;
  handleAnimationEnd: () => void;
};
const SelfDrawingSinglePath: FC<SelfDrawingSinglePathProps> = ({
  d,
  paused,
  handleAnimationEnd,
  className,
  drawSpeed = 400,
}) => {
  const [pathRef, pathLength] = usePathLength();

  const doAnimate = pathLength && !paused;

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
          ? `draw ${pathLength / drawSpeed}s ease forwards`
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

  // split path into multiple lines identified by move commands
  const paths = useMemo(() => {
    dispatch('reset');

    return path.reduce(
      (paths, cmd) => {
        if (cmd[0] === 'M' || cmd[0] === 'm') {
          return [...paths, cmd.join(' ')]
        } else {
          return [
            ...paths.slice(0, paths.length - 1),
            `${paths.at(-1)!}\n${cmd.join(' ')}`
          ];
        }
      },
      [] as string[]
    );
  }, [path]);

  return (
    paths.map((path, index) => (
      <SelfDrawingSinglePath
        key={`self-drawing-path-${index}`}
        d={path}
        paused={index > currentAnimationIndex}
        handleAnimationEnd={() => dispatch('increment')}
        className={className}
        drawSpeed={drawSpeed}
      />
    ))
  )
}

type SelfDrawingSketchProps = {
  dimensions: CanvasDimensions;
  paths: ParsedPath[];
  className?: string;
  drawSpeed?: number;
};
export const SelfDrawingSketch: FC<SelfDrawingSketchProps> = ({
  dimensions: { width, height },
  paths,
  className,
  drawSpeed = 300,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      {paths.map((path, index) => (
        <SelfDrawingPath
          key={`path-${index}`}
          className="stroke-2 stroke-black"
          path={path}
          drawSpeed={drawSpeed}
        />
      ))}
    </svg>
  )
}

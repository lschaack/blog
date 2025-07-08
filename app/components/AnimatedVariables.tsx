'use client';

import {
  createContext,
  FC,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  useCallback
} from "react";
import throttle from "lodash/throttle";
import { createNoise2D } from "simplex-noise";

import { inputColorClasses } from "@/app/utils/colors";
import { LabelledValue } from "@/app/components/LabelledValue";

type AnimatedVariableValue = string | number | boolean;
export const AnimatedVariablesContext = createContext(new Map<string, AnimatedVariableValue>());

type ForceContinuousAnimation = (value: AnimatedVariableValue | undefined) => boolean;

const useAnimatedVariable = (
  varName: string,
  // NOTE: should be memoized to avoid persistent frame cancellation
  forceContinuousAnimation?: ForceContinuousAnimation,
) => {
  const animatedVariables = useContext(AnimatedVariablesContext);
  const [value, setValue] = useState(animatedVariables.get(varName));
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const displayNextValue = () => {
      const nextValue = animatedVariables.get(varName);

      setValue(nextValue);

      if (forceContinuousAnimation?.(nextValue)) forceUpdate();

      frame = requestAnimationFrame(displayNextValue);
    }

    let frame = requestAnimationFrame(displayNextValue);

    return () => cancelAnimationFrame(frame);
  }, [animatedVariables, forceContinuousAnimation, varName]);

  return value;
}

type AnimatedVariableProps = {
  varName: string;
  displayName?: string;
}

export const AnimatedVariableValue: FC<AnimatedVariableProps> = ({ varName, displayName }) => {
  const value = useAnimatedVariable(varName);
  const [showValue, setShowValue] = useState(false);

  // Nextjs hydration hack...only show value after initial render to avoid rerendering entire page
  useEffect(() => setShowValue(true), []);

  return <p>{displayName ?? varName}: {showValue && value}</p>;
}

type AnimatedVariableMeterProps = AnimatedVariableProps & {
  color: keyof typeof inputColorClasses;
  defaultValue: AnimatedVariableValue;
};

const logMeterTypeError = throttle((varName: string, value: unknown) => {
  console.error(`Cannot represent non-numeric value \`${varName} = ${value}\` with type "${typeof value}" as a meter`);
}, 1000);

const MAX_OFFSET_X = 5;
const MAX_OFFSET_Y = 3;
const MAX_ROT = 1.5;

// https://github.com/jwagner/simplex-noise.js/blob/main/simplex-noise.ts#L99
// Add a safe margin to max, cause Math.pow(2, 31) does actually break sometimes
const maxNoiseInput = Math.pow(2, 30);

export const AnimatedVariableMeter: FC<AnimatedVariableMeterProps> = ({
  varName,
  displayName,
  color,
  defaultValue
}) => {
  const noiseX = useMemo(() => createNoise2D(), []);
  const noiseY = useMemo(() => createNoise2D(), []);
  const noiseRot = useMemo(() => createNoise2D(), []);

  // avoid unnecessary animation frames when screenshake is 0
  const getDoAnimate = useCallback<ForceContinuousAnimation>(
    val => typeof val === 'number' && val > 1,
    []
  );

  // default value avoids hydration error
  const value = useAnimatedVariable(varName, getDoAnimate) ?? defaultValue;

  if (value && typeof value !== 'number') {
    logMeterTypeError(varName, value);
  }

  const _shakeAmount = typeof value === 'number' && value > 1 ? Math.min(value - 1, 2) / 2 : 0;
  const shakeAmount = Math.pow(_shakeAmount, 1 / 3);
  const now = Date.now() % maxNoiseInput;
  const shakeX = noiseX(now, 0) * MAX_OFFSET_X * shakeAmount;
  const shakeY = noiseY(now, 0) * MAX_OFFSET_Y * shakeAmount;
  const shakeRot = noiseRot(now, 0) * MAX_ROT * shakeAmount;

  return (
    <LabelledValue id={varName}
      label={displayName ?? varName}
      value={Number(value)?.toFixed(2) ?? ''}
    >
      <div
        id={varName}
        role="meter"
        className={`w-full h-4 ${inputColorClasses[color].track}`}
        aria-valuenow={value as number}
        aria-valuemin={0}
        aria-valuemax={1}
        style={{
          transform: `translate(${shakeX}px, ${shakeY}px) rotate(${shakeRot}deg)`,
        }}
      >
        <div
          className={`h-full ${inputColorClasses[color].filled}`}
          style={{ width: `${(value as number) * 100}%` }}
        />
      </div>
    </LabelledValue>
  );
}

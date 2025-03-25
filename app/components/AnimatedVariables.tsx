import { createContext, FC, useContext, useEffect, useState } from "react";
import { inputColorClasses } from "../utils/colors";
import { throttle } from "lodash";
import { LabelledValue } from "./LabelledValue";

export const AnimatedVariablesContext = createContext(new Map<string, string | number | boolean>());

const useAnimatedVariable = (varName: string) => {
  const animatedVariables = useContext(AnimatedVariablesContext);
  const [value, setValue] = useState(animatedVariables.get(varName));

  useEffect(() => {
    const displayNextValue = () => {
      setValue(animatedVariables.get(varName));

      frame = requestAnimationFrame(displayNextValue);
    }

    let frame = requestAnimationFrame(displayNextValue);

    return () => cancelAnimationFrame(frame);
  });

  return value;
}

type AnimatedVariableProps = {
  varName: string;
  displayName?: string;
}

export const AnimatedVariableValue: FC<AnimatedVariableProps> = ({ varName, displayName }) => {
  const value = useAnimatedVariable(varName);

  return <p>{displayName ?? varName}: {value}</p>;
}

type AnimatedVariableMeterProps = AnimatedVariableProps & {
  color: keyof typeof inputColorClasses;
};

const logMeterTypeError = throttle((varName: string, value: unknown) => {
  console.error(`Cannot represent non-numeric value \`${varName} = ${value}\` with type "${typeof value}" as a meter`);
}, 1000);

/* TODO:
 * when the value is beyond the max, add some perlin noise shake
 */
export const AnimatedVariableMeter: FC<AnimatedVariableMeterProps> = ({ varName, displayName, color }) => {
  const value = useAnimatedVariable(varName);

  if (value && typeof value !== 'number') logMeterTypeError(varName, value);

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
      >
        <div
          className={`h-full ${inputColorClasses[color].filled}`}
          style={{ width: `${(value as number) * 100}%` }}
        />
      </div>
    </LabelledValue>
  );
}

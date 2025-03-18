import { createContext, FC, useContext, useEffect, useState } from "react";

export const AnimatedVariablesContext = createContext(new Map<string, string | number | boolean>());

const useAnimatedVariable = (varName: string) => {
  const animatedVariables = useContext(AnimatedVariablesContext);
  const [value, setValue] = useState(animatedVariables.get(varName));

  useEffect(() => {
    const displayNextValue = () => {
      setValue(animatedVariables.get(varName)?.toString());

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

export const AnimatedVariableMeter: FC<AnimatedVariableProps> = ({ varName, displayName }) => {
  const value = useAnimatedVariable(varName);

  return (
    <meter
      className="block"
      value={value as number}
      min={0}
      max={1}
    >
      {displayName ?? varName}
    </meter>
  );
}

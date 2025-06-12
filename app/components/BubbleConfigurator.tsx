"use client"

import { useContext } from "react";

import { InputRange } from "@/app/components/InputRange";
import { DebugContext } from "@/app/components/DebugContext";
import { BUBBLE_OVERKILL, SPRING_STIFFNESS } from "@/app/utils/physicsConsts";

export const BubbleConfigurator = () => {
  const { debugMenuOptions, setDebugMenuOptions } = useContext(DebugContext);

  return (
    <>
      <li>
        <InputRange
          label="Stiffness"
          color="amber"
          id="stiffness"
          min={0.0001}
          max={0.01}
          step={0.0001}
          defaultValue={debugMenuOptions.springStiffness as number ?? SPRING_STIFFNESS}
          onChange={value => setDebugMenuOptions(prev => ({
            ...prev,
            springStiffness: value,
          }))}
        />
      </li>
      <li>
        <InputRange
          label="Overkill"
          color="rose"
          id="overkill"
          min={1}
          max={5}
          step={1}
          defaultValue={debugMenuOptions.bubbleOverkill as number ?? BUBBLE_OVERKILL}
          onChange={value => setDebugMenuOptions(prev => ({
            ...prev,
            bubbleOverkill: value,
          }))}
        />
      </li>
      <li>
        <InputRange
          label="Border"
          color="cyan"
          id="border"
          min={1}
          max={32}
          step={1}
          defaultValue={debugMenuOptions.bubbleBorder as number ?? 8}
          onChange={value => setDebugMenuOptions(prev => ({
            ...prev,
            bubbleBorder: value,
          }))}
        />
      </li>
    </>
  );
}


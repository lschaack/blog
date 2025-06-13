"use client"

import { useContext } from "react";

import { InputRange } from "@/app/components/InputRange";
import { DebugContext } from "@/app/components/DebugContext";
import { BUBBLE_OVERKILL, SPRING_STIFFNESS } from "@/app/utils/physicsConsts";
import { Button } from "@/app/components/Button";

const INIT_STATE = {
  springStiffness: SPRING_STIFFNESS,
  bubbleOverkill: BUBBLE_OVERKILL,
  bubbleBorder: 8,
}

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
          easing="easeIn"
          value={debugMenuOptions.springStiffness as number ?? INIT_STATE.springStiffness}
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
          min={0.1}
          max={5}
          step={0.1}
          value={debugMenuOptions.bubbleOverkill as number ?? INIT_STATE.bubbleOverkill}
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
          value={debugMenuOptions.bubbleBorder as number ?? INIT_STATE.bubbleBorder}
          onChange={value => setDebugMenuOptions(prev => ({
            ...prev,
            bubbleBorder: value,
          }))}
        />
      </li>
      <li>
        <Button
          label="reset"
          color="emerald"
          onClick={() => setDebugMenuOptions(
            prev => ({
              ...prev,
              ...INIT_STATE
            })
          )}
        />
      </li>
    </>
  );
}


"use client"

import { useContext } from "react";

import { InputRange } from "@/app/components/InputRange";
import { DebugContext } from "@/app/components/DebugContext";

export const BubbleConfigurator = () => {
  const { setDebugMenuOptions } = useContext(DebugContext);

  return (
    <>
      <li>
        <InputRange
          label="Overkill"
          color="rose"
          id="overkill"
          min={1}
          max={20}
          step={1}
          defaultValue={3}
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
          defaultValue={8}
          onChange={value => setDebugMenuOptions(prev => ({
            ...prev,
            bubbleBorder: value,
          }))}
        />
      </li>
    </>
  );
}


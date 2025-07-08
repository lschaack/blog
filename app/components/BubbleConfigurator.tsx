"use client"

import { memo, useContext } from "react";

import { InputRange } from "@/app/components/InputRange";
import { DebugContext } from "@/app/components/DebugContext";
import { BUBBLE_BOUNDARY, BUBBLE_OVERKILL, SPRING_STIFFNESS } from "@/app/utils/physicsConsts";
import { Button } from "@/app/components/Button";
import { DebugMenu } from "@/app/components/DebugMenu";
import { useDebouncedState } from "@/app/hooks/useDebouncedState";

const INIT_STATE = {
  springStiffness: SPRING_STIFFNESS,
  bubbleOverkill: BUBBLE_OVERKILL,
  bubbleBoundary: BUBBLE_BOUNDARY,
}

const RESET_STATE = {
  springStiffness: undefined,
  bubbleOverkill: undefined,
  bubbleBoundary: undefined,
}

export const BubbleConfigurator = memo(function BubbleConfigurator() {
  const {
    debugMenuOptions: _debugMenuOptions,
    setDebugMenuOptions: _setDebugMenuOptions
  } = useContext(DebugContext);

  const [debugMenuOptions, setDebugMenuOptions] = useDebouncedState(_debugMenuOptions, _setDebugMenuOptions);

  return (
    <DebugMenu>
      <li>
        <InputRange
          label="Stiffness"
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
          id="overkill"
          min={0.1}
          max={3}
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
          id="border"
          min={1}
          max={32}
          step={1}
          value={debugMenuOptions.bubbleBoundary as number ?? INIT_STATE.bubbleBoundary}
          onChange={value => setDebugMenuOptions(prev => ({
            ...prev,
            bubbleBoundary: value,
          }))}
        />
      </li>
      <li className="mt-2">
        <Button
          label="Reset all"
          onClick={() => setDebugMenuOptions(
            prev => ({
              ...prev,
              ...RESET_STATE
            })
          )}
        >
        </Button>
      </li>
    </DebugMenu>
  );
});

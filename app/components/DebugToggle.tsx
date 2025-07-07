"use client";

import { FC, memo, useContext } from "react";
import { Settings, Minus } from "lucide-react";
import clsx from 'clsx';

import { DebugContext } from "@/app/components/DebugContext";
import { Pingable } from "@/app/components/Pingable";

type DebugToggleProps = {
  className?: string;
}
export const DebugToggle: FC<DebugToggleProps> = memo(function DebugToggle({ className }) {
  const { debug, setDebug, isOverridden } = useContext(DebugContext);

  return (
    <Pingable ping={isOverridden} className="rounded-full inset-1 sm:inset-0">
      <button
        onClick={() => setDebug(prev => !prev)}
        className={clsx("icon-surface relative bg-white", className)}
      >
        {debug
          ? <Minus size={24} />
          : <Settings size={24} />
        }
      </button>
    </Pingable>
  );
});

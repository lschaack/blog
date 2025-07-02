"use client";

import { FC, memo, useContext } from "react";
import { Bug, BugOff } from "lucide-react";
import clsx from 'clsx';

import { DebugContext } from "@/app/components/DebugContext";
import { IconButton } from "@/app/components/IconButton";
import { Pingable } from "@/app/components/Pingable";

type DebugToggleProps = {
  className?: string;
}
export const DebugToggle: FC<DebugToggleProps> = memo(function DebugToggle({ className }) {
  const { debug, setDebug, isOverridden } = useContext(DebugContext);

  return (
    <Pingable ping={isOverridden} className="rounded-full inset-1 sm:inset-0">
      <IconButton
        // FIXME: Not sure why onChange gets fired but onClick doesn't
        onClick={() => setDebug(prev => !prev)}
        onChange={() => setDebug(prev => !prev)}
        className={clsx("relative bg-white", className)}
        type="checkbox"
        name="debug"
        value={String(debug)}
        checked={debug}
        label="Toggle debug"
      >
        {debug
          ? <BugOff size={24} />
          : <Bug size={24} />
        }
      </IconButton>
    </Pingable>
  );
});

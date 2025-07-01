"use client";

import { FC, memo, useContext } from "react";
import { Bug, BugOff } from "lucide-react";
import clsx from 'clsx';

import { DebugContext } from "@/app/components/DebugContext";

type DebugToggleProps = {
  className?: string;
}
export const DebugToggle: FC<DebugToggleProps> = memo(function DebugToggle({ className }) {
  const { debug, setDebug, isOverridden } = useContext(DebugContext);

  return (
    <button
      onClick={() => setDebug(prev => !prev)}
      className={clsx(
        "hljs rounded-full p-2",
        "outline-4 transition-colors duration-200",
        isOverridden ? "hljs-keyword" : "outline-transparent",
        className,
      )}
    >
      <label>
        <input
          className="sr-only"
          type="checkbox"
          id="debug"
          name="debug"
          value={String(debug)}
          checked={debug}
          onChange={() => setDebug(prev => !prev)}
        />
        {debug
          ? <BugOff size={24} />
          : <Bug size={24} />
        }
        <span className="sr-only">Toggle debug</span>
      </label>
    </button>
  );
});

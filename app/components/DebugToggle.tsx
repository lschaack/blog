"use client";

import { useContext } from "react";
import { Bug, BugOff } from "lucide-react";

import { DebugContext } from "@/app/components/DebugContext";

export const DebugToggle = () => {
  const { debug, setDebug } = useContext(DebugContext);

  return (
    <button onClick={() => setDebug(prev => !prev)}>
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
}

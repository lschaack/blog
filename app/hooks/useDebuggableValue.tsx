import { useContext } from "react";

import { DebugContext, DebugOption } from "@/app/components/DebugContext";

export const useDebuggableValue = <T extends DebugOption>(key: string, defaultVal: T): T => {
  const { debug, debugMenuOptions } = useContext(DebugContext);

  if (debug) {
    return debugMenuOptions[key] as T ?? defaultVal;
  } else {
    return defaultVal;
  }
}


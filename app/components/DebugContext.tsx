"use client";

import { createContext, Dispatch, FC, ReactNode, SetStateAction, useState } from "react";

export type DebugOption = string | number | boolean | undefined;
export type DebugOptions = Record<string, DebugOption>;

type TDebugContext = {
  debug: boolean;
  setDebug: Dispatch<SetStateAction<boolean>>;
  debugMenuOptions: DebugOptions;
  setDebugMenuOptions: Dispatch<SetStateAction<DebugOptions>>;
};
export const DebugContext = createContext<TDebugContext>({
  debug: false,
  setDebug: () => undefined,
  debugMenuOptions: {},
  setDebugMenuOptions: () => undefined,
});

export const DebugProvider: FC<{ children?: ReactNode }> = ({ children }) => {
  const [debug, setDebug] = useState(false);
  const [debugMenuOptions, setDebugMenuOptions] = useState<DebugOptions>({});

  return (
    <DebugContext.Provider value={{ debug, setDebug, debugMenuOptions, setDebugMenuOptions }}>
      {children}
    </DebugContext.Provider>
  )
}

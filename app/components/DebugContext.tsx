"use client";

import { createContext, Dispatch, FC, ReactNode, SetStateAction, useState } from "react";

export type DebugOption = string | number | boolean | undefined;
export type DebugOptions = Record<string, DebugOption>;

type TDebugContext = {
  debug: boolean;
  setDebug: Dispatch<SetStateAction<boolean>>;
  debugMenuOptions: DebugOptions;
  setDebugMenuOptions: Dispatch<SetStateAction<DebugOptions>>;
  isOverridden: boolean;
};
export const DebugContext = createContext<TDebugContext>({
  debug: false,
  setDebug: () => undefined,
  debugMenuOptions: {},
  setDebugMenuOptions: () => undefined,
  isOverridden: false,
});

export const DebugProvider: FC<{ children?: ReactNode }> = ({ children }) => {
  const [debug, setDebug] = useState(false);
  const [debugMenuOptions, setDebugMenuOptions] = useState<DebugOptions>({});
  const isOverridden = Object.values(debugMenuOptions).some(value => value !== undefined);

  return (
    <DebugContext.Provider value={{
      debug,
      setDebug,
      debugMenuOptions,
      setDebugMenuOptions,
      isOverridden,
    }}>
      {children}
    </DebugContext.Provider>
  )
}

"use client";

import { createContext, Dispatch, FC, ReactNode, SetStateAction, useState } from "react";

type TDebugContext = {
  debug: boolean;
  setDebug: Dispatch<SetStateAction<boolean>>;
};
export const DebugContext = createContext<TDebugContext>({
  debug: false,
  setDebug: () => undefined,
});

const isDev = process.env.NODE_ENV === 'development';

export const DebugProvider: FC<{ children?: ReactNode }> = ({ children }) => {
  const [debug, setDebug] = useState(isDev);

  return (
    <DebugContext.Provider value={{ debug, setDebug }}>
      {children}
    </DebugContext.Provider>
  )
}

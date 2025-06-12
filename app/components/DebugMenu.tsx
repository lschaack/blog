import { FC, ReactNode, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { DebugContext } from "@/app/components/DebugContext";

type DebugMenuProps = {
  children?: ReactNode;
}
export const DebugMenu: FC<DebugMenuProps> = ({ children }) => {
  const { debug } = useContext(DebugContext);
  const [menuElement, setMenuElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMenuElement(document.getElementById('debug-menu-surface'));
  }, []);

  if (menuElement && debug) {
    return createPortal(
      <menu className="bg-stone-50/70 p-6 flex flex-col gap-4 w-full max-w-2xl">
        {children}
      </menu>,
      menuElement
    );
  } else {
    return null;
  }
}

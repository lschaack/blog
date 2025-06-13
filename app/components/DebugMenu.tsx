import { FC, ReactNode, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { DebugContext } from "@/app/components/DebugContext";
import { DebugToggle } from "@/app/components/DebugToggle";

type DebugMenuProps = {
  children?: ReactNode;
}
export const DebugMenu: FC<DebugMenuProps> = ({ children }) => {
  const { debug } = useContext(DebugContext);
  const [menuElement, setMenuElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMenuElement(document.getElementById('debug-menu-surface'));
  }, []);

  if (menuElement) {
    return createPortal(
      <div className="flex flex-col gap-4 items-end">
        <DebugToggle />
        {debug && (
          <menu className="bg-stone-50/70 backdrop-blur-md p-6 flex flex-col gap-4 w-full max-w-2xl">
            {children}
          </menu>
        )}
      </div>,
      menuElement
    );
  } else {
    return null;
  }
}

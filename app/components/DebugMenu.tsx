"use client";

import { FC, memo, ReactNode, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Popover } from "radix-ui";

import { DebugContext } from "@/app/components/DebugContext";
import { DebugToggle } from "@/app/components/DebugToggle";

type DebugMenuProps = {
  children?: ReactNode;
}
export const DebugMenu: FC<DebugMenuProps> = memo(function DebugMenu({ children }) {
  const { debug } = useContext(DebugContext);
  const [menuElement, setMenuElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMenuElement(document.getElementById('debug-menu-surface'));
  }, []);

  if (menuElement) {
    return createPortal(
      <div className="flex flex-col gap-2 items-end">
        <Popover.Root>
          <Popover.Trigger asChild>
            <DebugToggle />
          </Popover.Trigger>
          <Popover.Content>
            {debug && (
              <menu className={clsx(
                "p-4 w-64 flex flex-col gap-4 rounded-[20px] bg-surface-translucent",
                "starting:opacity-0 opacity-100 transition-opacity duration-200",
              )}>
                {children}
              </menu>
            )}
          </Popover.Content>
        </Popover.Root>
      </div>,
      menuElement
    );
  } else {
    return null;
  }
});

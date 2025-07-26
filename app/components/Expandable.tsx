"use client";

import { FC, ReactNode, useEffect, useRef } from "react";
import clsx from "clsx";
import { X } from "lucide-react";

type ExpandableProps = {
  children: ReactNode;
  className?: string;
  maxWidth?: number | string;
};

export const Expandable: FC<ExpandableProps> = ({
  children,
  className,
  maxWidth = '80%',
}) => {
  const dialogElement = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const options = {
      capture: true
    };

    const handleOutsideClick = (e: MouseEvent) => {
      const dialog = dialogElement.current;

      if (dialog) {
        const isOutsideClick = !dialog.contains(e.target as Node);
        const isOverlayClick = e.target === dialog;

        if (isOutsideClick || isOverlayClick) dialog.close();
      }
    }

    document.addEventListener('click', handleOutsideClick, options);

    return () => document.removeEventListener('click', handleOutsideClick, options);
  }, []);

  return (
    <div className={className}>
      <button
        className="pop-focus pop-hover cursor-pointer"
        onClick={() => dialogElement.current?.showModal()}
      >
        {children}
      </button>
      <dialog
        ref={dialogElement}
        className={clsx(
          "m-auto backdrop:bg-slate-900/50",
          "transition-opacity duration-200 ease",
          "starting:open:opacity-0 open:opacity-100",
          "backdrop:transition-opacity backdrop:duration-200 ease",
          "starting:open:backdrop:opacity-0 open:backdrop:opacity-100",
        )}
        style={{ maxWidth }}
      >
        {children}
        <button
          className="icon-surface fixed bg-white top-4 right-4 sm:top-8 sm:right-8"
          onClick={() => dialogElement.current?.close()}
        >
          <X size={24} />
        </button>
      </dialog>
    </div>
  );
};


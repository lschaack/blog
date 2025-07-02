"use client";

import { FC, ReactNode, useEffect, useRef } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import { IconButton } from "@/app/components/IconButton";

type ExpandableProps = {
  children: ReactNode;
  className?: string;
};

export const Expandable: FC<ExpandableProps> = ({
  children,
  className,
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
      <div
        className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
        onClick={() => dialogElement.current?.showModal()}
      >
        {children}
      </div>
      <dialog
        ref={dialogElement}
        onBlur={() => dialogElement.current?.close()}
        className={clsx(
          "m-auto backdrop:bg-zinc-900/50",
          "transition-opacity duration-200 ease",
          "starting:open:opacity-0 open:opacity-100",
          "backdrop:transition-opacity backdrop:duration-200 ease",
          "starting:open:backdrop:opacity-0 open:backdrop:opacity-100",
        )}
      >
        {children}
        <IconButton
          className="fixed top-4 right-4 bg-white focus:outline-night-owl-keyword"
          label="Close modal"
          onClick={() => dialogElement.current?.close()}
          name="Close"
        >
          <X size={24} />
        </IconButton>
      </dialog>
    </div>
  );
};


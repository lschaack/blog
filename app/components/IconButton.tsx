import clsx from "clsx";

import { Button, ButtonProps } from "../components/Button";

export function IconButton({ className, children, ...buttonProps }: ButtonProps) {
  return (
    <Button {...buttonProps} className={clsx(className, "rounded-full p-2! w-min")}>
      {children}
    </Button>
  );
}

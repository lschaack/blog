import { FC, ReactNode } from "react";
import clsx from "clsx";

type PingProps = {
  ping: boolean;
  className?: string;
}

const Ping = ({ ping, className }: Pick<PingableProps, 'ping' | 'className'>) => {
  return (
    <div
      className={clsx(
        className,
        "absolute inset-0 -z-10 bg-night-owl-literal",
        ping ? "animate-ping" : 'opacity-0',
      )}
    />
  )
}

type PingableProps = PingProps & {
  children?: ReactNode;
}
export const Pingable: FC<PingableProps> = ({ children, ...pingProps }) => {
  return (
    <div className="relative">
      <Ping {...pingProps} />
      {children}
    </div>
  )
}


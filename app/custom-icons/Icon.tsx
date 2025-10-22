import { ReactNode, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

type SVGIconProps = IconProps & {
  children: ReactNode;
};

export function SVGIcon({ children, ...props }: SVGIconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="black"
      strokeWidth="2"
      strokeLinecap="round"
      {...props}
    >
      {children}
    </svg>
  )
}

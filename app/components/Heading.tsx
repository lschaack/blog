import { ComponentProps, FC, MouseEventHandler } from "react";

const handleHeadingClick: MouseEventHandler<HTMLHeadingElement> = e => {
  navigator.clipboard.writeText(`${window.location.href.replace(/#.*$/, '')
    }#${e.currentTarget.id
    }`);

  e.currentTarget.scrollIntoView(true);
};

export const Heading: FC<ComponentProps<'h1'> & { type: 'h1' | 'h2' | 'h3' | 'h4' }> = () => {

}

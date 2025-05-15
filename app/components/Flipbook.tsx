"use client";

import { createElement, HTMLElementType, HTMLProps, ReactNode, useRef, useState } from "react";

type FlipbookProps<ElementType extends HTMLElement> = HTMLProps<ElementType> & {
  frames: ReactNode[];
  intervalMs: number;
  elementType: HTMLElementType;
  useInnerHtml?: boolean;
}

export const Flipbook = <ElementType extends HTMLElement>({
  frames,
  intervalMs,
  elementType,
  useInnerHtml = false,
  ...elementProps
}: FlipbookProps<ElementType>) => {
  const index = useRef(0);
  const [content, setContent] = useState(frames[0]);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout>();

  return (
    <div
      onMouseEnter={() => {
        const intervalId = setInterval(
          () => {
            index.current = (index.current + 1) % 2;
            setContent(frames[index.current])
          },
          intervalMs
        );

        setIntervalId(intervalId);
      }}
      onMouseLeave={() => clearInterval(intervalId)}
    >
      {createElement(
        elementType,
        {
          ...elementProps,
          ...(useInnerHtml ? {
            dangerouslySetInnerHTML: {
              __html: content
            }
          } : {
            children: content
          })
        }
      )}
    </div>
  )
}

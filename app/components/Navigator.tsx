"use client";

import { FC, useEffect, useState } from "react";
import clsx from "clsx";
import { Block } from "@contentful/rich-text-types";
import { documentToPlainTextString } from "@contentful/rich-text-plain-text-renderer";
import { kebabCase } from "lodash/fp";
import { CommonNode } from "@contentful/rich-text-react-renderer";

import { BlogPostBody } from "@/app/graphql/graphql";
import { useAbsoluteOffset } from "@/app/hooks/useAbsoluteOffset";

const extractHeadings = (node: CommonNode): Block[] => {
  if (node.nodeType.startsWith('heading')) return [node as Block];
  else if (node.nodeType === 'text') return [];
  else return node.content.flatMap(extractHeadings);
}

const NavigatorEntry: FC<{ node: Block }> = ({ node }) => {
  const [isPassed, setIsPassed] = useState(false);
  const [headingElement, setHeadingElement] = useState<HTMLHeadingElement | null>(null);

  const content = documentToPlainTextString(node);
  const anchor = kebabCase(content);
  const level = node.nodeType.split('-')[1];

  const { offsetTop } = useAbsoluteOffset(headingElement);

  useEffect(() => {
    setHeadingElement(document.querySelector<HTMLHeadingElement>(`#${anchor}`));
  }, [anchor]);

  useEffect(() => {
    // This check avoids frame where all headings are highlighted
    // Technically won't work for offsetTop === 0, but I'm never gonna need that so whatever
    if (offsetTop) {
      const handleScroll = () => {
        const nearTopOfScreen = window.scrollY + window.innerHeight / 5;

        setIsPassed(nearTopOfScreen > offsetTop);
      }

      handleScroll();

      window.addEventListener('scroll', handleScroll);

      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [offsetTop]);

  return (
    <a
      href={`#${anchor}`}
      className={clsx(
        isPassed && "passed",
        "transition-colors duration-75",
        "-ml-[2px] border-l-2 py-1 pr-2",
        isPassed
          ? "border-slate-800"
          : "border-slate-300",
        "nth-last-[1_of_.passed]:bg-night-owl-keyword/20",
        "nth-last-[1_of_.passed]:border-l-night-owl-keyword",
      )}
    >
      <li
        className={clsx(
          "font-bold",
          isPassed ? "text-slate-800" : "text-slate-800/70",
        )}
        style={{
          paddingLeft: `${12 * parseInt(level)}px`
        }}
      >
        {content}
      </li>
    </a>
  );
}

export const Navigator: FC<{ body: BlogPostBody; className?: string }> = ({ body, className }) => {
  const headings = extractHeadings(body.json);

  return (
    <ul className={clsx('p-6 bg-slate-50/95 backdrop-blur-sm mx-4 mt-8 rounded-4xl', className)}>
      <div className="flex flex-col border-slate-800/70 border-l-2">
        {headings.map((heading, i) => (
          <NavigatorEntry
            key={`heading-${i}`}
            node={heading}
          />
        ))}
      </div>
    </ul>
  )
}


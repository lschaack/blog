"use client";

import { FC, useEffect, useState } from "react";
import clsx from "clsx";
import { Block } from "@contentful/rich-text-types";
import { documentToPlainTextString } from "@contentful/rich-text-plain-text-renderer";
import { kebabCase } from "lodash/fp";
import { CommonNode } from "@contentful/rich-text-react-renderer";

import { BlogPostBody } from "@/app/graphql/graphql";

const extractHeadings = (node: CommonNode): Block[] => {
  if (node.nodeType.startsWith('heading')) return [node as Block];
  else if (node.nodeType === 'text') return [];
  else return node.content.flatMap(extractHeadings);
}

const NavigatorEntry: FC<{ node: Block }> = ({ node }) => {
  const [isPassed, setIsPassed] = useState(false);
  const content = documentToPlainTextString(node);
  const anchor = kebabCase(content);
  const level = node.nodeType.split('-')[1];

  useEffect(() => {
    const handleScroll = () => {
      const heading = document.querySelector<HTMLHeadingElement>(`#${anchor}`);
      const midScreen = window.scrollY + window.innerHeight / 2;

      if (heading) setIsPassed(midScreen > heading.offsetTop);
    }

    handleScroll();

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, [anchor]);

  return (
    <a
      href={`#${anchor}`}
      className={clsx(
        isPassed && 'passed',
        "transition-colors duration-75",
        "-ml-[2px] border-l-2 py-1 pr-2",
        isPassed
          ? "border-stone-800"
          : "border-stone-300",
        "nth-last-[1_of_.passed]:bg-keyword/20",
        "nth-last-[1_of_.passed]:border-l-keyword",
      )}
    >
      <li
        className={clsx(
          "font-bold",
          isPassed ? "text-stone-800" : "text-stone-800/70",
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
    <ul className={clsx('p-6 bg-stone-50 mx-4', className)}>
      <div className="flex flex-col border-stone-800/70 border-l-2">
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


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
  const [isAtHeading, setIsAtHeading] = useState(false);
  const content = documentToPlainTextString(node);
  const anchor = kebabCase(content);
  const level = node.nodeType.split('-')[1];

  useEffect(() => {
    const handleScroll = () => {
      const heading = document.querySelector<HTMLHeadingElement>(`#${anchor}`);
      const midScreen = window.scrollY + window.innerHeight / 2;

      if (heading) setIsAtHeading(midScreen > heading.offsetTop);
    }

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, [, anchor]);

  return (
    <li>
      <a
        href={`#${anchor}`}
        className={clsx(
          "font-bold text-l",
          isAtHeading && "before:content-['>']",
        )}
        style={{
          paddingLeft: `${8 * parseInt(level)}px`
        }}
      >
        {content}
      </a>
    </li>
  );
}

export const Navigator: FC<{ body: BlogPostBody; className?: string }> = ({ body, className }) => {
  const headings = extractHeadings(body.json);

  return (
    <ul className={clsx('p-6 bg-stone-50/70', className)}>
      {headings.map((heading, i) => (
        <NavigatorEntry
          key={`heading-${i}`}
          node={heading}
        />
      ))}
    </ul>
  )
}


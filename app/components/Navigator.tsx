"use client";

import { FC, useEffect, useState } from "react";
import clsx from "clsx";
import { Block } from "@contentful/rich-text-types";
import { documentToPlainTextString } from "@contentful/rich-text-plain-text-renderer";
import kebabCase from "lodash/kebabCase";
import { CommonNode } from "@contentful/rich-text-react-renderer";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { BlogPost } from "@/app/graphql/graphql";
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
        "-ml-[2px] border-l-2",
        "font-medium text-base/loose",
        isPassed && "passed",
        isPassed
          ? "border-slate-400 text-slate-500"
          : "border-slate-300 text-slate-600",
        "nth-last-[1_of_.passed]:bg-slate-200!",
        "nth-last-[1_of_.passed]:border-l-slate-800!",
        "nth-last-[1_of_.passed]:text-slate-800!",
        "nth-last-[1_of_.passed]:font-bold",
        "rounded-r-lg",
        "transition-colors duration-75",
      )}
    >
      <li
        className="overflow-hidden text-ellipsis whitespace-nowrap"
        style={{ paddingLeft: `${12 * parseInt(level)}px` }}
      >
        {content}
      </li>
    </a>
  );
}

export const Navigator: FC<{ post: NonNullable<BlogPost>; className?: string }> = ({
  post,
  className
}) => {
  const router = useRouter();
  const title = post.title;
  const subtitle = post.subtitle;
  const publishDate = post.sys.publishedAt;
  const headings = extractHeadings(post.body?.json);

  return (
    <div className={clsx(
      'p-4 max-w-xs bg-extralight rounded-2xl hidden xl:flex flex-col gap-4',
      className
    )}>
      <div className="w-full flex justify-between gap-16 font-medium text-sm leading-none">
        <button
          role="link"
          className="text-deep-600 cursor-pointer"
          onClick={() => router.back()}
        >
          <ArrowLeft size={16} className="inline align-text-bottom cursor-pointer" />
          &nbsp;Back
        </button>
        <span className="text-deep-500 text-sm leading-none">{
          (new Date(publishDate)).toLocaleDateString(navigator.language, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>
      <div className="leading-none">
        <h2 className="font-bold mb-2">{title}</h2>
        <p className="text-sm text-deep-600 font-medium">{subtitle}</p>
      </div>
      {headings.length ? (
        <ul className="flex flex-col border-slate-800/70 border-l-2">
          {headings.map((heading, i) => (
            <NavigatorEntry
              key={`heading-${i}`}
              node={heading}
            />
          ))}
        </ul>
      ) : null}
    </div>
  )
}


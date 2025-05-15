import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import "highlight.js/styles/github.css";

import { Flipbook } from '@/app/components/Flipbook';

hljs.registerLanguage("typescript", typescript);

const frames = [
  hljs.highlight('let something = ░', { language: 'typescript' }).value,
  hljs.highlight('let something = █', { language: 'typescript' }).value,
];

export const Header = () => {
  return (
    <header className="flex flex-col items-center">
      <h1>
        <Flipbook<HTMLPreElement>
          className="font-mono text-3xl my-12 cursor-default"
          frames={frames}
          intervalMs={650}
          elementType="pre"
          useInnerHtml
        />
      </h1>
    </header>
  )
}

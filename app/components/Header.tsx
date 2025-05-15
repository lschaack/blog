'use client';

import { useEffect, useState } from "react";

// ----------------------------------------------------------------------------
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import "highlight.js/styles/github.css";

hljs.registerLanguage("typescript", typescript);
// ----------------------------------------------------------------------------

export const Header = () => {
  const [content, setContent] = useState('let something = █');

  useEffect(() => {
    const intervalId = setInterval(() => {
      setContent(prev => `${prev.substring(0, prev.length - 1)}${prev.endsWith('█') ? '░' : '█'}`)
    }, 650);

    return () => clearInterval(intervalId);
  }, []);

  const highlighted = hljs.highlight(content, { language: 'typescript' });

  return (
    <header className="flex flex-col items-center">
      <h1>
        <pre className="font-mono text-3xl my-12" dangerouslySetInnerHTML={{
          __html: highlighted.value
        }} />
      </h1>
    </header>
  )
}

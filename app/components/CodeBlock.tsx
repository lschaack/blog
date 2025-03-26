import type { CodeBlock as CodeBlockType } from "@/app/graphql/graphql";

import { RichTextError } from "@/app/components/RichTextError";

import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import "highlight.js/styles/github.css";

hljs.registerLanguage("typescript", typescript);

export const CodeBlock = ({ entry }: { entry: CodeBlockType }) => {
  if (!entry.code || !entry.language) {
    return <RichTextError>Code block missing code or language</RichTextError>;
  } else {
    const highlighted = hljs.highlight(entry.code, { language: entry.language });

    return (
      <pre className="p-4 bg-stone-100 rounded-lg">
        <code dangerouslySetInnerHTML={{ __html: highlighted.value }} />
      </pre>
    );
  }
}

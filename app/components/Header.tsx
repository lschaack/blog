import Link from "next/link";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import "highlight.js/styles/monokai.css";

import { SignPost } from "@/app/components/SignPost";
import { FrameRateChecker } from "@/app/components/FrameRateChecker";

hljs.registerLanguage("typescript", typescript);

const highlighted = hljs.highlight('let something', { language: 'typescript' }).value;

export const Header = () => {
  return (
    <header className="flex flex-col items-center">
      <div className="absolute top-0 left-0 h-full">
        <FrameRateChecker />
      </div>
      <Link href="/" className="my-12 cursor-pointer">
        <SignPost>
          <h1 className="p-4 hljs">
            <pre
              className="font-geist-mono text-3xl"
              dangerouslySetInnerHTML={{
                __html: highlighted
              }}
            />
          </h1>
        </SignPost>
      </Link>
      <div className="absolute top-0 right-4 h-full">
        <div
          id="debug-menu-surface"
          className="sticky top-4 z-50"
        />
      </div>
    </header>
  )
}

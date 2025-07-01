import Link from "next/link";
import clsx from "clsx";

import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import "highlight.js/styles/monokai.css";

import { SignPost } from "@/app/components/SignPost";

hljs.registerLanguage("typescript", typescript);

const highlighted = hljs.highlight('let something', { language: 'typescript' }).value;

export const Header = () => {
  return (
    <header className="relative py-12 flex flex-col items-center overflow-visible">
      <div
        className={clsx(
          "absolute before:-z-10",
          "inset-0",
          "bg-[url(/stacked-waves-haikei.svg)]",
          "bg-cover before:bg-no-repeat",
          "bg-top",
        )}
      />
      <Link href="/" className="cursor-pointer">
        <SignPost>
          {/* NOTE: backdrop-blur here is just a sort of antialiasing on the
            * transformed element */}
          <h1 className="p-4 hljs backdrop-blur-xs">
            <pre
              className="font-geist-mono text-3xl"
              dangerouslySetInnerHTML={{
                __html: highlighted
              }}
            />
          </h1>
        </SignPost>
      </Link>
    </header>
  )
}

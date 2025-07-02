import Link from "next/link";

import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import "highlight.js/styles/night-owl.css";

import { SignPost } from "@/app/components/SignPost";
import clsx from "clsx";

hljs.registerLanguage("typescript", typescript);

const highlighted = hljs.highlight('let something', { language: 'typescript' }).value;

export const Header = () => {
  return (
    <header className={clsx(
      "relative pt-17 pb-23 flex flex-col items-center overflow-visible",
      "bg-[url(/stacked-waves-haikei-night-owl.svg)] bg-center bg-cover 2xl:bg-[length:100%_100%]"
    )}>
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

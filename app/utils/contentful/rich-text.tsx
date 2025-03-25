import Image from "next/image";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import "highlight.js/styles/github.css";

import { DEMOS } from "@/app/demos";
import { Asset, BlogPostBodyLinks, Entry } from "@/app/graphql/graphql";
import { documentToReactComponents, type Options } from "@contentful/rich-text-react-renderer";
import { BLOCKS, Document, INLINES } from "@contentful/rich-text-types";
import { isCaptionedImage, isCodeBlock, isDemo } from "./predicates";
import { CaptionedImage } from "@/app/components/CaptionedImage";

hljs.registerLanguage("typescript", typescript);

const NEXT_KNOWN_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
  "tiff",
];

export const DEFAULT_RICH_TEXT_OPTIONS: Options = {
  renderNode: {
    [BLOCKS.PARAGRAPH]: (_, children) => (
      <p className="my-4">{children}</p>
    ),
    [BLOCKS.HEADING_1]: (_, children) => (
      <h1 className="text-3xl font-bold mt-9 mb-3">{children}</h1>
    ),
    [BLOCKS.HEADING_2]: (_, children) => (
      <h2 className="text-2xl font-bold mt-6 mb-1">{children}</h2>
    ),
    [BLOCKS.HEADING_3]: (_, children) => (
      <h3 className="text-xl font-bold mt-4 mb-1">{children}</h3>
    ),
    [BLOCKS.HEADING_4]: (_, children) => (
      <h4 className="text-lg font-bold mt-2">{children}</h4>
    ),
    [BLOCKS.UL_LIST]: (_, children) => (
      <ul className="list-disc list-inside my-4">{children}</ul>
    ),
    [BLOCKS.LIST_ITEM]: (node) => (
      // avoid wrapping li text children in <p> tags for styling
      // https://github.com/contentful/rich-text/issues/126
      <li>
        {documentToReactComponents(node as Document, {
          renderNode: {
            ...DEFAULT_RICH_TEXT_OPTIONS.renderNode,
            [BLOCKS.PARAGRAPH]: (_, children) => children,
            [BLOCKS.LIST_ITEM]: (_, children) => children,
          }
        })}
      </li>
    ),
    [INLINES.HYPERLINK]: (node, children) => (
      <a
        href={node.data.uri}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-wavy"
      >
        {children}
      </a>
    )
  },
};

export const getBlogPostOptions = (links: BlogPostBodyLinks): Options => {
  const assetMap = new Map<string, Asset>();
  if (links.assets?.block) {
    for (const asset of links.assets.block) {
      if (asset) assetMap.set(asset.sys.id, asset);
    }
  }

  const entryMap = new Map<string, Entry>();
  if (links.entries?.block) {
    for (const entry of links.entries.block) {
      if (entry) entryMap.set(entry.sys.id, entry);
    }
  }

  if (links.entries?.inline) {
    for (const entry of links.entries.inline) {
      if (entry) entryMap.set(entry.sys.id, entry);
    }
  }

  return {
    renderNode: {
      ...DEFAULT_RICH_TEXT_OPTIONS.renderNode,
      [BLOCKS.EMBEDDED_ENTRY]: node => {
        const entry = entryMap.get(node.data.target.sys.id);

        if (isDemo(entry)) {
          const Demo = DEMOS[entry.id as keyof typeof DEMOS];

          if (!Demo) {
            return <p>Unknown demo: {entry.id}</p>;
          } else {
            return <Demo />;
          }
        } else if (isCodeBlock(entry)) {
          if (!entry.code || !entry.language) {
            return <pre>Code block missing code or language</pre>;
          } else {
            const highlighted = hljs.highlight(entry.code, { language: entry.language });

            return (
              <pre className="p-4 bg-stone-100 rounded-lg">
                <code dangerouslySetInnerHTML={{ __html: highlighted.value }} />
              </pre>
            );
          }
        } else if (isCaptionedImage(entry)) {
          return <CaptionedImage entry={entry} />;
        }
      },
      [BLOCKS.EMBEDDED_ASSET]: node => {
        const asset = assetMap.get(node.data.target.sys.id);

        if (asset) {
          if (asset.url) {
            if (asset.url.endsWith(".webm")) {
              return <video src={asset.url} autoPlay playsInline muted loop />;
            } else if (NEXT_KNOWN_IMAGE_EXTENSIONS.some(ext => asset.url?.endsWith(ext))) {
              return (
                <Image
                  src={asset.url}
                  alt={asset.description!}
                  width={asset.width!}
                  height={asset.height!}
                  className="my-8"
                />
              );
            } else {
              return <p>unknown asset type: {asset.url}</p>;
            }
          }
        } else {
          return <p>Unknown asset: {node.data.target.sys.id}</p>;
        }
      }
    }
  }
}

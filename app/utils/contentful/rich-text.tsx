import Image from "next/image";
import { documentToReactComponents, type Options } from "@contentful/rich-text-react-renderer";
import { documentToPlainTextString } from '@contentful/rich-text-plain-text-renderer';
import { BLOCKS, INLINES, Document } from "@contentful/rich-text-types";

import { Asset, BlogPostBodyLinks, Entry } from "@/app/graphql/graphql";
import { isCaptionedImage, isCodeBlock, isDemo } from "@/app/utils/contentful/predicates";
import { CaptionedImage } from "@/app/components/CaptionedImage";
import { CodeBlock } from "@/app/components/CodeBlock";
import { RichTextError } from "@/app/components/RichTextError";
import { Demo } from "@/app/demos";
import { kebabCase } from "lodash/fp";

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
      <p className="text-lg my-4">{children}</p>
    ),
    [BLOCKS.HEADING_1]: (node, children) => (
      <h1
        className="text-3xl font-bold mt-9 mb-3"
        id={kebabCase(documentToPlainTextString(node))}
      >
        {children}
      </h1>
    ),
    [BLOCKS.HEADING_2]: (node, children) => (
      <h2
        className="text-2xl font-bold mt-7 mb-1"
        id={kebabCase(documentToPlainTextString(node))}
      >
        {children}
      </h2>
    ),
    [BLOCKS.HEADING_3]: (node, children) => (
      <h3
        className="text-xl font-bold mt-2 mb-1"
        id={kebabCase(documentToPlainTextString(node))}
      >
        {children}
      </h3>
    ),
    [BLOCKS.HEADING_4]: (node, children) => (
      <h4
        className="text-lg font-bold mt-2"
        id={kebabCase(documentToPlainTextString(node))}
      >
        {children}
      </h4>
    ),
    [BLOCKS.UL_LIST]: (_, children) => (
      <ul className="list-disc list-inside my-4 pl-6">{children}</ul>
    ),
    [BLOCKS.LIST_ITEM]: (node) => (
      // avoid wrapping li text children in <p> tags for styling
      // https://github.com/contentful/rich-text/issues/126
      documentToReactComponents(node as Document, {
        renderNode: {
          ...DEFAULT_RICH_TEXT_OPTIONS.renderNode,
          [BLOCKS.PARAGRAPH]: (_, children) => children,
          // 22px below is a janky workaround for default list behavior not
          // having any indent on lines after the first, could be better...
          [BLOCKS.LIST_ITEM]: (_, children) => <li className="my-2 -indent-[22px]">{children}</li>,
          [BLOCKS.UL_LIST]: (_, children) => (
            <ul className="list-disc list-inside my-2 pl-6">{children}</ul>
          ),
        }
      })
    ),
    [INLINES.HYPERLINK]: (node, children) => (
      <a
        href={node.data.uri}
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        {children}
      </a>
    )
  },
};

export const getBlogPostOptions = (links: Partial<BlogPostBodyLinks>): Options => {
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

        if (!entry) {
          return (
            <RichTextError>
              Unknown entry: {node.data.target.sys.id}
            </RichTextError>
          );
        } else if (isDemo(entry)) {
          return <Demo entry={entry} />;
        } else if (isCodeBlock(entry)) {
          return <CodeBlock entry={entry} />;
        } else if (isCaptionedImage(entry)) {
          return <CaptionedImage entry={entry} />;
        }
      },
      [BLOCKS.EMBEDDED_ASSET]: node => {
        const asset = assetMap.get(node.data.target.sys.id);

        if (asset) {
          if (asset.url) {
            if (asset.url.endsWith(".webm")) {
              return (
                <video
                  src={asset.url}
                  width={asset.width!}
                  height={asset.height!}
                  autoPlay
                  playsInline
                  muted
                  loop
                />
              );
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
              return (
                <RichTextError>
                  Unknown asset type: {asset.url}
                </RichTextError>
              );
            }
          }
        } else {
          return (
            <RichTextError>
              Unknown asset: {node.data.target.sys.id}
            </RichTextError>
          )
        }
      }
    }
  }
}

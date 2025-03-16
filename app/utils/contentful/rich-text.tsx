import { DEMOS } from "@/app/demos";
import { Asset, BlogPostBodyLinks, Entry } from "@/app/graphql/graphql";
import type { Options } from "@contentful/rich-text-react-renderer";
import { BLOCKS } from "@contentful/rich-text-types";
import { isDemo } from "./predicates";

export const DEFAULT_RICH_TEXT_OPTIONS: Options = {
  renderNode: {},
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
        }
      }
    }
  }
}

import type { Entry, Demo, CodeBlock, CaptionedImage } from "@/app/graphql/graphql";

export const isDemo = (entry: Entry | undefined): entry is Demo => {
  return (entry as Demo)?.__typename === "Demo";
}

export const isCodeBlock = (entry: Entry | undefined): entry is CodeBlock => {
  return (entry as CodeBlock)?.__typename === "CodeBlock";
}

export const isCaptionedImage = (entry: Entry | undefined): entry is CaptionedImage => {
  return (entry as CaptionedImage)?.__typename === "CaptionedImage";
}

import type { Entry, Demo, CodeBlock } from "@/app/graphql/graphql";

export const isDemo = (entry: Entry | undefined): entry is Demo => {
  return (entry as Demo)?.__typename === "Demo";
}

export const isCodeBlock = (entry: Entry | undefined): entry is CodeBlock => {
  return (entry as CodeBlock)?.__typename === "CodeBlock";
}

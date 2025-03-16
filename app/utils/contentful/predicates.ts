import { Entry, Demo } from "@/app/graphql/graphql";

export const isDemo = (entry: Entry | undefined): entry is Demo => {
  return (entry as Demo)?.__typename === "Demo";
}

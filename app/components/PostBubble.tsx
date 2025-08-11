import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { DeepPartial } from "@apollo/client/utilities";

import { BlogPost, Demo as DemoType } from "@/app/graphql/graphql";
import { HoverBubble } from "@/app/components/HoverBubble";
import { Demo } from "@/app/demos";

type PostBubbleContentsProps = {
  post: DeepPartial<BlogPost>;
}
const PostBubbleContents = memo(function PostBubbleContents({ post }: PostBubbleContentsProps) {
  return (
    <li className="w-full min-w-64 relative overflow-hidden rounded-[inherit]">
      <div className="relative w-full aspect-2/1 flex flex-col justify-center items-center">
        {post.heroDemo ? (
          <div className="p-2 m-auto">
            <Demo entry={post.heroDemo as DemoType} />
          </div>
        ) : post.heroImage ? (
          <Image
            src={post.heroImage.url!}
            alt={post.heroImage.description!}
            className="object-contain"
            sizes="384px"
            fill
          />
        ) : (
          null
        )}
      </div>
      <div className="p-3">
        <h2 className="text-2xl font-bold">
          {post.title}
        </h2>
        <p className="text-sm mb-1">
          {(new Date(post.sys?.publishedAt)).toLocaleDateString(navigator.language, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <p>
          {post.subtitle}
        </p>
      </div>
    </li>
  )
});

type PostBubbleProps = {
  post: DeepPartial<BlogPost>;
  moveOnMount?: boolean;
  className?: string;
};
export const PostBubble = memo(function PostBubble({
  post,
  moveOnMount,
  className
}: PostBubbleProps) {
  return (
    <Link
      href={`/posts/${post.slug}`}
      className={className}
    >
      <HoverBubble moveOnMount={moveOnMount}>
        <PostBubbleContents post={post} />
      </HoverBubble>
    </Link>
  );
});


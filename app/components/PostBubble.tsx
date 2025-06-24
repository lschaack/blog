import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { DeepPartial } from "@apollo/client/utilities";
import { simpleFaker } from '@faker-js/faker';

import { BlogPost } from "@/app/graphql/graphql";
import { HoverBubble } from "@/app/components/HoverBubble";
import clsx from "clsx";

type PostBubbleContentsProps = {
  post: DeepPartial<BlogPost>;
}
const PostBubbleContents = memo(function PostBubbleContents({ post }: PostBubbleContentsProps) {
  return (
    <li className="w-full max-w-96 relative overflow-hidden">
      <div className="relative w-full aspect-2/1">
        {post.heroImage && (
          <Image
            src={post.heroImage.url!}
            alt={post.heroImage.description!}
            className="object-cover"
            sizes="384px"
            fill
          />
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
  fake?: boolean;
  moveOnMount?: boolean;
  className?: string;
};
export const PostBubble = memo(function PostBubble({
  post,
  fake = false,
  moveOnMount,
  className
}: PostBubbleProps) {
  const uuid = simpleFaker.string.uuid();

  return (
    <Link
      href={fake ? post.slug! : `/posts/${post.slug}`}
      key={post.sys?.id}
      className={clsx(fake && 'pointer-events-none', className)}
    >
      <HoverBubble moveOnMount={moveOnMount} uuid={uuid}>
        <PostBubbleContents post={post} />
      </HoverBubble>
    </Link>
  );
});


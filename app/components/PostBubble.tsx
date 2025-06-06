import Image from "next/image";
import Link from "next/link";
import { DeepPartial } from "@apollo/client/utilities";

import { BlogPost } from "@/app/graphql/graphql";
import { HoverBubble } from "@/app/components/HoverBubble";

type PostBubbleProps = {
  post: DeepPartial<BlogPost>;
  fake?: boolean;
};
export const PostBubble = ({ post, fake = false }: PostBubbleProps) => {
  return (
    <Link
      href={fake ? post.slug! : `/posts/${post.slug}`}
      key={post.sys?.id}
    >
      <HoverBubble boundaryWidth={8} showBubble>
        <li className="w-full max-w-96 relative overflow-hidden">
          <div className="relative w-full aspect-2/1">
            {post.heroImage && (
              <Image
                src={post.heroImage.url!}
                alt={post.heroImage.description!}
                className="object-cover"
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
      </HoverBubble>
    </Link>
  );
}


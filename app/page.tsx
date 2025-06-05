import { notFound } from "next/navigation";
import Image from "next/image";

import { client } from "@/app/utils/contentful/client";
import { getAllPosts } from "@/app/queries/getAllPosts";
import { GetAllPostsQuery } from "@/app/graphql/graphql";
import { HoverBubble } from "@/app/components/HoverBubble";
import { fill } from "lodash";

const LIMIT = 20;

const getPosts = (skip: number, limit: number) => {
  return client.query<GetAllPostsQuery>({
    query: getAllPosts,
    variables: {
      preview: process.env.NODE_ENV === 'development',
      skip,
      limit,
    }
  });
}

// TODO: Basic pagination logic, not gonna matter for a super long time
export default async function Home() {
  const res = await getPosts(0, LIMIT);

  const posts = res.data.blogPostCollection?.items;

  if (!posts) {
    // TODO: this isn't really right...but good enough for now
    return notFound();
  } else {
    return (
      <div>
        <ul className="flex flex-wrap justify-center gap-4 max-w-7xl">
          {posts.map(post => post?.slug && (
            fill(Array(20), undefined).map((_, i) => (
              <a
                href={`/posts/${post.slug}`}
                key={`${post.sys.id}-${i}`}
              >
                <HoverBubble boundaryWidth={8} showBubble debug>
                  <li className="max-w-96 relative rounded-3xl overflow-hidden">
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
                        {(new Date(post.sys.publishedAt)).toLocaleDateString(navigator.language, {
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
              </a>
            ))
          ))}
        </ul>
      </div >
    );
  }
}

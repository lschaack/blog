import { notFound } from "next/navigation";

import { client } from "@/app/utils/contentful/client";
import { getAllPosts } from "@/app/queries/getAllPosts";
import { GetAllPostsQuery } from "@/app/graphql/graphql";
import { HoverBubble } from "@/app/components/HoverBubble";

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
        <ul className="flex flex-wrap gap-16 max-w-4xl">
          {posts.map(post => post?.slug && (
            <a
              href={`/posts/${post.slug}`}
              key={post.sys.id}
            >
              <HoverBubble boundaryWidth={8} showBubble>
                <li className="max-w-96 p-2">
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
                </li>
              </HoverBubble>
            </a>
          ))}
        </ul>
      </div >
    );
  }
}

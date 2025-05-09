import { notFound } from "next/navigation";

import { client } from "@/app/utils/contentful/client";
import { getAllPosts } from "@/app/queries/getAllPosts";
import { GetAllPostsQuery } from "@/app/graphql/graphql";

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
        <h1>Hello</h1>
        <ul>
          {posts.map(post => post?.slug && (
            <a key={post.sys.id} href={`/posts/${post.slug}`}>{post.title}</a>
          ))}
        </ul>
      </div>
    );
  }
}

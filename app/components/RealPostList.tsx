"use server";

import { client } from "@/app/utils/contentful/client";
import { getAllPosts } from "@/app/queries/getAllPosts";
import { GetAllPostsQuery } from "@/app/graphql/graphql";
import { PostBubble } from "@/app/components/PostBubble";

// TODO: Basic pagination logic, not gonna matter for a super long time
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

export const RealPostList = async () => {
  const res = await getPosts(0, LIMIT);

  const realPosts = res.data.blogPostCollection?.items ?? [];

  return (
    <>
      {realPosts.map((post, index) => post?.slug && (
        <PostBubble
          post={post}
          key={post.sys.id}
          seed={index}
        />
      ))}
    </>
  );
}

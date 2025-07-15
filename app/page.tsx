import { client } from "@/app/utils/contentful/client";
import { getAllPosts } from "@/app/queries/getAllPosts";
import { GetAllPostsQuery } from "@/app/graphql/graphql";
import { PostBubble } from "@/app/components/PostBubble";
import { BatchedAnimationContextProvider } from "@/app/hooks/useBatchedAnimation";

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

const PostList = async () => {
  const res = await getPosts(0, LIMIT);

  const posts = res.data.blogPostCollection?.items ?? [];

  return (
    <>
      {posts.map(post => post?.slug && (
        <PostBubble
          post={post}
          key={post.sys.id}
        />
      ))}
    </>
  );
}

export default async function Home() {
  return (
    <div>
      <ul className="grid auto-cols-fr justify-center items-center gap-4 max-w-7xl">
        <BatchedAnimationContextProvider>
          <PostList />
        </BatchedAnimationContextProvider>
      </ul>
    </div>
  );
}

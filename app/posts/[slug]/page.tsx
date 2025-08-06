import { notFound } from "next/navigation";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";

import { getBlogPostOptions } from "@/app/utils/contentful/rich-text";
import { client, preview } from "@/app/utils/contentful/client";
import { getBlogPostWithSlug } from "@/app/queries/getBlogPostWithSlug";
import { BlogPost, BlogPostBodyLinks, GetBlogPostWithSlugQuery } from "@/app/graphql/graphql";
import { Navigator } from '@/app/components/Navigator';

const getEntriesMatchingSlug = (slug: string) => {
  return client.query<GetBlogPostWithSlugQuery>({
    query: getBlogPostWithSlug,
    variables: {
      preview,
      slug
    }
  });
}


export default async function Post({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const res = await getEntriesMatchingSlug(slug)

  const post = res.data.blogPostCollection?.items[0];

  if (!post) {
    notFound();
  } else {
    return (
      <div className="flex justify-center w-full">
        <div className="grow relative">
          <div className="h-full absolute right-0">
            {post.body && (
              <Navigator
                className="sticky top-10 self-start mx-6"
                post={post as BlogPost}
              />
            )}
          </div>
        </div>
        <article className="max-w-2xl px-6 py-2 rounded-2xl bg-extralight overflow-hidden md:overflow-visible break-words">
          {post.body && documentToReactComponents(
            post.body.json,
            getBlogPostOptions(post.body.links as BlogPostBodyLinks)
          )}
        </article>
        <div className="grow" />
      </div>
    );
  }
}

import { notFound } from "next/navigation";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";

import { getBlogPostOptions } from "@/app/utils/contentful/rich-text";
import { client } from "@/app/utils/contentful/client";
import { getBlogPostWithSlug } from "@/app/queries/getBlogPostWithSlug";
import { BlogPostBody, BlogPostBodyLinks, GetBlogPostWithSlugQuery } from "@/app/graphql/graphql";
import { Navigator } from '@/app/components/Navigator';

const getEntriesMatchingSlug = (slug: string) => {
  return client.query<GetBlogPostWithSlugQuery>({
    query: getBlogPostWithSlug,
    variables: {
      preview: process.env.NODE_ENV === 'development',
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
        {post.body && (
          //null
          <Navigator
            className="sticky top-8 self-start"
            body={post.body as BlogPostBody}
          />
        )}
        <article className="max-w-2xl px-6 py-2 bg-stone-50/70 overflow-hidden md:overflow-visible">
          {post.body && documentToReactComponents(
            post.body.json,
            getBlogPostOptions(post.body.links as BlogPostBodyLinks)
          )}
        </article>
      </div>
    );
  }
}

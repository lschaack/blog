import { notFound } from "next/navigation";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { getBlogPostOptions } from "@/app/utils/contentful/rich-text";
import { client } from "@/app/utils/contentful/client";
import { getBlogPostWithSlug } from "@/app/queries/getBlogPostWithSlug";

const getEntriesMatchingSlug = (slug: string) => {
  return client.query({
    query: getBlogPostWithSlug,
    variables: {
      preview: true,
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

  const post = res.data.blogPostCollection.items[0];

  if (!post) {
    notFound();
  } else {
    return (
      <main className="max-w-2xl mx-auto">
        {documentToReactComponents(post.body.json, getBlogPostOptions(post.body.links))}
      </main>
    );
  }
}

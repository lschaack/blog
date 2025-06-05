import { notFound } from "next/navigation";
import Image from "next/image";
import { fill } from "lodash";
import { faker } from '@faker-js/faker';
import { DeepPartial } from "@apollo/client/utilities";

import { client } from "@/app/utils/contentful/client";
import { getAllPosts } from "@/app/queries/getAllPosts";
import { BlogPost, GetAllPostsQuery } from "@/app/graphql/graphql";
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

type PostBubbleProps = { post: DeepPartial<BlogPost> };
const PostBubble = ({ post }: PostBubbleProps) => {
  return (
    <a
      href={`/posts/${post.slug}`}
      key={post.sys?.id}
    >
      <HoverBubble boundaryWidth={8} showBubble>
        <li className="w-full max-w-96 relative rounded-3xl overflow-hidden">
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
    </a>
  );
}

const getMockPost = (): DeepPartial<BlogPost> => {
  return {
    sys: {
      id: faker.string.uuid(),
      publishedAt: faker.date.past(),
    },
    slug: '/',
    title: faker.lorem.words(),
    subtitle: faker.lorem.paragraph({ min: 1, max: 2 }),
    heroImage: {
      url: faker.image.urlPicsumPhotos({ width: 400, height: 200 }),
      description: faker.lorem.sentence(),
    }
  }
}

// TODO: Basic pagination logic, not gonna matter for a super long time
export default async function Home() {
  const fakePosts = fill(Array(8), undefined).map(getMockPost);
  const res = await getPosts(0, LIMIT);

  const realPosts = res.data.blogPostCollection?.items;

  if (!realPosts) {
    // TODO: this isn't really right...but good enough for now
    return notFound();
  } else {
    return (
      <div>
        <ul className="flex flex-wrap justify-center gap-4 max-w-7xl">
          {realPosts.map(post => post?.slug && (
            <PostBubble
              post={post}
              key={post.sys.id}
            />
          ))}
          {fakePosts.map(post => post!.slug && (
            <PostBubble
              post={post}
              key={post.sys!.id}
            />
          ))}
        </ul>
      </div >
    );
  }
}

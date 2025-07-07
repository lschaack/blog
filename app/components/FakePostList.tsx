"use client";

import { useCallback, useMemo, useState } from "react";
import startCase from "lodash/startCase";
import { faker } from '@faker-js/faker';
import { DeepPartial } from "@apollo/client/utilities";

import { BlogPost } from "@/app/graphql/graphql";
import { PostBubble } from "@/app/components/PostBubble";
import { HoverBubble } from "@/app/components/HoverBubble";
import { BubbleConfigurator } from "@/app/components/BubbleConfigurator";

const MAX_FAKE_POSTS = 8;

const THREE_FRAMES = 3000 / 60;

const pregenerated = new Map<number, DeepPartial<BlogPost>>();

const getMockPost = (seed: number): DeepPartial<BlogPost> => {
  if (!pregenerated.get(seed)) {
    faker.seed(seed);

    pregenerated.set(seed, {
      sys: {
        id: faker.string.uuid(),
        publishedAt: faker.date.past(),
      },
      slug: '/',
      title: startCase(faker.lorem.words()),
      subtitle: faker.lorem.paragraph({ min: 1, max: 2 }),
      heroImage: {
        url: faker.image.urlPicsumPhotos({ width: 400, height: 200 }),
        description: faker.lorem.sentence(),
      }
    });
  }

  return pregenerated.get(seed)!;
}

export const FakePostList = () => {
  const [howMany, setHowMany] = useState(0);
  const fakePosts = useMemo(() => (
    Array
      .from({ length: MAX_FAKE_POSTS })
      .map((_, i) => getMockPost(i))
  ), []);

  const handleAddPosts = useCallback(() => {
    const intervalId = setInterval(() => {
      setHowMany(prev => {
        const next = prev + 1;

        if (next >= MAX_FAKE_POSTS) clearInterval(intervalId);

        return next;
      });
    }, THREE_FRAMES);
  }, []);

  return (
    <>
      <BubbleConfigurator />

      {howMany === 0 ? (
        <div onClick={handleAddPosts}>
          <button>
            <HoverBubble>
              <div className="p-16 font-bold text-3xl max-w-96">
                I wanna see more bubbles, fake me some posts
              </div>
            </HoverBubble>
          </button>
        </div>
      ) : (
        <>
          {fakePosts.slice(0, howMany).map(post => post!.slug && (
            <PostBubble
              post={post}
              key={post.sys!.id}
              fake
              moveOnMount
            />
          ))}
        </>
      )}
    </>
  );
}

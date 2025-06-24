"use client";

import { FakePostList } from "@/app/components/FakePostList";
import { RealPostList } from "@/app/components/RealPostList";
import { BatchedAnimationContextProvider } from "@/app/hooks/useBatchedAnimation";

export const PostList = () => {
  return (
    <BatchedAnimationContextProvider>
      <RealPostList />
      <FakePostList />
    </BatchedAnimationContextProvider>
  );
}

"use client";

import { FakePostList } from "@/app/components/FakePostList";
import { RealPostList } from "@/app/components/RealPostList";

export const PostList = () => {
  return (
    <>
      <RealPostList />
      <FakePostList />
    </>
  );
}

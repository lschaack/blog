"use client";

import { useState } from "react";

import type { TrainingExampleService } from "@/app/lib/trainingExampleService";
import { ExampleBrowser } from "./ExampleBrowser";
import { TagsInFilter } from "./TagFilter";
import { TagService } from "@/app/lib/tagService";

const getTrainingExamples = (searchParams: URLSearchParams) => {
  return fetch(
    `/api/exquisite-corpse/training-examples?${searchParams.toString()}`,
    { method: 'GET' }
  );
}

type ExampleLoaderProps = {
  initialState: {
    examples: Awaited<ReturnType<TrainingExampleService['getExamples']>>['items'];
    allTags: Awaited<ReturnType<TagService['getTags']>>;
    page: number;
    perPage: number;
    totalPages: number;
    tags: TagsInFilter;
  }
}
export function ExampleLoader({
  initialState: {
    examples: initialExamples,
    page: initialPage,
    perPage: initialPerPage,
    totalPages: initialTotalPages,
    allTags: initialAllTags,
    tags: initialTagsInFilter,
  }
}: ExampleLoaderProps) {
  const [examples, setExamples] = useState(initialExamples);
  const [page, setPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(initialPerPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [allTags] = useState(initialAllTags);
  const [tagsInFilter, setTagsInFilter] = useState(initialTagsInFilter);

  const handleQueryChange = async (params: URLSearchParams) => {
    if (!params.has('page')) {
      params.set('page', '1');
    }

    if (!params.has('perPage')) {
      params.set('perPage', '12');
    }

    try {

      const response = await getTrainingExamples(params);

      if (response.ok) {
        const { items, totalPages }: Awaited<ReturnType<TrainingExampleService['getExamples']>> = await response.json();

        setExamples(items);
        setTotalPages(totalPages);
      } else {
        console.error(response.json());
      }
    } catch (e) {
      // TODO: toast
      console.error(e);
    }
  }

  // - update query param w/window.history.pushState if one is tied to it
  // - then fetch and set relevant data
  const handlePageChange = (page: number) => {
    setPage(page);

    const url = new URL(window.location.href);
    url.searchParams.set('page', Math.max(0, Math.min(page, totalPages)).toString());
    window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);

    handleQueryChange(url.searchParams);
  }

  const handlePerPageChange = (perPage: number) => {
    setPerPage(perPage);

    const url = new URL(window.location.href);
    url.searchParams.set('perPage', Math.min(perPage, 100).toString());
    window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);

    handleQueryChange(url.searchParams);
  }

  const handleTagsChange = (tagsInFilter: TagsInFilter) => {
    setTagsInFilter(tagsInFilter);

    const url = new URL(window.location.href);

    if (tagsInFilter === undefined) {
      url.searchParams.delete('tags');
    } else {
      url.searchParams.set('tags', tagsInFilter.join(','));
    }

    window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);

    handleQueryChange(url.searchParams);
  }

  return (
    <ExampleBrowser
      tags={allTags}
      examples={examples}
      page={page}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      filter={{ tags: tagsInFilter }}
      onFilterChange={filter => handleTagsChange(filter.tags)}
    />
  )
}

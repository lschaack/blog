"use client";

import { useState } from "react";

import type { GameService } from "@/app/lib/gameService";
import { GameBrowser } from "./GameBrowser";

const getGames = (searchParams: URLSearchParams) => {
  return fetch(
    `/api/exquisite-corpse/games?${searchParams.toString()}`,
    { method: 'GET' }
  );
}

type GameLoaderProps = {
  initialState: {
    games: Awaited<ReturnType<GameService['getGames']>>['items'];
    page: number;
    perPage: number;
    totalPages: number;
    totalItems: number;
  }
}

export function GameLoader({
  initialState: {
    games: initialGames,
    page: initialPage,
    perPage: initialPerPage,
    totalPages: initialTotalPages,
    totalItems: initialTotalItems,
  }
}: GameLoaderProps) {
  const [games, setGames] = useState(initialGames);
  const [page, setPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(initialPerPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalItems, setTotalItems] = useState(initialTotalItems);

  const handleQueryChange = async (params: URLSearchParams) => {
    if (!params.has('page')) {
      params.set('page', '1');
    }

    if (!params.has('perPage')) {
      params.set('perPage', '12');
    }

    try {
      const response = await getGames(params);

      if (response.ok) {
        const { items, totalItems, totalPages }: Awaited<ReturnType<GameService['getGames']>> = await response.json();

        setGames(items);
        setTotalItems(totalItems);
        setTotalPages(totalPages);
      } else {
        console.error(response.json());
      }
    } catch (e) {
      console.error(e);
    }
  }

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

  return (
    <GameBrowser
      games={games}
      page={page}
      perPage={perPage}
      onPerPageChange={handlePerPageChange}
      totalPages={totalPages}
      totalItems={totalItems}
      onPageChange={handlePageChange}
    />
  )
}

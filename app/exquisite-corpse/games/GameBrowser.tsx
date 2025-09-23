import Link from "next/link";

import { prisma, Prisma } from "@/app/lib/prisma";
import { MultiplayerGameState } from "@/app/types/multiplayer";
import { GameCard } from "./GameCard";
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

type PageNavProps = {
  page: number;
  totalPages: number;
}
function PageNav({ page, totalPages }: PageNavProps) {
  const maxPageCharCount = totalPages.toString().length;

  return (
    <nav className="flex justify-center">
      <ol className="flex gap-2 font-geist-mono">
        <li>
          <Link href="?page=1">
            <ChevronFirst />
          </Link>
        </li>
        <li>
          <Link href={`?page=${Math.max(page - 1, 1)}`}>
            <ChevronLeft />
          </Link>
        </li>
        <p>
          {page.toString().padStart(maxPageCharCount, ' ')} / {totalPages.toString()}
        </p>
        <li>
          <Link href={`?page=${Math.min(page + 1, totalPages)}`}>
            <ChevronRight />
          </Link>
        </li>
        <li>
          <Link href={`?page=${totalPages}`}>
            <ChevronLast />
          </Link>
        </li>
      </ol>
    </nav>
  )
}

type GameBrowserProps = {
  page: number;
  perPage?: number;
}
export async function GameBrowser({
  page,
  perPage: perPage = 2,
}: GameBrowserProps) {
  const [pageData, totalCount] = await Promise.all([
    prisma.exquisiteCorpseGame.findMany({
      where: {
        data: {
          path: ['turns', '0'],
          not: Prisma.JsonNull,
        }
      },
      take: perPage,
      skip: (Math.max(page - 1, 0) * perPage),
      orderBy: {
        createdAt: 'desc',
      }
    }),
    prisma.exquisiteCorpseGame.count({
      where: {
        data: {
          path: ['turns', '0'],
          not: Prisma.JsonNull,
        }
      }
    }),
  ]);

  const totalPages = Math.ceil(totalCount / perPage);

  return (
    <div className="flex flex-col gap-4">
      <PageNav
        page={page}
        totalPages={totalPages}
      />

      <ul
        className={clsx(
          "gap-4 grid auto-rows-fr grid-flow-row",
          "sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        )}
      >
        {(pageData.map(game => (
          <li key={game.id}>
            <GameCard gameData={game.data as MultiplayerGameState} />
          </li>
        )))}
      </ul>

      <PageNav
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}

import { MultiplayerGameState } from "@/app/types/multiplayer";
import { GameCard } from "./GameCard";
import clsx from "clsx";
import { type GameService } from "@/app/lib/gameService";
import { PageNav } from "../PageNav";

type GameBrowserProps = {
  games: Awaited<ReturnType<GameService['getGames']>>['items'];
  page: number;
  perPage: number;
  onPerPageChange: (perPage: number) => void;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function GameBrowser({
  games,
  page,
  totalPages,
  onPageChange,
}: GameBrowserProps) {
  return (
    <div className="flex flex-col gap-4">
      <PageNav
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />

      <ul
        className={clsx(
          "gap-4 grid auto-rows-fr grid-flow-row",
          "sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        )}
      >
        {games.map(game => (
          <li key={game.id}>
            <GameCard gameData={game.data as MultiplayerGameState} />
          </li>
        ))}
      </ul>

      <PageNav
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}

import { prisma, Prisma } from "@/app/lib/prisma";
import { toLimitOffset } from "../utils/pagination";

export class GameService {
  async getGames(page: number, perPage: number) {
    const { limit, offset } = toLimitOffset({ page, perPage });

    const [items, totalCount] = await Promise.all([
      prisma.exquisiteCorpseGame.findMany({
        where: {
          data: {
            path: ['turns', '0'],
            not: Prisma.JsonNull,
          }
        },
        take: limit,
        skip: offset,
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

    const totalPages = Math.ceil(totalCount / limit);

    return { items, totalItems: totalCount, totalPages };
  }
}

let gameService: GameService | null = null;

export const getGameService = (): GameService => {
  if (!gameService) {
    gameService = new GameService();
  }
  return gameService;
};

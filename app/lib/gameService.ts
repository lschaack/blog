import { prisma, Prisma } from "@/app/lib/prisma";

export class GameService {
  async getGames(limit: number, offset: number) {
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

    const total = Math.ceil(totalCount / limit);

    return { items, total };
  }
}

let gameService: GameService | null = null;

export const getGameService = (): GameService => {
  if (!gameService) {
    gameService = new GameService();
  }
  return gameService;
};

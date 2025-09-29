import { prisma } from "@/app/lib/prisma";

export class TrainingExampleService {
  async getExamples(limit: number, offset: number) {
    const [items, totalCount] = await Promise.all([
      prisma.exquisiteCorpseTrainingExample.findMany({
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: 'desc',
        }
      }),
      prisma.exquisiteCorpseTrainingExample.count(),
    ]);

    const total = Math.ceil(totalCount / limit);

    return { items, total };
  }
}

let trainingExampleService: TrainingExampleService | null = null;

export const getTrainingExampleService = (): TrainingExampleService => {
  if (!trainingExampleService) {
    trainingExampleService = new TrainingExampleService();
  }
  return trainingExampleService;
};

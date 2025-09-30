import { prisma } from "@/app/lib/prisma";
import type { TrainingExample } from "@/app/api/exquisite-corpse/schemas";

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

  async getExample(id: string) {
    return prisma.exquisiteCorpseTrainingExample.findUnique({
      where: { id }
    });
  }

  async createExample(data: TrainingExample) {
    const { tags, ...example } = data;

    return prisma.exquisiteCorpseTrainingExample.create({
      data: {
        ...example,
        tags: {
          create: tags.map(tagName => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: { name: tagName },
              }
            }
          }))
        }
      }
    });
  }

  async updateExample(id: string, data: TrainingExample) {
    const { tags, ...example } = data;

    return prisma.exquisiteCorpseTrainingExample.update({
      where: { id },
      data: {
        ...example,
        tags: {
          create: tags.map(tagName => ({
            tag: { connect: { name: tagName } }
          }))
        }
      }
    });
  }

  async deleteExample(id: string) {
    return prisma.exquisiteCorpseTrainingExample.delete({
      where: { id }
    });
  }
}

let trainingExampleService: TrainingExampleService | null = null;

export const getTrainingExampleService = (): TrainingExampleService => {
  if (!trainingExampleService) {
    trainingExampleService = new TrainingExampleService();
  }
  return trainingExampleService;
};

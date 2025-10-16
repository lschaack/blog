import { prisma } from "@/app/lib/prisma";
import type { TrainingExample } from "@/app/api/exquisite-corpse/schemas";

export class TrainingExampleService {
  async getExamples(limit: number, offset: number, tagNames?: string[]) {
    // Build the where clause based on tag filtering
    const where = tagNames !== undefined
      ? tagNames.length === 0
        // Empty array means filter for examples with no tags
        ? { tags: { none: {} } }
        // Non-empty array means filter for examples that have ALL specified tags
        : {
          tags: {
            some: {
              tag: {
                name: {
                  in: tagNames
                }
              }
            }
          }
        }
      : {};

    const [items, totalCount] = await Promise.all([
      prisma.exquisiteCorpseTrainingExample.findMany({
        take: limit,
        skip: offset,
        where,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          tags: {
            include: {
              tag: true
            }
          }
        }
      }),
      prisma.exquisiteCorpseTrainingExample.count({ where }),
    ]);

    const total = Math.ceil(totalCount / limit);

    return { items, total };
  }

  async getExample(id: string) {
    return prisma.exquisiteCorpseTrainingExample.findUnique({
      where: { id },
      include: {
        tags: {
          select: {
            tag: true
          }
        }
      }
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

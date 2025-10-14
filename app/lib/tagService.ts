import { prisma, Prisma } from "@/app/lib/prisma";
import { Session } from "next-auth";

export class TagService {
  async getTags(session?: Session | null) {
    if (!session) {
      throw new Error("Unauthorized");
    }

    return await prisma.exquisiteCorpseTag.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async createTag(name: string, session?: Session | null) {
    if (!session) {
      throw new Error("Unauthorized");
    }

    try {
      return await prisma.exquisiteCorpseTag.create({
        data: { name },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error("Tag name already exists");
      }
      throw error;
    }
  }

  async updateTag(id: string, name: string, session?: Session | null) {
    if (!session) {
      throw new Error("Unauthorized");
    }

    try {
      return await prisma.exquisiteCorpseTag.update({
        where: { id },
        data: { name },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error("Tag name already exists");
        }
        if (error.code === 'P2025') {
          throw new Error("Tag not found");
        }
      }
      throw error;
    }
  }

  async deleteTag(id: string, session?: Session | null) {
    if (!session) {
      throw new Error("Unauthorized");
    }

    try {
      return await prisma.exquisiteCorpseTag.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error("Tag not found");
      }
      throw error;
    }
  }
}

let tagService: TagService | null = null;

export const getTagService = (): TagService => {
  if (!tagService) {
    tagService = new TagService();
  }
  return tagService;
};

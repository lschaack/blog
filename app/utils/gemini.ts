import { z } from "zod";

// TODO: This should be much more generic...mimeType is not literally always png
export const ResponsePartSchema = z.object({
  text: z.string().optional(),
  inlineData: z.object({
    data: z.string(),
    mimeType: z.literal('image/png')
  }).optional()
});

export const GeminiResponseSchema = z.object({
  candidates: z.array(z.object({
    content: z.object({
      parts: z.array(ResponsePartSchema)
    }).optional()
  })).optional()
});


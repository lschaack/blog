import parseSvgPath from 'parse-svg-path';
import z from 'zod';

const BASE64_PNG_PREFIX = 'data:image/png;base64,';
// https://gist.github.com/ondrek/7413434
const BASE64_MIN_CHARS = 32;

const Base64ImageSchema = z.string()
  .startsWith(BASE64_PNG_PREFIX, 'Image must be well-formed base64 including prefix')
  .min(BASE64_MIN_CHARS, 'Missing image data');

const BaseTurnSchema = z.object({
  author: z.enum(['user', 'ai'], {
    message: 'Turn author must be either "user" or "ai"',
  }),
  number: z.number({
    message: 'Missing turn number',
  }),
  timestamp: z
    .string()
    .min(1, 'Missing turn timestamp')
    .datetime({ message: 'Turn timestamp must be an ISO datetime' }),
});

const BaseGameContextSchema = z.object({
  image: Base64ImageSchema,
  canvasDimensions: z.object({
    width: z.number({ message: 'Missing canvas width' }),
    height: z.number({ message: 'Missing canvas height' }),
  }),
  currentTurn: z.number({ message: 'Missing current turn number' }),
}, {
  message: 'Missing game context',
});

function createGameContextSchema<TurnSchema extends typeof BaseTurnSchema>(turnSchema: TurnSchema) {
  return BaseGameContextSchema.extend({
    history: z.array(turnSchema)
  })
}

export const LineSchema = z.string()
  .min(1, 'Path cannot be empty')
  .transform((string, ctx) => {
    // extract the `d` property
    const match = string.match(/^([MLHVCSQTAZ0-9\s,.\-+]+)$/);

    if (!match) {
      ctx.addIssue({
        code: "custom",
        message: "Path must be a single line of only absolute (uppercase) commands",
      });

      return z.NEVER;
    }

    const path = match[1];

    return parseSvgPath(path);
  });

const CurveTurnSchema = BaseTurnSchema.extend({
  path: LineSchema,
});

const ImageTurnSchema = BaseTurnSchema.extend({
  image: Base64ImageSchema,
});

export const CurveGameContextSchema = createGameContextSchema(CurveTurnSchema);
export const ImageGameContextSchema = createGameContextSchema(ImageTurnSchema);

export const PlayerNameSchema = z.string().min(1, "playerName cannot be empty");

import { SESSION_ID_MATCHER } from '@/app/exquisite-corpse/sessionId';
import parseSvgPath from 'parse-svg-path';
import z from 'zod';

export const BASE64_PNG_PREFIX = 'data:image/png;base64,';
// https://gist.github.com/ondrek/7413434
const BASE64_MIN_CHARS = 32;

export const MAX_PLAYER_NAME_LENGTH = 24;

const Base64ImageSchema = z.string()
  .startsWith(BASE64_PNG_PREFIX, 'Image missing base64 prefix')
  .regex(/^[A-Za-z0-9+/]*={0,2}$/, '')
  .min(BASE64_MIN_CHARS, 'Missing image data');

const BaseTurnSchema = z.object({
  author: z.enum(['user', 'AI'], {
    message: 'Turn author must be either "user" or "AI"',
  }),
  timestamp: z
    .string({ message: 'Missing turn timestamp' })
    .datetime({ message: 'Turn timestamp must be an ISO datetime' }),
});

const BaseGameContextSchema = z.object({
  image: Base64ImageSchema.optional(),
  canvasDimensions: z.object({
    width: z.number({ message: 'Missing canvas width' }),
    height: z.number({ message: 'Missing canvas height' }),
  }),
}, {
  message: 'Missing game context',
});

function createGameContextSchema<TurnSchema extends typeof BaseTurnSchema>(turnSchema: TurnSchema) {
  return BaseGameContextSchema.extend({
    history: z.array(turnSchema)
  })
}

export const RawPathSchema = z.string()
  .min(1, 'Missing path')
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

const MoveToSchema = z.tuple([z.enum(['M', 'm']), z.number(), z.number()]);
const LineToSchema = z.tuple([z.enum(['L', 'l']), z.number(), z.number()]);
const HorizontalLineToSchema = z.tuple([z.enum(['H', 'h']), z.number()]);
const VerticalLineToSchema = z.tuple([z.enum(['V', 'v']), z.number()]);
const CubicBezierSchema = z.tuple([z.enum(['C', 'c']), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]);
const SmoothCubicBezierSchema = z.tuple([z.enum(['S', 's']), z.number(), z.number(), z.number(), z.number()]);
const QuadraticBezierSchema = z.tuple([z.enum(['Q', 'q']), z.number(), z.number(), z.number(), z.number()]);
const SmoothQuadraticBezierSchema = z.tuple([z.enum(['T', 't']), z.number(), z.number()]);
const ArcSchema = z.tuple([z.enum(['A', 'a']), z.number(), z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]);
const ClosePathSchema = z.tuple([z.enum(['Z', 'z'])]);
const PathCommandSchema = z.union([
  MoveToSchema,
  LineToSchema,
  HorizontalLineToSchema,
  VerticalLineToSchema,
  CubicBezierSchema,
  SmoothCubicBezierSchema,
  QuadraticBezierSchema,
  SmoothQuadraticBezierSchema,
  ArcSchema,
  ClosePathSchema,
]);
export const ParsedPathSchema = z.array(PathCommandSchema);

export const CurveTurnSchema = BaseTurnSchema.extend({
  path: ParsedPathSchema,
});

export const ImageTurnSchema = BaseTurnSchema.extend({
  image: Base64ImageSchema,
});

export const CurveGameContextSchema = createGameContextSchema(CurveTurnSchema);
// NOTE: There is an ImageTurnSchema representing complete image turns, but
// we shouldn't be sending every image to the backend on every turn
export const ImageGameContextSchema = createGameContextSchema(BaseTurnSchema);

export const CreateGameRequestSchema = z.object({
  gameType: z.union([z.literal("multiplayer"), z.literal("singleplayer")], {
    message: "Invalid gameType. Must be \"multiplayer\" or \"singleplayer\""
  }),
});
export type CreateGameRequest = z.infer<typeof CreateGameRequestSchema>;
export type GameType = CreateGameRequest['gameType'];

export const SessionIdSchema = z.string().regex(SESSION_ID_MATCHER, {
  message: "Session ID must be a five-character string of uppercase letters and numbers"
});

export const GameParamsSchema = z.object({
  sessionId: SessionIdSchema,
});
export type GameParams = z.infer<typeof GameParamsSchema>;

export const JoinGameRequestSchema = z.object({
  playerName: z
    .string()
    .min(1, 'Missing player name')
    .max(MAX_PLAYER_NAME_LENGTH, `Player name cannot be longer than ${MAX_PLAYER_NAME_LENGTH} chars`),
});
export type JoinGameRequest = z.infer<typeof JoinGameRequestSchema>;

export const CreateWithPlayerRequestSchema = CreateGameRequestSchema.merge(JoinGameRequestSchema);
export type CreateWithPlayerRequest = z.infer<typeof CreateWithPlayerRequestSchema>;

# CLAUDE.md

@package.json
@prisma/schema.prisma
@app/schema.graphql

@.env
@.env.local
@.env.development.local

@README.md
@eslint.config.mjs

## Project Structure

### Content Management

- `app/utils/contentful/` - Contentful integration
  - `client.ts` - Apollo Client configuration
  - `predicates.ts` - Type predicates for Contentful entries
  - `rich-text.tsx` - Rich text rendering components
- `app/queries/` - GraphQL queries
- `app/graphql/` - Generated GraphQL types and fragments
- `app/schema.graphql` - Generated Contentful schema
- `codegen.ts` - GraphQL Code Generator configuration

### Interactive Features

- `app/demos/` - Interactive demo components embedded in blog posts
  - Lazy-loaded components organized by feature (bubble effects, dock magnification)
  - Demo registry in `index.tsx` maps Contentful demo IDs to components
- `app/components/` - Reusable UI components
  - Animation components (PostBubble, HoverBubble, etc.)
  - Debug utilities (DebugMenu, DebugToggle)
  - Content rendering (CodeBlock, CaptionedImage)
- `app/exquisite-corpse/` - Collaborative drawing game
  - Single-player and multiplayer modes
  - Real-time multiplayer using Redis pub/sub and SSE
  - AI integration with GPT-5

### Development Features

- **Debug System**: Global debug context with toggleable debug menu
- **Performance Monitoring**: Built-in performance marks for animation batching
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Image Optimization**: Next.js Image component with Contentful CDN integration

### Build Configuration

- **TypeScript**: Strict mode enabled with GraphQL plugin for query validation
- **ESLint**: Next.js recommended rules with TypeScript support
- **Tailwind**: v4 configuration with custom font variables
- **Next.js**: Image optimization configured for Contentful and placeholder services

## Development Workflow

When working with this codebase:

1. **New Demos**: Add to `app/demos/` and register in the DEMOS object
2. **Animation Work**: Use the batched animation system for performance
3. **Debugging**: Enable debug mode to access development tools
4. **Styling**: Use Tailwind classes; custom CSS in `globals.css` only when necessary

The codebase emphasizes performance optimization, particularly for animations, and provides a rich debugging experience for development.

- Minimize layout shift by disabling elements when they are unusable rather than removing them
- Shared types should be placed in a .d.ts file with a descriptive name of the corresponding project in the @app/types directory. Always single-source new uses of local types by moving them to this file rather than redefining them.
- Always single-source functions. If you find yourself redefining a function because it's not exported from another file, export it or move it to a common file if necessary to avoid circular dependencies

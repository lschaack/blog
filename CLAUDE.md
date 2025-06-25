# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with Turbopack (http://localhost:3000)
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint (Next.js + TypeScript config)
- `npm run codegen` - Generate GraphQL types from Contentful schema

### Type Checking
No dedicated typecheck script exists. Run `npx tsc --noEmit` to check TypeScript types.

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Content Management**: Contentful CMS with GraphQL API
- **GraphQL**: Apollo Client with code generation
- **Styling**: Tailwind CSS v4
- **Animation**: Custom animation system with batched updates
- **Typography**: Lato (body) and Geist Mono (code) fonts

### Project Structure

#### Core Application
- `app/` - Next.js App Router structure
  - `layout.tsx` - Root layout with DebugProvider and Header
  - `page.tsx` - Home page displaying blog posts
  - `posts/[slug]/page.tsx` - Individual blog post pages
  - `globals.css` - Global styles and Tailwind imports

#### Content Management
- `app/utils/contentful/` - Contentful integration
  - `client.ts` - Apollo Client configuration
  - `predicates.ts` - Type predicates for Contentful entries
  - `rich-text.tsx` - Rich text rendering components
- `app/queries/` - GraphQL queries
- `app/graphql/` - Generated GraphQL types and fragments
- `app/schema.graphql` - Generated Contentful schema
- `codegen.ts` - GraphQL Code Generator configuration

#### Interactive Features
- `app/demos/` - Interactive demo components embedded in blog posts
  - Lazy-loaded components organized by feature (bubble effects, dock magnification)
  - Demo registry in `index.tsx` maps Contentful demo IDs to components
- `app/components/` - Reusable UI components
  - Animation components (PostBubble, HoverBubble, etc.)
  - Debug utilities (DebugMenu, DebugToggle)
  - Content rendering (CodeBlock, CaptionedImage)

#### Animation System
- `app/hooks/` - Custom React hooks
  - `useBatchedAnimation.tsx` - Performance optimization for multiple animations
  - `useAnimationFrames.ts` - requestAnimationFrame wrapper
  - `useSpring.ts`, `useEaseTrigger.ts` - Physics-based animations
  - `useIsVisible.ts`, `useForceRenderOnResize.ts` - Viewport utilities
- `app/utils/` - Animation utilities
  - `easingFunctions.ts` - Custom easing curves
  - `lerp.ts`, `vector.ts` - Mathematical helpers
  - `requestEasingFrames.ts` - Frame-based animation timing

### Content Types
Contentful defines these content types:
- **BlogPost**: Main blog posts with rich text body, author, hero image, tags
- **Author**: Author profiles with name and profile picture
- **Demo**: Interactive components referenced by ID
- **CaptionedImage**: Images with captions for rich text embedding
- **CodeBlock**: Syntax-highlighted code snippets

### Environment Configuration
Required environment variables (defined in `.env`):
- `CONTENTFUL_SPACE_ID` - Contentful space identifier
- `CONTENTFUL_ENVIRONMENT_ID` - Contentful environment (typically "master")
- `CONTENTFUL_PREVIEW_TOKEN` - Preview API token (development)
- `CONTENTFUL_DELIVERY_TOKEN` - Delivery API token (production)

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

1. **Content Changes**: Run `npm run codegen` after Contentful schema changes
2. **New Demos**: Add to `app/demos/` and register in the DEMOS object
3. **Animation Work**: Use the batched animation system for performance
4. **Debugging**: Enable debug mode to access development tools
5. **Styling**: Use Tailwind classes; custom CSS in `globals.css` only when necessary

The codebase emphasizes performance optimization, particularly for animations, and provides a rich debugging experience for development.
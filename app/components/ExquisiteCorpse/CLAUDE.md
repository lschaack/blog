# Exquisite Corpse AI Drawing Game

Collaborative drawing game where users and AI take turns adding single lines to build up drawings together.

## Architecture

### Game Types

- **CurveGame**: User draws with Sketchpad, AI generates SVG paths via Gemini API  
- **ImageGame**: User draws on canvas, AI generates full images via Gemini image generation

### Key Components

- `Game.tsx` - Main orchestration with GameProvider context
- `CurveGame.tsx` / `ImageGame.tsx` - Specific game implementations  
- `gameReducer.ts` - State management with useReducer
- `*TurnRenderer.tsx` - Turn-specific UI components
- `Sketchpad.tsx` - Canvas drawing interface
- `geminiAI.ts` - API service for both curve and image generation

### State Flow

1. User completes turn → `end_user_turn` action
2. Auto-triggers AI turn processing via `useAITurn` hook
3. AI generates response → `end_ai_turn` action  
4. Turn navigation with `increment/decrement_current_turn`

### API Routes

- `/api/exquisite-corpse/draw-curve-gpt5/` - GPT-5 curve generation
- `/api/exquisite-corpse/draw-curve/` - Gemini curve generation
- `/api/exquisite-corpse/draw-image/` - Gemini image generation

## Development

### Environment Variables

```env
GEMINI_API_KEY=your_api_key
OPENAI_API_KEY=your_api_key  # for GPT-5 route
```

### Canvas Settings

- 512x512 pixels, DPI scaled
- 2px black strokes, round caps/joins

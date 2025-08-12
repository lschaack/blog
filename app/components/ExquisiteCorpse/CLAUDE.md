# Exquisite Corpse AI Drawing Game

This directory contains a complete AI-powered drawing game implementation based on the classic "exquisite corpse" collaborative drawing concept, where users and AI take turns adding single lines to build up a drawing together.

## Architecture Overview

### Core Philosophy
The game alternates between user and AI turns, with each participant adding exactly one artistic line to continue the drawing. The AI receives visual context (the current drawing as an image) and creates meaningful, artistic additions using Bezier curves.

### Component Structure

**Self-Contained Directory Structure:**
```
ExquisiteCorpse/
├── Game.tsx                # Main game orchestration with GameProvider
├── types.ts                # Generic turn types and game state definitions
├── gameReducer.ts          # useReducer-based game state management
├── GameContext.tsx         # React context for sharing game state
├── GameStatus.tsx          # Game status display component
├── CurrentTurn.tsx         # Sketchpad, undo/redo, end turn controls
├── TurnHistory.tsx         # Turn navigation and history display
├── ExportUtilities.tsx     # PNG and JSON export functionality
├── StateEditor.tsx         # JSON state editing component
├── TurnInfo.tsx            # Component for rendering turn information
├── Sketchpad.tsx           # Pure drawing canvas component
├── useCurrentTurn.ts       # Current turn line editing
├── useAITurn.ts            # AI turn processing and state
├── TrainingInterface.tsx   # Training data generation interface
├── useUndoRedo.ts          # Generic undo/redo functionality
├── geminiAI.ts             # Gemini API integration (self-contained)
├── imageContext.ts         # PNG rendering for AI context (self-contained)
├── lineConversion.ts       # Bezier curve processing (self-contained)
└── CLAUDE.md               # This documentation
```

**Self-Containment Benefits:**
- All game-specific utilities are co-located with the components
- No external dependencies on app/services/ or app/utils/
- Easy to move, copy, or refactor the entire game as a unit
- Clear boundaries between game logic and application utilities

## Game Flow

### Turn Sequence
1. **User Turn**: Draw line → End Turn → Auto-triggers AI turn
2. **AI Processing**: Render image → Send to Gemini → Process response  
3. **AI Turn**: Interprets drawing + Adds artistic line + Explains reasoning
4. **Repeat**: Continue alternating between user and AI

### State Management
- **Turn History**: Immutable array of completed turns with metadata
- **Current Turn**: Separate state for the line being drawn (with undo/redo)
- **Turn Navigation**: View any previous turn, but only edit current turn

## Component Deep Dive

### Game.tsx - Main Orchestration Component
**Responsibilities:**
- Mount all child components within GameContext.Provider
- Manage game state with useReducer
- Accept getAITurn prop for AI turn processing
- Auto-trigger AI turns when user completes their turn

**New Architecture:**
- Uses generic turn types (BaseTurn, CurveTurn, ImageTurn)
- Separates concerns into focused components
- Provides clean props interface for AI turn processing

### Component Architecture

#### GameContext.tsx - State Management
- React context provider for game state sharing
- Generic type support for different turn variants
- useReducer integration for state updates

#### GameStatus.tsx - Status Display
- Shows whose turn it is (user/AI/viewing)
- Displays AI processing status and errors
- Clean, focused status presentation

#### CurrentTurn.tsx - Interactive Controls
- Handles sketchpad interaction and drawing
- Manages undo/redo for current turn
- End turn functionality
- Takes renderTurn prop for turn display customization
- Supports readOnly mode for non-interactive states

#### TurnHistory.tsx - Navigation & History
- Previous/next turn navigation
- Reset functionality
- Turn history panel with AI interpretations
- Turn metadata display

#### ExportUtilities.tsx - Export Functions  
- PNG export functionality
- JSON export for game state
- Clean separation of export concerns

#### StateEditor.tsx - JSON Editing
- JSON state editing and restoration
- Validation and error handling
- Sync capabilities for state management

### Sketchpad.tsx - Pure Drawing Component
**Responsibilities:**
- Canvas rendering with DPI scaling for sharp display
- Mouse and touch event handling for drawing
- Real-time curve fitting during drawing using `fit-curve` package
- Animation loop for smooth drawing preview

**Key Features:**
- Takes `lines` prop and `handleAddLine` callback (controlled component)
- Supports both mouse and touch input
- Uses `useAnimationFrames` for performance optimization
- Fits Bezier curves in real-time as user draws

### Generic Turn System
**New Turn Architecture:**
- Base turn type with shared metadata
- Extensible for different turn variants (curve-based vs image-based games)
- Type-safe generic system supporting multiple game types

**Turn Type Structure:**
```typescript
// Base turn with shared fields
type BaseTurn = {
  author: "user" | "ai";   // Who created this turn
  timestamp: string;       // ISO timestamp
  number: number;          // Turn sequence number
  interpretation?: string; // AI's interpretation (AI turns only)
  reasoning?: string;      // AI's reasoning (AI turns only)
}

// Curve-based turn variant
type CurveTurn = BaseTurn & {
  line: Line;              // Array of Bezier curves
}

// Image-based turn variant  
type ImageTurn = BaseTurn & {
  image: string;           // base64-encoded PNG
}

// Union type for all variants
type Turn = CurveTurn | ImageTurn;
```

**Game State Management:**
```typescript
type SerializableGameState<T extends BaseTurn> = {
  turns: T[];
}

type GameState<T extends BaseTurn> = SerializableGameState<T> & {
  currentTurnIndex: number;
  isFirstTurn: boolean;
  isLastTurn: boolean;
}
```

### useCurrentTurn.ts - Line Editing State
**Responsibilities:**
- Manage the line being drawn in the current turn
- Handle undo/redo within the current turn only
- Enforce one-line-per-turn rule
- Reset state when turn ends

**Key Constraint:**
- Only allows one line per turn - new lines replace the current line
- Separate history from turn navigation (turn-specific undo/redo)

### useAITurn.ts - AI Processing Pipeline
**Responsibilities:**
- Orchestrate the complete AI turn generation process
- Provide loading states and error handling with retry
- Convert between game state and AI context format

**Processing Steps:**
1. **Image Context**: Render current drawing to base64 PNG
2. **Game History**: Summarize previous turns for AI context
3. **AI API Call**: Send to Gemini with comprehensive prompt
4. **Response Processing**: Convert AI Bezier curves to internal format
5. **Quality Enhancement**: Apply curve optimization

## AI Integration

### Gemini API Integration (geminiAI.ts)
**Location**: Self-contained within ExquisiteCorpse directory
**Model**: `gemini-2.0-flash-exp` for latest capabilities
**Input**: Base64 PNG image + structured game context
**Output**: JSON with interpretation, Bezier curves, and reasoning

### AI Response Format
```json
{
  "interpretation": "I see this is becoming a cat with pointed ears",
  "curves": [
    [[startX, startY], [cp1X, cp1Y], [cp2X, cp2Y], [endX, endY]]
  ],
  "reasoning": "I added a curved back line to complete the cat's body"
}
```

### Prompt Engineering Strategy
The AI prompt teaches:
- **Bezier curve concepts** and control point behavior
- **Artistic techniques** for natural, flowing lines
- **Connection strategies** to build on existing shapes
- **Composition awareness** for balanced additions
- **Examples** of effective curve construction

### Key Prompt Sections
1. **Drawing Rules**: Artistic guidelines and constraints
2. **Bezier Education**: Technical explanation with examples
3. **Artistic Tips**: How to create natural, flowing curves
4. **Task Structure**: Step-by-step analysis and creation process
5. **Output Format**: Exact JSON structure with validation

## Drawing Quality Improvements

### Evolution: Points → Bezier Curves
**Previous Approach**: AI provided coordinate points → fit-curve conversion
- **Problems**: Straight segments, poor connections, limited expressiveness

**Current Approach**: AI directly creates Bezier curves
- **Benefits**: Artistic flow, meaningful connections, rich expression

### Curve Quality Pipeline
1. **AI Generation**: Direct Bezier curve output with artistic intent
2. **Validation**: Structure and bounds checking
3. **Optimization**: Control point refinement and connection smoothing
4. **Final Processing**: Convert to internal line format

### Quality Enhancements (lineConversion.ts)
**Location**: Self-contained within ExquisiteCorpse directory
- **Smooth Connections**: Ensure curves connect properly in multi-curve lines
- **Control Point Optimization**: Prevent extreme curves, maintain natural flow
- **Bounds Validation**: Keep all points within canvas while preserving intent
- **Artistic Preservation**: Maintain AI's creative intent during processing

## Development Guidelines

### Adding New Features
1. **State Changes**: Consider impact on turn management and navigation
2. **AI Context**: Update prompt and context if adding visual elements
3. **UI Consistency**: Maintain turn-based interaction patterns
4. **Error Handling**: Plan for AI failures and network issues

### Performance Considerations
- **Image Rendering**: Use efficient canvas operations for AI context
- **API Calls**: Implement proper retry logic and rate limiting
- **Memory Management**: Clean up canvas contexts and image data
- **Animation**: Use `useAnimationFrames` for smooth performance

### Testing Strategies
- **Turn Flow**: Test user→AI→user sequences thoroughly
- **Error Recovery**: Test AI failures, network issues, malformed responses
- **Edge Cases**: Empty drawings, single points, extreme curve values
- **Cross-Platform**: Test mouse and touch interactions on different devices

## Configuration

### Environment Variables
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Canvas Settings
- **Dimensions**: 512x512 pixels (fixed for consistency)
- **DPI Scaling**: Automatic based on device pixel ratio
- **Line Style**: 2px black, round caps, round joins

### AI Parameters
- **Model**: `gemini-2.0-flash-exp`
- **Max Curves**: 1-3 Bezier curves per AI turn
- **Error Tolerance**: Built-in retry for transient failures
- **Image Size Limit**: 20MB for Gemini compatibility

## Troubleshooting

### Common Issues

**AI Not Responding:**
- Check API key in environment variables
- Verify network connectivity
- Check Gemini API status and quotas

**Poor AI Drawing Quality:**
- AI may need more context (add more turns to build pattern)
- Try clearing and starting fresh game
- Check if curves are being optimized properly

**Canvas Performance:**
- Verify DPI scaling is working correctly
- Check that animation loops are cleaning up properly
- Monitor memory usage with large numbers of curves

**Turn Navigation Issues:**
- Ensure turn state is being managed separately from line state
- Check that viewing mode properly disables editing
- Verify turn index boundaries are correct

### Debug Features
- **Turn History Panel**: Shows full turn metadata and AI reasoning
- **Console Logging**: AI responses and processing steps
- **Error Messages**: Categorized by type (network, AI, validation)
- **Export Functions**: JSON export for debugging game state

## Future Improvements

### Potential Enhancements
- **AI Styles**: Different AI personality modes (abstract, realistic, etc.)
- **Collaborative Mode**: Multiple human players + AI
- **Drawing Tools**: Different line weights, colors, textures
- **Advanced AI**: Chain-of-thought reasoning, style consistency
- **Social Features**: Share completed drawings, voting on favorites

### Technical Debt
- **Type Safety**: Improve AI response typing with better validation
- **Performance**: Optimize image rendering pipeline for larger canvases
- **Error Handling**: More granular error recovery strategies
- **Testing**: Add comprehensive unit tests for all hooks

## Integration Notes

This component system is designed to be:
- **Self-contained**: Minimal external dependencies
- **Configurable**: Easy to adjust canvas size, AI model, etc.
- **Extensible**: Clean architecture for adding features
- **Maintainable**: Clear separation of concerns and comprehensive documentation

The game integrates with the broader blog application through the demo system but operates independently with its own state management and API integrations.

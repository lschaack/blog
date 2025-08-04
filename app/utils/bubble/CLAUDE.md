# Bubble System Architecture

This directory contains the core bubble animation system used by the HoverBubble component. The system is designed with clean separation of concerns between physics simulation, visual presentation, and collision detection.

## Architecture Overview

The bubble system consists of three main classes that work together:

```
┌─────────────────┐    ┌──────────────────────┐
│  BubblePhysics  │    │ BubblePresentation   │
│                 │    │                      │
│ • Physics State │    │ • Visual Transform   │
│ • Force System  │    │ • Style Calculation  │
│ • Stability     │    │ • Collision Detection│
└─────────────────┘    └──────────────────────┘
         │                        │
         └────────┬───────────────┘
                  │
        ┌─────────────────┐
        │     Bubble      │
        │  (Coordinator)  │
        │                 │
        │ • Communication │
        │ • Integration   │
        │ • Orchestration │
        └─────────────────┘
                  │
        ┌─────────────────┐
        │   HoverBubble   │
        │   (Component)   │
        │                 │
        │ • DOM Updates   │
        │ • Event Handling│
        │ • UI Integration│
        └─────────────────┘
```

**Design Philosophy**: The system is designed with clear separation of concerns:
- **BubblePhysics**: Pure physics simulation
- **BubblePresentation**: DOM-agnostic visual calculations using abstract position/dimension properties
- **Bubble**: Coordinates communication between physics and presentation
- **HoverBubble**: Handles DOM-specific aspects and UI integration

## BubblePhysics Class

**Location**: `app/utils/bubble/BubblePhysics.ts`

### Responsibilities
- **Physics Simulation**: Manages offset, velocity, and force accumulation
- **Spring Forces**: Automatically applies restoring forces toward equilibrium
- **Stability Tracking**: Determines when animation should start/stop
- **State Management**: Provides readonly access to current physics state

### Key Methods
- `step(delta: number): void` - Advances physics simulation one frame
- `addImpulse(impulse: Vec2): void` - Adds external forces (from user interaction)
- `isStable(): boolean` - Checks if physics has reached equilibrium
- `getState(): Readonly<PhysicsState>` - Returns current offset, velocity, lerpedOffset
- `reset(randomize?: boolean, seed?: number): void` - Resets to initial state
- `updateConfiguration(options)` - Updates spring stiffness and sluggishness

### Physics State
```typescript
type PhysicsState = {
  offset: Vec2;        // Current displacement from equilibrium
  lerpedOffset: Vec2;  // Smoothed offset for visual presentation
  velocity: Vec2;      // Current velocity
}
```

### Key Features
- **Self-Contained**: Spring forces are applied automatically during `step()`
- **Stability Detection**: Automatically detects when motion has stopped
- **Zero Allocations**: Uses pre-allocated vectors for performance
- **Configurable**: Spring stiffness and damping can be adjusted

## BubblePresentation Class

**Location**: `app/utils/bubble/BubblePresentation.ts`

### Responsibilities
- **Visual Transformation**: Converts physics offsets to visual bubble shapes
- **Style Calculation**: Generates CSS transform and clip-path strings
- **Collision Detection**: Handles mouse interaction with bubble boundaries
- **Rectangle Management**: Manages geometric shapes for collision detection

### Key Methods
- `updateMeta(offset: Vec2): void` - Updates bubble dimensions and shapes
- `collide(currMouseX, currMouseY, prevMouseX, prevMouseY): Vec2 | null` - Collision detection
- `getOuterTransform(): string` - CSS transform for bubble element
- `getInnerTransform(offsetX, offsetY): string` - CSS transform for content
- `getInnerClipPath(offsetX, offsetY): string` - CSS clip path for content
- `updateConfiguration(options)` - Updates presentation parameters

### Bubble Metadata
```typescript
type BubbleMeta = {
  top: number;     // Top inset
  right: number;   // Right inset  
  bottom: number;  // Bottom inset
  left: number;    // Left inset
  width: number;   // Final bubble width
  height: number;  // Final bubble height
}
```

### Key Features
- **Lazy Style Calculation**: CSS strings computed only when requested
- **Collision System**: Complete mouse intersection detection with shape boundaries
- **Transform Management**: Handles all CSS transformations for bubble distortion
- **Boundary Handling**: Manages outer/inner rectangles and rounded shapes

### Configuration Options
```typescript
type BubblePresentationOptions = {
  overkill?: number;                        // Amplification factor for visual effect
  insetFilter?: (direction: number) => number; // Asymmetric distortion filter  
  width?: number;                           // Bubble width in stable state
  height?: number;                          // Bubble height in stable state
  boundary?: number;                        // Border thickness
  rounding?: number;                        // Corner radius
  x?: number;                               // Bubble x position in stable state
  y?: number;                               // Bubble y position in stable state
}
```

## Integration with HoverBubble

The HoverBubble component now uses the Bubble class for simplified orchestration:

1. **Instance Creation**: Creates separate BubblePhysics and BubblePresentation instances, then passes them to Bubble
2. **Unified Updates**: Calls `bubble.step(delta)` which handles both physics and presentation
3. **Collision Handling**: Uses `bubble.collide()` which handles detection and impulse application
4. **Style Application**: Accesses presentation instance directly for DOM updates
5. **Animation Control**: Uses `bubble.isStable()` to start/stop animation

### Simplified Update Cycle
```typescript
const update = (delta: number) => {
  bubble.step(delta);                     // 1. Advance physics & sync presentation
  updateStyles();                         // 2. Update DOM
  
  if (bubble.isStable()) {                // 3. Check if done
    setIsUpdatePending(false);
  }
};
```

### Mouse Interaction
```typescript
const handleMouseMove = (currX: number, currY: number, prevX: number, prevY: number) => {
  const intersectionVec = bubble.collide(currX, currY, prevX, prevY);
  if (intersectionVec && !isUpdatePending) {
    setIsUpdatePending(true);
  }
};
```

## Performance Considerations

### Zero-Allocation Design
- **Pre-allocated Arrays**: Collision detection uses Float64Array for segments
- **Reused Vectors**: All vector operations use mutable variants
- **Object Pooling**: Shapes and vectors are reused, not recreated
- **Lazy Computation**: Style strings only calculated when needed

### Caching Strategy
- **Style Cache**: CSS strings cached until metadata changes
- **Shape Reuse**: Collision shapes updated in-place
- **Batch Updates**: All style calculations done together when needed

## Common Usage Patterns

### Basic Bubble Creation
```typescript
// Create instances separately
const physics = new BubblePhysics({
  springStiffness: 0.1,
  sluggishness: 0.05
});

const presentation = new BubblePresentation({
  overkill: 2.5,
  boundary: 4,
  rounding: 24,
  width: 200,
  height: 100,
  x: 0,
  y: 0
});

// Pass instances to Bubble for coordination
const bubble = new Bubble(physics, presentation);
```

### Animation Loop
```typescript
// In animation frame callback
bubble.step(deltaTime);

// Apply styles using direct presentation access
element.style.transform = presentation.getOuterTransform();
content.style.clipPath = presentation.getInnerClipPath(offsetX, offsetY);
```

### Mouse Interaction
```typescript
// In mouse move handler
const intersectionVec = bubble.collide(currX, currY, prevX, prevY);
if (intersectionVec) {
  // Animation will start automatically via bubble.step()
  startAnimation();
}
```

## Extension Points

### Custom Physics
- Extend `BubblePhysicsOptions` for new physics parameters
- Override `updateConfiguration()` for custom physics behavior
- Add new force types by extending `addImpulse()` usage

### Custom Presentation
- Extend `BubblePresentationOptions` for new visual parameters
- Override style calculation methods for custom transforms
- Add new collision shapes by extending collision detection

### Performance Tuning
- Adjust `VELOCITY_ANIMATION_THRESHOLD` and `OFFSET_ANIMATION_THRESHOLD` in physics constants
- Modify cache invalidation logic for different update patterns
- Tune pre-allocation sizes for different collision complexity

## Bubble Class

**Location**: `app/utils/bubble/Bubble.ts`

### Responsibilities
- **Communication**: Manages interaction between BubblePhysics and BubblePresentation
- **Integration**: Automatically applies physics results to presentation layer
- **Orchestration**: Provides unified interface for bubble operations
- **Abstraction**: Simplifies usage by hiding inter-class communication details

### Key Methods
- `collide(currMouseX, currMouseY, prevMouseX, prevMouseY): Vec2 | null` - Handles collision detection and applies impulses
- `step(delta: number): void` - Advances physics and updates presentation
- `isStable(): boolean` - Checks if physics simulation has reached equilibrium
- `reset(randomize?: boolean, seed?: number): void` - Resets bubble to initial state

### Constructor
```typescript
constructor(physics: BubblePhysics, presentation: BubblePresentation)
```

### Key Features
- **Automated Communication**: Physics results automatically applied to presentation
- **Simplified Interface**: Focused purely on coordinating updates between physics and presentation
- **Instance Management**: Accepts and manages existing physics and presentation instances
- **No Configuration**: Does not handle configuration - instances should be configured before passing to Bubble

### Integration Flow
```typescript
// Create instances
const physics = new BubblePhysics({ springStiffness: 0.1, sluggishness: 0.05 });
const presentation = new BubblePresentation({ overkill: 2.5, boundary: 4 });
const bubble = new Bubble(physics, presentation);

// 1. Collision detection triggers physics impulse
bubble.collide(mouseX, mouseY, prevX, prevY);

// 2. Physics simulation updates and automatically syncs to presentation
bubble.step(deltaTime);

// 3. Access presentation directly for DOM updates
const transform = presentation.getOuterTransform();
```

## Debugging

### Debug Mode Integration
- Physics state can be inspected via `getState()`
- Bubble metadata and collision shapes can be inspected using debugger statements within class methods
- Stability state via `isStable()`

### Common Issues
- **No Animation**: Check if `isStable()` returns true, ensure impulses are being added
- **Jerky Motion**: Adjust spring stiffness and sluggishness parameters
- **Style Problems**: Verify presentation configuration matches bubble dimensions
- **Collision Issues**: Check shape boundaries and collision detection parameters
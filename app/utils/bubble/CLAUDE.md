# Bubble System Architecture

This directory contains the core bubble animation system used by the HoverBubble component. The system is designed with clean separation of concerns between physics simulation, visual presentation, and collision detection.

## Architecture Overview

The bubble system consists of two main classes that work together:

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
        │   HoverBubble   │
        │   (Component)   │
        │                 │
        │ • Orchestration │
        │ • DOM Updates   │
        │ • Event Handling│
        └─────────────────┘
```

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
- `getMeta(): Readonly<BubbleMeta>` - Current bubble dimensions
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
  width?: number;                           // Container width
  height?: number;                          // Container height
  boundary?: number;                        // Border thickness
  rounding?: number;                        // Corner radius
  containerOffsetLeft?: number;             // Container position
  containerOffsetTop?: number;              // Container position
}
```

## Integration with HoverBubble

The HoverBubble component orchestrates these classes:

1. **Physics Integration**: Calls `physics.step(delta)` each frame
2. **Presentation Updates**: Calls `presentation.updateMeta(lerpedOffset)` to sync visuals
3. **Style Application**: Uses presentation getters to update DOM styles
4. **Collision Handling**: Uses `presentation.collide()` to detect mouse interactions
5. **Animation Control**: Uses `physics.isStable()` to start/stop animation

### Typical Update Cycle
```typescript
const update = (delta: number) => {
  physics.step(delta);                    // 1. Advance physics
  
  updateBubbleMeta();                     // 2. Sync presentation
  updateStyles();                         // 3. Update DOM
  
  if (physics.isStable()) {               // 4. Check if done
    setIsUpdatePending(false);
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
const physics = new BubblePhysics({
  springStiffness: 0.1,
  sluggishness: 0.05
});

const presentation = new BubblePresentation({
  overkill: 2.5,
  boundary: 4,
  rounding: 24
});
```

### Animation Loop
```typescript
// In animation frame callback
physics.step(deltaTime);
presentation.updateMeta(physics.getState().lerpedOffset);

// Apply styles
element.style.transform = presentation.getOuterTransform();
content.style.clipPath = presentation.getInnerClipPath(offsetX, offsetY);
```

### Mouse Interaction
```typescript
// In mouse move handler
const force = presentation.collide(currX, currY, prevX, prevY);
if (force) {
  physics.addImpulse(force);
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

## Debugging

### Debug Mode Integration
- Physics state can be inspected via `getState()`
- Bubble metadata available via `getMeta()`
- Collision shapes accessible via `getOuterRectangle()`, `getInnerRectangle()`
- Stability state via `isStable()`

### Common Issues
- **No Animation**: Check if `isStable()` returns true, ensure impulses are being added
- **Jerky Motion**: Adjust spring stiffness and sluggishness parameters
- **Style Problems**: Verify presentation configuration matches bubble dimensions
- **Collision Issues**: Check shape boundaries and collision detection parameters
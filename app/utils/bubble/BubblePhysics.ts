import { randomLcg, randomUniform } from "d3-random";

import {
  VELOCITY_ANIMATION_THRESHOLD,
  OFFSET_ANIMATION_THRESHOLD,
  SPRING_STIFFNESS,
  getSpringForceVec2Mutable,
} from "@/app/utils/physicsConsts";
import {
  Vec2,
  magnitude,
  addVec2Mutable,
  createVec2,
  lerpVec2Mutable,
  zeroVec2,
  applyForcesMutable,
} from "@/app/utils/vector";

const INITIAL_OFFSET_RANGE = 60;
const INSET_OPTIONS = {
  min: -INITIAL_OFFSET_RANGE,
  max: INITIAL_OFFSET_RANGE
};

export type PhysicsState = {
  offset: Vec2;
  lerpedOffset: Vec2;
  velocity: Vec2;
}

export type BubblePhysicsOptions = {
  springStiffness?: number;
  sluggishness?: number;
  randomize?: boolean;
  seed?: number;
}

export class BubblePhysics {
  private offset: Vec2;
  private lerpedOffset: Vec2;
  private velocity: Vec2;
  private currentImpulse: Vec2;

  private springStiffness: number;
  private sluggishness: number;
  private isStableState: boolean;

  // Pre-allocated temporary vector for calculations
  private tempVec: Vec2;

  constructor(options: BubblePhysicsOptions = {}) {
    this.springStiffness = options.springStiffness ?? SPRING_STIFFNESS;
    this.sluggishness = options.sluggishness ?? 0.05;
    
    // Initialize vectors
    this.offset = createVec2();
    this.lerpedOffset = createVec2();
    this.velocity = createVec2();
    this.currentImpulse = createVec2();
    this.tempVec = createVec2();

    const randomize = options.randomize ?? false;
    // Start unstable if randomize is true (non-zero initial offset), stable otherwise
    this.isStableState = !randomize;
    
    this.reset(randomize, options.seed);
  }

  addImpulse(impulse: Vec2): void {
    addVec2Mutable(this.currentImpulse, impulse);
    this.isStableState = false; // Mark as unstable when impulse is added
  }

  private addSpringForce(): void {
    getSpringForceVec2Mutable(
      this.tempVec,
      this.offset,
      this.springStiffness,
    );

    addVec2Mutable(this.currentImpulse, this.tempVec);
  }

  step(delta: number): void {
    // Add spring force to restore equilibrium
    this.addSpringForce();
    
    applyForcesMutable(
      this.velocity,
      this.currentImpulse,
      delta,
    );

    zeroVec2(this.currentImpulse);

    // Check if animation should stop
    const shouldStop = (
      Math.abs(magnitude(this.velocity)) < VELOCITY_ANIMATION_THRESHOLD
      && this.offset.every(component => Math.abs(component) < OFFSET_ANIMATION_THRESHOLD)
    );

    if (shouldStop) {
      this.reset();
      this.isStableState = true;
    } else {
      addVec2Mutable(this.offset, this.velocity);
      lerpVec2Mutable(
        this.lerpedOffset,
        this.offset,
        this.sluggishness
      );
      this.isStableState = false;
    }
  }

  reset(randomize = false, seed?: number): void {
    if (randomize) {
      const { min, max } = INSET_OPTIONS;
      const random = randomUniform.source(randomLcg(seed))(min, max);

      this.offset[0] = random();
      this.offset[1] = random();
      this.lerpedOffset[0] = this.offset[0];
      this.lerpedOffset[1] = this.offset[1];
    } else {
      zeroVec2(this.offset);
      zeroVec2(this.lerpedOffset);
    }

    zeroVec2(this.velocity);
    zeroVec2(this.currentImpulse);
  }

  getState(): Readonly<PhysicsState> {
    return {
      offset: this.offset,
      lerpedOffset: this.lerpedOffset,
      velocity: this.velocity,
    };
  }

  updateConfiguration(options: BubblePhysicsOptions): void {
    if (options.springStiffness !== undefined) {
      this.springStiffness = options.springStiffness;
    }
    if (options.sluggishness !== undefined) {
      this.sluggishness = options.sluggishness;
    }
  }

  hasActiveForces(): boolean {
    const impulse = this.currentImpulse;
    return !(impulse[0] === 0 && impulse[1] === 0);
  }
  
  isStable(): boolean {
    return this.isStableState;
  }
}

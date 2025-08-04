import { Vec2 } from "@/app/utils/vector";
import { BubblePhysics } from "@/app/utils/bubble/BubblePhysics";
import { BubblePresentation } from "@/app/utils/bubble/BubblePresentation";

export class Bubble {
  private physics: BubblePhysics;
  private presentation: BubblePresentation;

  constructor(physics: BubblePhysics, presentation: BubblePresentation) {
    this.physics = physics;
    this.presentation = presentation;
  }

  collide(currMouseX: number, currMouseY: number, prevMouseX: number, prevMouseY: number): Vec2 | null {
    const intersectionVec = this.presentation.collide(currMouseX, currMouseY, prevMouseX, prevMouseY);
    
    if (intersectionVec) {
      this.physics.addImpulse(intersectionVec);
    }
    
    return intersectionVec;
  }

  step(delta: number): void {
    this.physics.step(delta);
    
    const { lerpedOffset } = this.physics.getState();
    this.presentation.updateMeta(lerpedOffset);
  }

  isStable(): boolean {
    return this.physics.isStable();
  }

  reset(randomize?: boolean, seed?: number): void {
    this.physics.reset(randomize, seed);
  }
}
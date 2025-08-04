import { Quadtree, Circle, Rectangle, Line } from '@timohausmann/quadtree-ts';
import { CirclePacker, PackingStrategy, RandomStrategy, PackingArea } from '@/app/utils/circlePacker';
import { Bubble } from '@/app/utils/bubble/Bubble';
import { BubblePhysics } from '@/app/utils/bubble/BubblePhysics';
import { BubblePresentation } from '@/app/utils/bubble/BubblePresentation';

export interface BubbleFieldProps {
  seed: number;
  packingStrategy: PackingStrategy;
  randomStrategy: RandomStrategy;
  minRadius: number;
  ratio: number;
  packingArea: PackingArea;
}

export class BubbleField {
  private rectangleQuadtree: Quadtree<Rectangle> | null = null;
  private bubbles: Bubble[] = [];
  private rectangleToBubbleMap: Map<Rectangle, Bubble> = new Map();
  private bubbleToRectangleMap: Map<Bubble, Rectangle> = new Map();
  private activeBubbles: Set<Bubble> = new Set();
  
  private packingArea: PackingArea;
  private seed: number;
  private packingStrategy: PackingStrategy;
  private randomStrategy: RandomStrategy;
  private minRadius: number;
  private ratio: number;

  constructor(props: BubbleFieldProps) {
    this.packingArea = props.packingArea;
    this.seed = props.seed;
    this.packingStrategy = props.packingStrategy;
    this.randomStrategy = props.randomStrategy;
    this.minRadius = props.minRadius;
    this.ratio = props.ratio;
  }

  async initialize(): Promise<void> {
    // Create and run CirclePacker
    const packer = new CirclePacker(
      this.packingArea,
      this.packingStrategy,
      this.randomStrategy,
      undefined,
      undefined,
      this.seed
    );

    const circleQuadtree = await packer.pack();
    
    // Generate rectangle quadtree and bubbles from circles
    this.generateRectangleQuadtreeAndBubbles(circleQuadtree);
  }

  private generateRectangleQuadtreeAndBubbles(circleQuadtree: Quadtree<Circle>): void {
    // Create new quadtree with same dimensions as circle quadtree
    const bounds = circleQuadtree.bounds;
    this.rectangleQuadtree = new Quadtree<Rectangle>({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      maxObjects: 10,
      maxLevels: 4
    });

    // Get all circles from the circle quadtree
    const allCircles = circleQuadtree.retrieve(new Rectangle(bounds));
    
    // Convert each circle to a rectangle and create corresponding bubble
    for (const circle of allCircles) {
      // Convert circle center position to rectangle top-left position
      const rectangle = new Rectangle({
        x: circle.x - circle.r, // Circle center to rectangle top-left
        y: circle.y - circle.r, // Circle center to rectangle top-left
        width: circle.r * 2,
        height: circle.r * 2
      });
      
      // Create BubblePhysics instance
      const physics = new BubblePhysics({
        springStiffness: 0.1,
        sluggishness: 0.05,
        randomize: false
      });

      // Create BubblePresentation instance
      const presentation = new BubblePresentation({
        width: circle.r * 2,
        height: circle.r * 2,
        x: circle.x - circle.r, // Convert center to top-left
        y: circle.y - circle.r, // Convert center to top-left
        boundary: 2,
        rounding: circle.r, // Use radius for full rounding
        overkill: 2
      });

      // Create Bubble instance
      const bubble = new Bubble(physics, presentation);
      
      // Store all mappings for O(1) access
      this.bubbles.push(bubble);
      this.rectangleToBubbleMap.set(rectangle, bubble);
      this.bubbleToRectangleMap.set(bubble, rectangle);
      
      // Insert rectangle into quadtree
      this.rectangleQuadtree.insert(rectangle);
    }
  }

  handleMouseMove(mouseX: number, mouseY: number, prevMouseX: number, prevMouseY: number): void {
    if (!this.rectangleQuadtree) return;

    // Create a line from previous to current mouse position
    const mouseLine = new Line({
      x1: prevMouseX,
      y1: prevMouseY,
      x2: mouseX,
      y2: mouseY
    });

    // Query quadtree for rectangles that might intersect with the mouse line
    const potentialRectangles = this.rectangleQuadtree.retrieve(mouseLine);
    
    // Check each rectangle for actual collision and trigger bubble collision
    for (const rectangle of potentialRectangles) {
      // O(1) lookup of bubble from rectangle
      const bubble = this.rectangleToBubbleMap.get(rectangle);
      if (!bubble) continue;

      // Perform collision detection using the bubble's collision system
      const intersectionVec = bubble.collide(mouseX, mouseY, prevMouseX, prevMouseY);
      
      if (intersectionVec) {
        // Add bubble to active set for updating
        this.activeBubbles.add(bubble);
      }
    }
  }

  step(deltaTime: number): void {
    const bubblesToRemove: Bubble[] = [];
    let i = 0;
    const totalActiveBubbles = this.activeBubbles.size;
    
    // Update all active bubbles
    for (const bubble of this.activeBubbles) {
      const isLastIteration = i === totalActiveBubbles - 1;
      
      bubble.step(deltaTime);
      
      // Always update rectangle position (even if stable, for final zeroed position)
      this.updateRectanglePosition(bubble, !isLastIteration);
      
      // Check if bubble has stabilized after updating position
      if (bubble.isStable()) {
        bubblesToRemove.push(bubble);
      }
      
      i++;
    }
    
    // Remove stabilized bubbles from active set
    for (const bubble of bubblesToRemove) {
      this.activeBubbles.delete(bubble);
    }
  }

  private updateRectanglePosition(bubble: Bubble, fast: boolean = false): void {
    // O(1) lookup of rectangle from bubble
    const rectangle = this.bubbleToRectangleMap.get(bubble);
    if (!rectangle || !this.rectangleQuadtree) return;

    // Remove rectangle from quadtree with fast parameter
    this.rectangleQuadtree.remove(rectangle, fast);
    
    // Get current bubble position from presentation meta
    const meta = bubble.getPresentation().getMeta();
    
    // Update rectangle position based on bubble's current presentation state
    // meta contains the current insets, so we need to calculate the actual bubble position
    rectangle.x = meta.left; // This is the current left position after insets
    rectangle.y = meta.top;  // This is the current top position after insets
    rectangle.width = meta.width;   // Current width after insets
    rectangle.height = meta.height; // Current height after insets
    
    // Re-insert rectangle with updated position
    this.rectangleQuadtree.insert(rectangle);
  }

  // Getter methods for external access if needed
  getActiveBubblesCount(): number {
    return this.activeBubbles.size;
  }

  getAllBubbles(): readonly Bubble[] {
    return this.bubbles;
  }

  getRectangleQuadtree(): Quadtree<Rectangle> | null {
    return this.rectangleQuadtree;
  }
}
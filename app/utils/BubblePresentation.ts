import { Vec2, createVec2, zeroVec2, addVec2Mutable, multiplyVecMutable, clampVecMutable } from "@/app/utils/vector";
import { RoundedRectangle, RoundedShapeWithHole, populateVectorSegmentsPrimitive } from "@/app/utils/findVectorSegmentsInShape";
import { BUBBLE_STIFFNESS } from "@/app/utils/physicsConsts";

export type BubbleMeta = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export type BubblePresentationOptions = {
  overkill?: number;
  insetFilter?: (direction: number) => number;
  width?: number;
  height?: number;
  boundary?: number;
  rounding?: number;
  containerOffsetLeft?: number;
  containerOffsetTop?: number;
}

export class BubblePresentation {
  private overkill: number;
  private insetFilter: (direction: number) => number;
  private width: number;
  private height: number;
  private boundary: number;
  private rounding: number;
  private containerOffsetLeft: number;
  private containerOffsetTop: number;
  private lastOffset: Vec2;
  
  // Internal metadata storage
  private meta: BubbleMeta;
  
  // Rectangle and shape management
  private outerRectangle: RoundedRectangle;
  private innerRectangle: RoundedRectangle;
  private shapeWithHole: RoundedShapeWithHole | null;
  
  // Cached style calculations (computed lazily)
  private cachedOuterTransform: string | null = null;
  private cachedInnerTransform: string | null = null;
  private cachedInnerClipPath: string | null = null;
  private stylesCacheDirty: boolean = true;
  
  // Collision detection infrastructure
  private readonly MAX_SEGMENTS = 20;
  private segmentStartX: Float64Array;
  private segmentStartY: Float64Array;
  private segmentEndX: Float64Array;
  private segmentEndY: Float64Array;
  private lastIntersection: Vec2;
  private tempVec: Vec2;
  private clampTempVec: Vec2;
  
  constructor(options: BubblePresentationOptions = {}) {
    this.overkill = options.overkill ?? 1;
    this.insetFilter = options.insetFilter ?? ((v: number) => v);
    this.width = options.width ?? 0;
    this.height = options.height ?? 0;
    this.boundary = options.boundary ?? 0;
    this.rounding = options.rounding ?? 0;
    this.containerOffsetLeft = options.containerOffsetLeft ?? 0;
    this.containerOffsetTop = options.containerOffsetTop ?? 0;
    this.lastOffset = [0, 0];
    
    // Initialize metadata
    this.meta = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: 0,
      height: 0,
    };
    
    // Initialize rectangles
    this.outerRectangle = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      radius: 0,
    };
    this.innerRectangle = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      radius: 0,
    };
    this.shapeWithHole = null;
    
    // Initialize collision detection arrays and vectors
    this.segmentStartX = new Float64Array(this.MAX_SEGMENTS);
    this.segmentStartY = new Float64Array(this.MAX_SEGMENTS);
    this.segmentEndX = new Float64Array(this.MAX_SEGMENTS);
    this.segmentEndY = new Float64Array(this.MAX_SEGMENTS);
    this.lastIntersection = createVec2();
    this.tempVec = createVec2();
    this.clampTempVec = createVec2();
  }
  
  updateMeta(offset: Vec2): void {
    const [offsetX, offsetY] = offset;
    
    // Store the last used offset
    this.lastOffset[0] = offsetX;
    this.lastOffset[1] = offsetY;
    
    // Apply overkill amplification
    const presentationOffsetX = this.overkill * offsetX;
    const presentationOffsetY = this.overkill * offsetY;
    
    // Apply asymmetric filtering to create insets
    const nextTop = this.insetFilter(presentationOffsetY);
    const nextRight = this.insetFilter(-presentationOffsetX);
    const nextBottom = this.insetFilter(-presentationOffsetY);
    const nextLeft = this.insetFilter(presentationOffsetX);
    
    // Update internal metadata
    this.meta.top = nextTop;
    this.meta.right = nextRight;
    this.meta.bottom = nextBottom;
    this.meta.left = nextLeft;
    
    // Calculate final dimensions
    this.meta.width = this.width - nextLeft - nextRight;
    this.meta.height = this.height - nextTop - nextBottom;
    
    // Update rectangles for mouse interaction
    this.updateRectangles();
    
    // Invalidate style cache since metadata changed
    this.stylesCacheDirty = true;
  }
  
  private updateRectangles(): void {
    // Update outer rectangle
    this.outerRectangle.x = this.containerOffsetLeft + this.meta.left;
    this.outerRectangle.y = this.containerOffsetTop + this.meta.top;
    this.outerRectangle.width = this.meta.width;
    this.outerRectangle.height = this.meta.height;
    this.outerRectangle.radius = this.rounding;
    
    // Update inner rectangle
    this.innerRectangle.x = this.outerRectangle.x + this.boundary;
    this.innerRectangle.y = this.outerRectangle.y + this.boundary;
    this.innerRectangle.width = this.outerRectangle.width - (2 * this.boundary);
    this.innerRectangle.height = this.outerRectangle.height - (2 * this.boundary);
    this.innerRectangle.radius = this.rounding - this.boundary;
    
    // Update shape with hole
    if (!this.shapeWithHole) {
      this.shapeWithHole = new RoundedShapeWithHole(this.outerRectangle, this.innerRectangle);
    } else {
      // Update references instead of creating new object
      this.shapeWithHole.outer = this.outerRectangle;
      this.shapeWithHole.hole = this.innerRectangle;
    }
  }
  
  updateConfiguration(options: BubblePresentationOptions): void {
    if (options.overkill !== undefined) {
      this.overkill = options.overkill;
    }
    if (options.insetFilter !== undefined) {
      this.insetFilter = options.insetFilter;
    }
    if (options.width !== undefined) {
      this.width = options.width;
    }
    if (options.height !== undefined) {
      this.height = options.height;
    }
    if (options.boundary !== undefined) {
      this.boundary = options.boundary;
    }
    if (options.rounding !== undefined) {
      this.rounding = options.rounding;
    }
    if (options.containerOffsetLeft !== undefined) {
      this.containerOffsetLeft = options.containerOffsetLeft;
    }
    if (options.containerOffsetTop !== undefined) {
      this.containerOffsetTop = options.containerOffsetTop;
    }
    
    // Recalculate metadata and rectangles with the last-used offset
    this.updateMeta(this.lastOffset);
    
    // Style cache will be invalidated by updateMeta, but ensure it's marked dirty
    this.stylesCacheDirty = true;
  }
  
  getMeta(): Readonly<BubbleMeta> {
    return this.meta;
  }
  
  getOuterRectangle(): Readonly<RoundedRectangle> {
    return this.outerRectangle;
  }
  
  getInnerRectangle(): Readonly<RoundedRectangle> {
    return this.innerRectangle;
  }
  
  getShapeWithHole(): RoundedShapeWithHole | null {
    return this.shapeWithHole;
  }
  
  getOuterTransform(): string {
    if (this.stylesCacheDirty || this.cachedOuterTransform === null) {
      this.calculateOuterTransform();
    }
    return this.cachedOuterTransform!;
  }
  
  getInnerTransform(offsetX: number, offsetY: number): string {
    if (this.stylesCacheDirty || this.cachedInnerTransform === null) {
      this.calculateInnerStyles(offsetX, offsetY);
    }
    return this.cachedInnerTransform!;
  }
  
  getInnerClipPath(offsetX: number, offsetY: number): string {
    if (this.stylesCacheDirty || this.cachedInnerClipPath === null) {
      this.calculateInnerStyles(offsetX, offsetY);
    }
    return this.cachedInnerClipPath!;
  }
  
  private calculateOuterTransform(): void {
    const scaleX = this.meta.width / this.width;
    const scaleY = this.meta.height / this.height;
    const translateX = (this.meta.left - this.meta.right) * 0.5;
    const translateY = (this.meta.top - this.meta.bottom) * 0.5;
    
    this.cachedOuterTransform = `matrix(${scaleX},0,0,${scaleY},${translateX},${translateY})`;
  }
  
  private calculateInnerStyles(offsetX: number, offsetY: number): void {
    
    // Calculate scales first
    const scaleX = this.meta.width / this.width;
    const scaleY = this.meta.height / this.height;
    
    // Avoid shifting the text content too much since it still needs to be readable
    const contentOffsetX = offsetX * 0.5;
    const contentOffsetY = offsetY * 0.5;
    
    // Calculate transform
    this.cachedInnerTransform = `translate(${contentOffsetX}px,${contentOffsetY}px)`;
    
    // Calculate clip path
    const distortionX = scaleX - 1;
    const distortionY = scaleY - 1;
    const scaleAvg = (scaleX + scaleY) * 0.5;
    
    // Content needs to flow normally, but be clipped by the bubble which is necessarily a sibling
    const clipX = this.meta.left - contentOffsetX + this.boundary * distortionX;
    const clipY = this.meta.top - contentOffsetY + this.boundary * distortionY;
    
    const doubleBoundary = 2 * this.boundary;
    const clipWidth = Math.max(this.meta.width - doubleBoundary * scaleX, 0);
    const clipHeight = Math.max(this.meta.height - doubleBoundary * scaleY, 0);
    
    const clipRounding = Math.max(this.rounding - this.boundary, 0) * scaleAvg;
    
    this.cachedInnerClipPath = `xywh(${clipX}px ${clipY}px ${clipWidth}px ${clipHeight}px round ${clipRounding}px)`;
    
    // Mark cache as clean after calculating inner styles
    this.stylesCacheDirty = false;
  }
  
  
  getOverkill(): number {
    return this.overkill;
  }
  
  getInsetFilter(): (direction: number) => number {
    return this.insetFilter;
  }
  
  collide(currMouseX: number, currMouseY: number, prevMouseX: number, prevMouseY: number): Vec2 | null {
    if (!this.shapeWithHole) {
      return null;
    }
    
    const segmentCount = populateVectorSegmentsPrimitive(
      this.segmentStartX,
      this.segmentStartY,
      this.segmentEndX,
      this.segmentEndY,
      this.MAX_SEGMENTS,
      currMouseX,
      currMouseY,
      prevMouseX,
      prevMouseY,
      this.shapeWithHole
    );
    
    if (segmentCount > 0) {
      zeroVec2(this.lastIntersection);
      
      for (let i = 0; i < segmentCount; i++) {
        // Convert primitive coordinates to vector manually - zero allocations
        this.tempVec[0] = this.segmentStartX[i] - this.segmentEndX[i];
        this.tempVec[1] = this.segmentStartY[i] - this.segmentEndY[i];
        addVec2Mutable(this.lastIntersection, this.tempVec);
      }
      
      const doubleBoundary = 2 * this.boundary;
      clampVecMutable(this.lastIntersection, -doubleBoundary, doubleBoundary, this.clampTempVec);
      multiplyVecMutable(this.lastIntersection, BUBBLE_STIFFNESS);
      
      return this.lastIntersection;
    }
    
    return null;
  }
}
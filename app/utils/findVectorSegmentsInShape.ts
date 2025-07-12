// Thanks Claude
export interface LineSegment {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface Point {
  x: number;
  y: number;
}

// Pre-allocated memory pools to eliminate runtime allocations
const POINT_POOL_SIZE = 50;
const WORKING_ARRAY_SIZE = 50;

// Object pools
const POINT_POOL: Point[] = Array.from({ length: POINT_POOL_SIZE }, () => ({ x: 0, y: 0 }));
// SEGMENT_POOL removed - segments are now populated directly into caller's array

// Pre-allocated working arrays
const WORKING_INTERSECTIONS: Point[] = new Array(WORKING_ARRAY_SIZE);
const WORKING_ALL_POINTS: Point[] = new Array(WORKING_ARRAY_SIZE);
const WORKING_UNIQUE_POINTS: Point[] = new Array(WORKING_ARRAY_SIZE);

// Pool management
let pointPoolIndex = 0;

// Helper functions for pool management
function getPooledPoint(x: number, y: number): Point {
  if (pointPoolIndex >= POINT_POOL_SIZE) {
    pointPoolIndex = 0; // Wrap around - reuse from beginning
  }
  const point = POINT_POOL[pointPoolIndex++];
  point.x = x;
  point.y = y;
  return point;
}

// Note: getPooledSegment removed - segments are now populated directly into caller's array

function resetPools(): void {
  pointPoolIndex = 0;
  // segmentPoolIndex not needed anymore since segments are populated directly
}

export interface RoundedRectangle {
  x: number;      // left edge (before rounding)
  y: number;      // top edge (before rounding)
  width: number;
  height: number;
  radius: number; // corner radius (0 for sharp corners)
}

export class RoundedShapeWithHole {
  outer: RoundedRectangle;
  hole: RoundedRectangle;

  constructor(outer: RoundedRectangle, hole: RoundedRectangle) {
    this.outer = outer;
    this.hole = hole;
    // Ensure radius doesn't exceed half of smallest dimension
    this.outer.radius = Math.min(this.outer.radius, this.outer.width / 2, this.outer.height / 2);
    this.hole.radius = Math.min(this.hole.radius, this.hole.width / 2, this.hole.height / 2);
  }

  containsPoint(x: number, y: number): boolean {
    return this.isInRoundedRect(x, y, this.outer) && !this.isInRoundedRect(x, y, this.hole);
  }

  private isInRoundedRect(x: number, y: number, rect: RoundedRectangle): boolean {
    // Check if point is in the rectangular region
    const inRect = x >= rect.x && x <= rect.x + rect.width &&
      y >= rect.y && y <= rect.y + rect.height;

    if (!inRect) return false;
    if (rect.radius === 0) return true;

    // Check corners
    const tlX = rect.x + rect.radius;
    const tlY = rect.y + rect.radius;
    const trX = rect.x + rect.width - rect.radius;
    const trY = rect.y + rect.radius;
    const brX = rect.x + rect.width - rect.radius;
    const brY = rect.y + rect.height - rect.radius;
    const blX = rect.x + rect.radius;
    const blY = rect.y + rect.height - rect.radius;

    // Check if point is in a corner region that needs radius checking
    if (x < rect.x + rect.radius && y < rect.y + rect.radius) {
      // Top-left corner
      return this.distance(x, y, tlX, tlY) <= rect.radius;
    } else if (x > rect.x + rect.width - rect.radius && y < rect.y + rect.radius) {
      // Top-right corner
      return this.distance(x, y, trX, trY) <= rect.radius;
    } else if (x > rect.x + rect.width - rect.radius && y > rect.y + rect.height - rect.radius) {
      // Bottom-right corner
      return this.distance(x, y, brX, brY) <= rect.radius;
    } else if (x < rect.x + rect.radius && y > rect.y + rect.height - rect.radius) {
      // Bottom-left corner
      return this.distance(x, y, blX, blY) <= rect.radius;
    }

    return true;
  }

  private distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

function populateLineCircleIntersections(
  targetArray: Point[],
  targetIndex: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  centerX: number,
  centerY: number,
  radius: number
): number {
  const dx = endX - startX;
  const dy = endY - startY;
  const fx = startX - centerX;
  const fy = startY - centerY;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return 0;

  let count = 0;
  const sqrt_discriminant = Math.sqrt(discriminant);

  const t1 = (-b - sqrt_discriminant) / (2 * a);
  const t2 = (-b + sqrt_discriminant) / (2 * a);

  if (t1 >= 0 && t1 <= 1) {
    targetArray[targetIndex + count] = getPooledPoint(
      startX + t1 * dx,
      startY + t1 * dy
    );
    count++;
  }

  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 1e-10) {
    targetArray[targetIndex + count] = getPooledPoint(
      startX + t2 * dx,
      startY + t2 * dy
    );
    count++;
  }

  return count;
}

function tryAddLineSegmentIntersection(
  targetArray: Point[],
  targetIndex: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): number {
  const dx1 = x2 - x1;
  const dy1 = y2 - y1;
  const dx2 = x4 - x3;
  const dy2 = y4 - y3;

  const denominator = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denominator) < 1e-10) return 0;

  const t = ((x3 - x1) * dy2 - (y3 - y1) * dx2) / denominator;
  const u = ((x3 - x1) * dy1 - (y3 - y1) * dx1) / denominator;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    targetArray[targetIndex] = getPooledPoint(
      x1 + t * dx1,
      y1 + t * dy1
    );
    return 1;
  }

  return 0;
}

function populateLineRoundedRectangleIntersections(
  targetArray: Point[],
  targetIndex: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  rect: RoundedRectangle
): number {
  let count = 0;

  if (rect.radius === 0) {
    // Simple rectangle case
    // Top edge
    count += tryAddLineSegmentIntersection(
      targetArray, targetIndex + count,
      startX, startY, endX, endY,
      rect.x, rect.y, rect.x + rect.width, rect.y
    );
    // Right edge
    count += tryAddLineSegmentIntersection(
      targetArray, targetIndex + count,
      startX, startY, endX, endY,
      rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height
    );
    // Bottom edge
    count += tryAddLineSegmentIntersection(
      targetArray, targetIndex + count,
      startX, startY, endX, endY,
      rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height
    );
    // Left edge
    count += tryAddLineSegmentIntersection(
      targetArray, targetIndex + count,
      startX, startY, endX, endY,
      rect.x, rect.y + rect.height, rect.x, rect.y
    );
  } else {
    // Rounded rectangle case
    const r = rect.radius;

    // Check straight edge intersections
    // Top edge
    count += tryAddLineSegmentIntersection(
      targetArray, targetIndex + count,
      startX, startY, endX, endY,
      rect.x + r, rect.y, rect.x + rect.width - r, rect.y
    );
    // Right edge
    count += tryAddLineSegmentIntersection(
      targetArray, targetIndex + count,
      startX, startY, endX, endY,
      rect.x + rect.width, rect.y + r, rect.x + rect.width, rect.y + rect.height - r
    );
    // Bottom edge
    count += tryAddLineSegmentIntersection(
      targetArray, targetIndex + count,
      startX, startY, endX, endY,
      rect.x + rect.width - r, rect.y + rect.height, rect.x + r, rect.y + rect.height
    );
    // Left edge
    count += tryAddLineSegmentIntersection(
      targetArray, targetIndex + count,
      startX, startY, endX, endY,
      rect.x, rect.y + rect.height - r, rect.x, rect.y + r
    );

    // Check corner arc intersections
    // Top-left corner
    const tlCount = populateLineCircleIntersections(
      WORKING_INTERSECTIONS, 0,
      startX, startY, endX, endY,
      rect.x + r, rect.y + r, r
    );
    for (let i = 0; i < tlCount; i++) {
      const p = WORKING_INTERSECTIONS[i];
      const angle = Math.atan2(p.y - (rect.y + r), p.x - (rect.x + r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (normalizedAngle >= Math.PI && normalizedAngle <= 1.5 * Math.PI) {
        targetArray[targetIndex + count] = p;
        count++;
      }
    }

    // Top-right corner
    const trCount = populateLineCircleIntersections(
      WORKING_INTERSECTIONS, 0,
      startX, startY, endX, endY,
      rect.x + rect.width - r, rect.y + r, r
    );
    for (let i = 0; i < trCount; i++) {
      const p = WORKING_INTERSECTIONS[i];
      const angle = Math.atan2(p.y - (rect.y + r), p.x - (rect.x + rect.width - r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (normalizedAngle >= 1.5 * Math.PI && normalizedAngle <= 2 * Math.PI) {
        targetArray[targetIndex + count] = p;
        count++;
      }
    }

    // Bottom-right corner
    const brCount = populateLineCircleIntersections(
      WORKING_INTERSECTIONS, 0,
      startX, startY, endX, endY,
      rect.x + rect.width - r, rect.y + rect.height - r, r
    );
    for (let i = 0; i < brCount; i++) {
      const p = WORKING_INTERSECTIONS[i];
      const angle = Math.atan2(p.y - (rect.y + rect.height - r), p.x - (rect.x + rect.width - r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (normalizedAngle >= 0 && normalizedAngle <= 0.5 * Math.PI) {
        targetArray[targetIndex + count] = p;
        count++;
      }
    }

    // Bottom-left corner
    const blCount = populateLineCircleIntersections(
      WORKING_INTERSECTIONS, 0,
      startX, startY, endX, endY,
      rect.x + r, rect.y + rect.height - r, r
    );
    for (let i = 0; i < blCount; i++) {
      const p = WORKING_INTERSECTIONS[i];
      const angle = Math.atan2(p.y - (rect.y + rect.height - r), p.x - (rect.x + r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (normalizedAngle >= 0.5 * Math.PI && normalizedAngle <= Math.PI) {
        targetArray[targetIndex + count] = p;
        count++;
      }
    }
  }

  return count;
}

export function populateVectorSegmentsInRoundedShape(
  resultSegments: LineSegment[],
  maxResults: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  shape: RoundedShapeWithHole
): number {
  // Reset pools at start of operation
  resetPools();

  // Populate intersection points
  WORKING_ALL_POINTS[0] = getPooledPoint(startX, startY);
  let allPointsCount = 1;

  // Get outer intersections
  const outerCount = populateLineRoundedRectangleIntersections(
    WORKING_ALL_POINTS, allPointsCount,
    startX, startY, endX, endY, shape.outer
  );
  allPointsCount += outerCount;

  // Get hole intersections
  const holeCount = populateLineRoundedRectangleIntersections(
    WORKING_ALL_POINTS, allPointsCount,
    startX, startY, endX, endY, shape.hole
  );
  allPointsCount += holeCount;

  // Add end point
  WORKING_ALL_POINTS[allPointsCount] = getPooledPoint(endX, endY);
  allPointsCount++;

  // Sort points along vector using manual sorting to avoid array slice allocations
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = dx * dx + dy * dy;

  // Simple insertion sort (efficient for small arrays)
  for (let i = 1; i < allPointsCount; i++) {
    const current = WORKING_ALL_POINTS[i];
    const currentT = ((current.x - startX) * dx + (current.y - startY) * dy) / lengthSquared;
    
    let j = i - 1;
    while (j >= 0) {
      const comparePoint = WORKING_ALL_POINTS[j];
      const compareT = ((comparePoint.x - startX) * dx + (comparePoint.y - startY) * dy) / lengthSquared;
      
      if (compareT <= currentT) break;
      
      WORKING_ALL_POINTS[j + 1] = WORKING_ALL_POINTS[j];
      j--;
    }
    WORKING_ALL_POINTS[j + 1] = current;
  }

  // Remove duplicates using manual indexing
  let uniqueCount = 0;
  for (let i = 0; i < allPointsCount; i++) {
    const current = WORKING_ALL_POINTS[i];
    
    if (uniqueCount === 0) {
      WORKING_UNIQUE_POINTS[uniqueCount++] = current;
    } else {
      const last = WORKING_UNIQUE_POINTS[uniqueCount - 1];
      if (Math.abs(current.x - last.x) > 1e-10 || Math.abs(current.y - last.y) > 1e-10) {
        WORKING_UNIQUE_POINTS[uniqueCount++] = current;
      }
    }
  }

  // Build segments directly into caller's array
  let segmentCount = 0;
  for (let i = 0; i < uniqueCount - 1 && segmentCount < maxResults; i++) {
    const start = WORKING_UNIQUE_POINTS[i];
    const end = WORKING_UNIQUE_POINTS[i + 1];
    const midpointX = (start.x + end.x) / 2;
    const midpointY = (start.y + end.y) / 2;

    if (shape.containsPoint(midpointX, midpointY)) {
      // Populate the caller's pre-allocated segment instead of creating new object
      resultSegments[segmentCount].startX = start.x;
      resultSegments[segmentCount].startY = start.y;
      resultSegments[segmentCount].endX = end.x;
      resultSegments[segmentCount].endY = end.y;
      segmentCount++;
    }
  }

  return segmentCount;
}

// Keep the old API for backward compatibility, but mark as deprecated
/** @deprecated Use populateVectorSegmentsInRoundedShape for better memory efficiency */
export function findVectorSegmentsInRoundedShape(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  shape: RoundedShapeWithHole
): LineSegment[] {
  // Use a temporary array for backward compatibility
  const tempSegments: LineSegment[] = Array.from({ length: 20 }, () => ({ startX: 0, startY: 0, endX: 0, endY: 0 }));
  const count = populateVectorSegmentsInRoundedShape(tempSegments, 20, startX, startY, endX, endY, shape);
  
  // Return only the used portion (still creates new array, but reduces object creation)
  return tempSegments.slice(0, count);
}

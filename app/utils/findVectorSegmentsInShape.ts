// Thanks Claude
export interface LineSegment {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
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
    this.updateRadii();
  }

  updateRadii(): void {
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

    // Check if point is in a corner region that needs radius checking
    if (x < rect.x + rect.radius && y < rect.y + rect.radius) {
      // Top-left corner
      return this.distanceSquared(x, y, rect.x + rect.radius, rect.y + rect.radius) <= rect.radius * rect.radius;
    } else if (x > rect.x + rect.width - rect.radius && y < rect.y + rect.radius) {
      // Top-right corner
      return this.distanceSquared(x, y, rect.x + rect.width - rect.radius, rect.y + rect.radius) <= rect.radius * rect.radius;
    } else if (x > rect.x + rect.width - rect.radius && y > rect.y + rect.height - rect.radius) {
      // Bottom-right corner
      return this.distanceSquared(x, y, rect.x + rect.width - rect.radius, rect.y + rect.height - rect.radius) <= rect.radius * rect.radius;
    } else if (x < rect.x + rect.radius && y > rect.y + rect.height - rect.radius) {
      // Bottom-left corner
      return this.distanceSquared(x, y, rect.x + rect.radius, rect.y + rect.height - rect.radius) <= rect.radius * rect.radius;
    }

    return true;
  }

  private distanceSquared(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy;
  }
}

// Persistent object pools for zero-allocation performance
type IntersectionPoint = {
  x: number;
  y: number;
  t: number; // parameter along the line for sorting
};

// Pre-allocated pools - never deallocated to avoid GC
const intersectionPool: IntersectionPoint[] = new Array(20);
const segmentPool: LineSegment[] = new Array(10);
const tempCircleResults: IntersectionPoint[] = new Array(2);

// Pre-populate pools with objects to avoid any allocation during runtime
for (let i = 0; i < intersectionPool.length; i++) {
  intersectionPool[i] = { x: 0, y: 0, t: 0 };
}
for (let i = 0; i < segmentPool.length; i++) {
  segmentPool[i] = { startX: 0, startY: 0, endX: 0, endY: 0 };
}
for (let i = 0; i < tempCircleResults.length; i++) {
  tempCircleResults[i] = { x: 0, y: 0, t: 0 };
}

function lineCircleIntersections(startX: number, startY: number, endX: number, endY: number, centerX: number, centerY: number, radius: number, dx: number, dy: number, lengthSquared: number, intersectionCount: { value: number }): void {
  const fx = startX - centerX;
  const fy = startY - centerY;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return;

  const sqrt_discriminant = Math.sqrt(discriminant);
  const t1 = (-b - sqrt_discriminant) / (2 * a);
  const t2 = (-b + sqrt_discriminant) / (2 * a);

  if (t1 >= 0 && t1 <= 1 && intersectionCount.value < intersectionPool.length) {
    const x = startX + t1 * dx;
    const y = startY + t1 * dy;
    const point = intersectionPool[intersectionCount.value++];
    point.x = x;
    point.y = y;
    point.t = ((x - startX) * dx + (y - startY) * dy) / lengthSquared;
  }

  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 1e-10 && intersectionCount.value < intersectionPool.length) {
    const x = startX + t2 * dx;
    const y = startY + t2 * dy;
    const point = intersectionPool[intersectionCount.value++];
    point.x = x;
    point.y = y;
    point.t = ((x - startX) * dx + (y - startY) * dy) / lengthSquared;
  }
}

function lineSegmentIntersection(p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number, p4x: number, p4y: number, startX: number, startY: number, dx: number, dy: number, lengthSquared: number, intersectionCount: { value: number }): void {
  if (intersectionCount.value >= intersectionPool.length) return;

  const dx1 = p2x - p1x;
  const dy1 = p2y - p1y;
  const dx2 = p4x - p3x;
  const dy2 = p4y - p3y;

  const denominator = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denominator) < 1e-10) return;

  const t = ((p3x - p1x) * dy2 - (p3y - p1y) * dx2) / denominator;
  const u = ((p3x - p1x) * dy1 - (p3y - p1y) * dx1) / denominator;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    const x = p1x + t * dx1;
    const y = p1y + t * dy1;
    const point = intersectionPool[intersectionCount.value++];
    point.x = x;
    point.y = y;
    point.t = ((x - startX) * dx + (y - startY) * dy) / lengthSquared;
  }
}

function collectRectangleIntersections(startX: number, startY: number, endX: number, endY: number, rect: RoundedRectangle, dx: number, dy: number, lengthSquared: number, intersectionCount: { value: number }): void {
  if (rect.radius === 0) {
    // Simple rectangle case - check 4 edges directly
    lineSegmentIntersection(startX, startY, endX, endY, rect.x, rect.y, rect.x + rect.width, rect.y, startX, startY, dx, dy, lengthSquared, intersectionCount);
    lineSegmentIntersection(startX, startY, endX, endY, rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height, startX, startY, dx, dy, lengthSquared, intersectionCount);
    lineSegmentIntersection(startX, startY, endX, endY, rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height, startX, startY, dx, dy, lengthSquared, intersectionCount);
    lineSegmentIntersection(startX, startY, endX, endY, rect.x, rect.y + rect.height, rect.x, rect.y, startX, startY, dx, dy, lengthSquared, intersectionCount);
  } else {
    // Rounded rectangle case
    const r = rect.radius;

    // Check straight edge intersections
    lineSegmentIntersection(startX, startY, endX, endY, rect.x + r, rect.y, rect.x + rect.width - r, rect.y, startX, startY, dx, dy, lengthSquared, intersectionCount);
    lineSegmentIntersection(startX, startY, endX, endY, rect.x + rect.width, rect.y + r, rect.x + rect.width, rect.y + rect.height - r, startX, startY, dx, dy, lengthSquared, intersectionCount);
    lineSegmentIntersection(startX, startY, endX, endY, rect.x + rect.width - r, rect.y + rect.height, rect.x + r, rect.y + rect.height, startX, startY, dx, dy, lengthSquared, intersectionCount);
    lineSegmentIntersection(startX, startY, endX, endY, rect.x, rect.y + rect.height - r, rect.x, rect.y + r, startX, startY, dx, dy, lengthSquared, intersectionCount);

    // Check corner arc intersections with angle validation
    
    // Top-left corner
    const tlStartCount = intersectionCount.value;
    lineCircleIntersections(startX, startY, endX, endY, rect.x + r, rect.y + r, r, dx, dy, lengthSquared, intersectionCount);
    for (let i = tlStartCount; i < intersectionCount.value; i++) {
      const p = intersectionPool[i];
      const angle = Math.atan2(p.y - (rect.y + r), p.x - (rect.x + r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (!(normalizedAngle >= Math.PI && normalizedAngle <= 1.5 * Math.PI)) {
        // Swap invalid intersection with last valid one and decrement count
        intersectionPool[i] = intersectionPool[--intersectionCount.value];
        i--; // Recheck this index
      }
    }

    // Top-right corner
    const trStartCount = intersectionCount.value;
    lineCircleIntersections(startX, startY, endX, endY, rect.x + rect.width - r, rect.y + r, r, dx, dy, lengthSquared, intersectionCount);
    for (let i = trStartCount; i < intersectionCount.value; i++) {
      const p = intersectionPool[i];
      const angle = Math.atan2(p.y - (rect.y + r), p.x - (rect.x + rect.width - r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (!(normalizedAngle >= 1.5 * Math.PI && normalizedAngle <= 2 * Math.PI)) {
        intersectionPool[i] = intersectionPool[--intersectionCount.value];
        i--;
      }
    }

    // Bottom-right corner
    const brStartCount = intersectionCount.value;
    lineCircleIntersections(startX, startY, endX, endY, rect.x + rect.width - r, rect.y + rect.height - r, r, dx, dy, lengthSquared, intersectionCount);
    for (let i = brStartCount; i < intersectionCount.value; i++) {
      const p = intersectionPool[i];
      const angle = Math.atan2(p.y - (rect.y + rect.height - r), p.x - (rect.x + rect.width - r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (!(normalizedAngle >= 0 && normalizedAngle <= 0.5 * Math.PI)) {
        intersectionPool[i] = intersectionPool[--intersectionCount.value];
        i--;
      }
    }

    // Bottom-left corner
    const blStartCount = intersectionCount.value;
    lineCircleIntersections(startX, startY, endX, endY, rect.x + r, rect.y + rect.height - r, r, dx, dy, lengthSquared, intersectionCount);
    for (let i = blStartCount; i < intersectionCount.value; i++) {
      const p = intersectionPool[i];
      const angle = Math.atan2(p.y - (rect.y + rect.height - r), p.x - (rect.x + r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (!(normalizedAngle >= 0.5 * Math.PI && normalizedAngle <= Math.PI)) {
        intersectionPool[i] = intersectionPool[--intersectionCount.value];
        i--;
      }
    }
  }
}

export function findVectorSegmentsInRoundedShape(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  shape: RoundedShapeWithHole
): LineSegment[] {
  // Use persistent pools - zero allocation
  const intersectionCount = { value: 0 };

  // Pre-calculate vector properties
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = dx * dx + dy * dy;

  // Add start point using pool
  if (intersectionCount.value < intersectionPool.length) {
    const point = intersectionPool[intersectionCount.value++];
    point.x = startX;
    point.y = startY;
    point.t = 0;
  }
  
  // Collect intersections using pools
  collectRectangleIntersections(startX, startY, endX, endY, shape.outer, dx, dy, lengthSquared, intersectionCount);
  collectRectangleIntersections(startX, startY, endX, endY, shape.hole, dx, dy, lengthSquared, intersectionCount);
  
  // Add end point using pool
  if (intersectionCount.value < intersectionPool.length) {
    const point = intersectionPool[intersectionCount.value++];
    point.x = endX;
    point.y = endY;
    point.t = 1;
  }

  // Sort by t parameter - in-place on persistent pool
  // Use insertion sort for small arrays (typically 2-8 elements)
  for (let i = 1; i < intersectionCount.value; i++) {
    const current = intersectionPool[i];
    let j = i - 1;
    while (j >= 0 && intersectionPool[j].t > current.t) {
      intersectionPool[j + 1] = intersectionPool[j];
      j--;
    }
    intersectionPool[j + 1] = current;
  }

  // Remove duplicates in-place
  let uniqueCount = 1;
  for (let i = 1; i < intersectionCount.value; i++) {
    const curr = intersectionPool[i];
    const prev = intersectionPool[uniqueCount - 1];
    if (Math.abs(curr.x - prev.x) > 1e-10 || Math.abs(curr.y - prev.y) > 1e-10) {
      intersectionPool[uniqueCount++] = curr;
    }
  }

  // Generate segments using segment pool
  let segmentCount = 0;
  for (let i = 0; i < uniqueCount - 1 && segmentCount < segmentPool.length; i++) {
    const p1 = intersectionPool[i];
    const p2 = intersectionPool[i + 1];
    
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    
    if (shape.containsPoint(midX, midY)) {
      const segment = segmentPool[segmentCount++];
      segment.startX = p1.x;
      segment.startY = p1.y;
      segment.endX = p2.x;
      segment.endY = p2.y;
    }
  }

  // Return only the used segments (this creates a new array but contains pooled objects)
  return segmentPool.slice(0, segmentCount);
}
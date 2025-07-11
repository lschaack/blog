// Thanks Claude
export interface Point {
  x: number;
  y: number;
}

export interface LineSegment {
  start: Point;
  end: Point;
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

  containsPoint(p: Point): boolean {
    return this.isInRoundedRect(p, this.outer) && !this.isInRoundedRect(p, this.hole);
  }

  private isInRoundedRect(p: Point, rect: RoundedRectangle): boolean {
    // Check if point is in the rectangular region
    const inRect = p.x >= rect.x && p.x <= rect.x + rect.width &&
      p.y >= rect.y && p.y <= rect.y + rect.height;

    if (!inRect) return false;
    if (rect.radius === 0) return true;

    // Check if point is in a corner region that needs radius checking
    if (p.x < rect.x + rect.radius && p.y < rect.y + rect.radius) {
      // Top-left corner
      return this.distanceSquared(p.x, p.y, rect.x + rect.radius, rect.y + rect.radius) <= rect.radius * rect.radius;
    } else if (p.x > rect.x + rect.width - rect.radius && p.y < rect.y + rect.radius) {
      // Top-right corner
      return this.distanceSquared(p.x, p.y, rect.x + rect.width - rect.radius, rect.y + rect.radius) <= rect.radius * rect.radius;
    } else if (p.x > rect.x + rect.width - rect.radius && p.y > rect.y + rect.height - rect.radius) {
      // Bottom-right corner
      return this.distanceSquared(p.x, p.y, rect.x + rect.width - rect.radius, rect.y + rect.height - rect.radius) <= rect.radius * rect.radius;
    } else if (p.x < rect.x + rect.radius && p.y > rect.y + rect.height - rect.radius) {
      // Bottom-left corner
      return this.distanceSquared(p.x, p.y, rect.x + rect.radius, rect.y + rect.height - rect.radius) <= rect.radius * rect.radius;
    }

    return true;
  }

  private distanceSquared(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy;
  }
}

function lineCircleIntersections(start: Point, end: Point, center: Point, radius: number, results: Point[]): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const fx = start.x - center.x;
  const fy = start.y - center.y;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return 0;

  const sqrt_discriminant = Math.sqrt(discriminant);
  const t1 = (-b - sqrt_discriminant) / (2 * a);
  const t2 = (-b + sqrt_discriminant) / (2 * a);

  let count = 0;
  if (t1 >= 0 && t1 <= 1) {
    results[count++] = {
      x: start.x + t1 * dx,
      y: start.y + t1 * dy
    };
  }

  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 1e-10) {
    results[count++] = {
      x: start.x + t2 * dx,
      y: start.y + t2 * dy
    };
  }

  return count;
}

function lineSegmentIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const dx1 = p2.x - p1.x;
  const dy1 = p2.y - p1.y;
  const dx2 = p4.x - p3.x;
  const dy2 = p4.y - p3.y;

  const denominator = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denominator) < 1e-10) return null;

  const t = ((p3.x - p1.x) * dy2 - (p3.y - p1.y) * dx2) / denominator;
  const u = ((p3.x - p1.x) * dy1 - (p3.y - p1.y) * dx1) / denominator;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: p1.x + t * dx1,
      y: p1.y + t * dy1
    };
  }

  return null;
}

function lineRoundedRectangleIntersections(start: Point, end: Point, rect: RoundedRectangle, results: Point[]): number {
  let count = 0;

  if (rect.radius === 0) {
    // Simple rectangle case - check 4 edges directly
    let intersection = lineSegmentIntersection(start, end,
      { x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y });
    if (intersection) results[count++] = intersection;

    intersection = lineSegmentIntersection(start, end,
      { x: rect.x + rect.width, y: rect.y }, { x: rect.x + rect.width, y: rect.y + rect.height });
    if (intersection) results[count++] = intersection;

    intersection = lineSegmentIntersection(start, end,
      { x: rect.x + rect.width, y: rect.y + rect.height }, { x: rect.x, y: rect.y + rect.height });
    if (intersection) results[count++] = intersection;

    intersection = lineSegmentIntersection(start, end,
      { x: rect.x, y: rect.y + rect.height }, { x: rect.x, y: rect.y });
    if (intersection) results[count++] = intersection;
  } else {
    // Rounded rectangle case
    const r = rect.radius;

    // Check straight edge intersections directly
    let intersection = lineSegmentIntersection(start, end,
      { x: rect.x + r, y: rect.y }, { x: rect.x + rect.width - r, y: rect.y });
    if (intersection) results[count++] = intersection;

    intersection = lineSegmentIntersection(start, end,
      { x: rect.x + rect.width, y: rect.y + r }, { x: rect.x + rect.width, y: rect.y + rect.height - r });
    if (intersection) results[count++] = intersection;

    intersection = lineSegmentIntersection(start, end,
      { x: rect.x + rect.width - r, y: rect.y + rect.height }, { x: rect.x + r, y: rect.y + rect.height });
    if (intersection) results[count++] = intersection;

    intersection = lineSegmentIntersection(start, end,
      { x: rect.x, y: rect.y + rect.height - r }, { x: rect.x, y: rect.y + r });
    if (intersection) results[count++] = intersection;

    // Check corner arc intersections - reuse temp array
    const tempIntersections: Point[] = [{ x: 0, y: 0 }, { x: 0, y: 0 }];

    // Top-left corner
    const tlCount = lineCircleIntersections(start, end, { x: rect.x + r, y: rect.y + r }, r, tempIntersections);
    for (let i = 0; i < tlCount; i++) {
      const p = tempIntersections[i];
      const angle = Math.atan2(p.y - (rect.y + r), p.x - (rect.x + r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (normalizedAngle >= Math.PI && normalizedAngle <= 1.5 * Math.PI) {
        results[count++] = p;
      }
    }

    // Top-right corner
    const trCount = lineCircleIntersections(start, end, { x: rect.x + rect.width - r, y: rect.y + r }, r, tempIntersections);
    for (let i = 0; i < trCount; i++) {
      const p = tempIntersections[i];
      const angle = Math.atan2(p.y - (rect.y + r), p.x - (rect.x + rect.width - r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (normalizedAngle >= 1.5 * Math.PI && normalizedAngle <= 2 * Math.PI) {
        results[count++] = p;
      }
    }

    // Bottom-right corner
    const brCount = lineCircleIntersections(start, end, { x: rect.x + rect.width - r, y: rect.y + rect.height - r }, r, tempIntersections);
    for (let i = 0; i < brCount; i++) {
      const p = tempIntersections[i];
      const angle = Math.atan2(p.y - (rect.y + rect.height - r), p.x - (rect.x + rect.width - r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (normalizedAngle >= 0 && normalizedAngle <= 0.5 * Math.PI) {
        results[count++] = p;
      }
    }

    // Bottom-left corner
    const blCount = lineCircleIntersections(start, end, { x: rect.x + r, y: rect.y + rect.height - r }, r, tempIntersections);
    for (let i = 0; i < blCount; i++) {
      const p = tempIntersections[i];
      const angle = Math.atan2(p.y - (rect.y + rect.height - r), p.x - (rect.x + r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (normalizedAngle >= 0.5 * Math.PI && normalizedAngle <= Math.PI) {
        results[count++] = p;
      }
    }
  }

  return count;
}

export function findVectorSegmentsInRoundedShape(
  start: Point,
  end: Point,
  shape: RoundedShapeWithHole
): LineSegment[] {
  const segments: LineSegment[] = [];

  // Reuse arrays for intersections
  const outerIntersections: Point[] = new Array(8); // Max 8 intersections for rounded rect
  const holeIntersections: Point[] = new Array(8);

  const outerCount = lineRoundedRectangleIntersections(start, end, shape.outer, outerIntersections);
  const holeCount = lineRoundedRectangleIntersections(start, end, shape.hole, holeIntersections);

  // Pre-allocate combined points array
  const allPoints: Point[] = new Array(2 + outerCount + holeCount);
  allPoints[0] = start;

  let pointIndex = 1;
  for (let i = 0; i < outerCount; i++) {
    allPoints[pointIndex++] = outerIntersections[i];
  }
  for (let i = 0; i < holeCount; i++) {
    allPoints[pointIndex++] = holeIntersections[i];
  }
  allPoints[pointIndex] = end;

  // Sort points along vector
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  allPoints.sort((a, b) => {
    const ta = ((a.x - start.x) * dx + (a.y - start.y) * dy) / lengthSquared;
    const tb = ((b.x - start.x) * dx + (b.y - start.y) * dy) / lengthSquared;
    return ta - tb;
  });

  // Remove duplicates in-place
  let uniqueCount = 1;
  for (let i = 1; i < allPoints.length; i++) {
    const curr = allPoints[i];
    const prev = allPoints[uniqueCount - 1];
    if (Math.abs(curr.x - prev.x) > 1e-10 || Math.abs(curr.y - prev.y) > 1e-10) {
      allPoints[uniqueCount++] = curr;
    }
  }

  // Check segments
  for (let i = 0; i < uniqueCount - 1; i++) {
    const p1 = allPoints[i];
    const p2 = allPoints[i + 1];

    // Reuse midpoint calculation without object allocation
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    if (shape.containsPoint({ x: midX, y: midY })) {
      segments.push({
        start: p1,
        end: p2
      });
    }
  }

  return segments;
}

// Thanks Claude
export interface Point {
  x: number;
  y: number;
}

export interface LineSegment {
  start: Point;
  end: Point;
}

export interface Rectangle {
  x: number;      // left edge
  y: number;      // top edge
  width: number;
  height: number;
}

export class ShapeWithHole {
  outer: Rectangle;
  hole: Rectangle;

  constructor(outer: Rectangle, hole: Rectangle) {
    this.outer = outer;
    this.hole = hole;
  }

  containsPoint(p: Point): boolean {
    // Check if point is inside outer rectangle
    const inOuter = p.x >= this.outer.x &&
      p.x <= this.outer.x + this.outer.width &&
      p.y >= this.outer.y &&
      p.y <= this.outer.y + this.outer.height;

    // Check if point is inside hole
    const inHole = p.x >= this.hole.x &&
      p.x <= this.hole.x + this.hole.width &&
      p.y >= this.hole.y &&
      p.y <= this.hole.y + this.hole.height;

    // Point is in shape if it's in outer but not in hole
    return inOuter && !inHole;
  }
}

function lineRectangleIntersections(
  start: Point,
  end: Point,
  rect: Rectangle
): Point[] {
  const intersections: Point[] = [];
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Check intersection with each edge
  const edges = [
    // Top edge
    { p1: { x: rect.x, y: rect.y }, p2: { x: rect.x + rect.width, y: rect.y } },
    // Right edge
    { p1: { x: rect.x + rect.width, y: rect.y }, p2: { x: rect.x + rect.width, y: rect.y + rect.height } },
    // Bottom edge
    { p1: { x: rect.x + rect.width, y: rect.y + rect.height }, p2: { x: rect.x, y: rect.y + rect.height } },
    // Left edge
    { p1: { x: rect.x, y: rect.y + rect.height }, p2: { x: rect.x, y: rect.y } }
  ];

  for (const edge of edges) {
    const edgeDx = edge.p2.x - edge.p1.x;
    const edgeDy = edge.p2.y - edge.p1.y;

    // Solve parametric equations
    const denominator = dx * edgeDy - dy * edgeDx;
    if (Math.abs(denominator) < 1e-10) continue; // Parallel lines

    const t = ((edge.p1.x - start.x) * edgeDy - (edge.p1.y - start.y) * edgeDx) / denominator;
    const u = ((edge.p1.x - start.x) * dy - (edge.p1.y - start.y) * dx) / denominator;

    // Check if intersection is within both line segments
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      intersections.push({
        x: start.x + t * dx,
        y: start.y + t * dy
      });
    }
  }

  return intersections;
}

export function findVectorSegmentsInShape(
  start: Point,
  end: Point,
  shape: ShapeWithHole
): LineSegment[] {
  const segments: LineSegment[] = [];

  // Get all intersection points with outer rectangle
  const outerIntersections = lineRectangleIntersections(start, end, shape.outer);

  // Get all intersection points with hole
  const holeIntersections = lineRectangleIntersections(start, end, shape.hole);

  // Combine all points including start and end
  const allPoints: Point[] = [start, ...outerIntersections, ...holeIntersections, end];

  // Sort points along the vector direction
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  allPoints.sort((a, b) => {
    const ta = ((a.x - start.x) * dx + (a.y - start.y) * dy) / lengthSquared;
    const tb = ((b.x - start.x) * dx + (b.y - start.y) * dy) / lengthSquared;
    return ta - tb;
  });

  // Remove duplicates (points that are very close)
  const uniquePoints: Point[] = [];
  for (const p of allPoints) {
    if (uniquePoints.length === 0 ||
      Math.abs(p.x - uniquePoints[uniquePoints.length - 1].x) > 1e-10 ||
      Math.abs(p.y - uniquePoints[uniquePoints.length - 1].y) > 1e-10) {
      uniquePoints.push(p);
    }
  }

  // Check each segment between consecutive points
  for (let i = 0; i < uniquePoints.length - 1; i++) {
    const midpoint = {
      x: (uniquePoints[i].x + uniquePoints[i + 1].x) / 2,
      y: (uniquePoints[i].y + uniquePoints[i + 1].y) / 2
    };

    if (shape.containsPoint(midpoint)) {
      segments.push({
        start: uniquePoints[i],
        end: uniquePoints[i + 1]
      });
    }
  }

  return segments;
}

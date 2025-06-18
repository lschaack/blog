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

  // Pre-calculate bounds for faster checks
  private outerRight: number;
  private outerBottom: number;
  private holeRight: number;
  private holeBottom: number;

  constructor(outer: Rectangle, hole: Rectangle) {
    this.outer = outer;
    this.hole = hole;

    // Pre-calculate bounds
    this.outerRight = outer.x + outer.width;
    this.outerBottom = outer.y + outer.height;
    this.holeRight = hole.x + hole.width;
    this.holeBottom = hole.y + hole.height;
  }

  containsPoint(p: Point): boolean {
    // Inline all checks for better performance
    return p.x >= this.outer.x &&
      p.x <= this.outerRight &&
      p.y >= this.outer.y &&
      p.y <= this.outerBottom &&
      !(p.x >= this.hole.x &&
        p.x <= this.holeRight &&
        p.y >= this.hole.y &&
        p.y <= this.holeBottom);
  }
}

// Pre-allocated arrays to avoid repeated allocations
const EDGE_POINTS = new Float64Array(16); // 4 edges * 2 points * 2 coordinates
const TEMP_INTERSECTIONS = new Float64Array(16); // Max 8 intersections * 2 coordinates

function lineRectangleIntersections(
  start: Point,
  end: Point,
  rect: Rectangle,
  intersections: Point[]
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Pre-calculate rectangle bounds
  const rectRight = rect.x + rect.width;
  const rectBottom = rect.y + rect.height;

  // Fill edge points array
  // Top edge
  EDGE_POINTS[0] = rect.x; EDGE_POINTS[1] = rect.y;
  EDGE_POINTS[2] = rectRight; EDGE_POINTS[3] = rect.y;
  // Right edge
  EDGE_POINTS[4] = rectRight; EDGE_POINTS[5] = rect.y;
  EDGE_POINTS[6] = rectRight; EDGE_POINTS[7] = rectBottom;
  // Bottom edge
  EDGE_POINTS[8] = rectRight; EDGE_POINTS[9] = rectBottom;
  EDGE_POINTS[10] = rect.x; EDGE_POINTS[11] = rectBottom;
  // Left edge
  EDGE_POINTS[12] = rect.x; EDGE_POINTS[13] = rectBottom;
  EDGE_POINTS[14] = rect.x; EDGE_POINTS[15] = rect.y;

  let count = 0;

  // Unrolled loop for each edge
  for (let i = 0; i < 16; i += 4) {
    const p1x = EDGE_POINTS[i];
    const p1y = EDGE_POINTS[i + 1];
    const p2x = EDGE_POINTS[i + 2];
    const p2y = EDGE_POINTS[i + 3];

    const edgeDx = p2x - p1x;
    const edgeDy = p2y - p1y;

    // Solve parametric equations
    const denominator = dx * edgeDy - dy * edgeDx;

    // Use bitwise OR to convert to integer for comparison (avoids deopt)
    if ((denominator | 0) === 0) continue; // Parallel lines

    const invDenom = 1 / denominator;
    const t = ((p1x - start.x) * edgeDy - (p1y - start.y) * edgeDx) * invDenom;

    // Early exit if t is out of range
    if (t < 0 || t > 1) continue;

    const u = ((p1x - start.x) * dy - (p1y - start.y) * dx) * invDenom;

    // Check if intersection is within both line segments
    if (u >= 0 && u <= 1) {
      TEMP_INTERSECTIONS[count * 2] = start.x + t * dx;
      TEMP_INTERSECTIONS[count * 2 + 1] = start.y + t * dy;
      count++;
    }
  }

  // Copy results to output array
  for (let i = 0; i < count; i++) {
    intersections[i] = {
      x: TEMP_INTERSECTIONS[i * 2],
      y: TEMP_INTERSECTIONS[i * 2 + 1]
    };
  }

  return count;
}

// Pre-allocated arrays for findVectorSegmentsInShape
const OUTER_INTERSECTIONS: Point[] = new Array(4);
const HOLE_INTERSECTIONS: Point[] = new Array(4);
const ALL_POINTS: Point[] = new Array(10); // max: start + end + 4 outer + 4 hole

// Initialize arrays with consistent shape
for (let i = 0; i < 4; i++) {
  OUTER_INTERSECTIONS[i] = { x: 0, y: 0 };
  HOLE_INTERSECTIONS[i] = { x: 0, y: 0 };
}
for (let i = 0; i < 10; i++) {
  ALL_POINTS[i] = { x: 0, y: 0 };
}

export function findVectorSegmentsInShape(
  start: Point,
  end: Point,
  shape: ShapeWithHole
): LineSegment[] {
  const segments: LineSegment[] = [];

  // Get all intersection points with outer rectangle
  const outerCount = lineRectangleIntersections(start, end, shape.outer, OUTER_INTERSECTIONS);

  // Get all intersection points with hole
  const holeCount = lineRectangleIntersections(start, end, shape.hole, HOLE_INTERSECTIONS);

  // Combine all points including start and end
  let totalPoints = 0;

  // Add start point
  ALL_POINTS[totalPoints].x = start.x;
  ALL_POINTS[totalPoints].y = start.y;
  totalPoints++;

  // Add outer intersections
  for (let i = 0; i < outerCount; i++) {
    ALL_POINTS[totalPoints].x = OUTER_INTERSECTIONS[i].x;
    ALL_POINTS[totalPoints].y = OUTER_INTERSECTIONS[i].y;
    totalPoints++;
  }

  // Add hole intersections
  for (let i = 0; i < holeCount; i++) {
    ALL_POINTS[totalPoints].x = HOLE_INTERSECTIONS[i].x;
    ALL_POINTS[totalPoints].y = HOLE_INTERSECTIONS[i].y;
    totalPoints++;
  }

  // Add end point
  ALL_POINTS[totalPoints].x = end.x;
  ALL_POINTS[totalPoints].y = end.y;
  totalPoints++;

  // Sort points along the vector direction using insertion sort (faster for small arrays)
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const invLengthSquared = 1 / lengthSquared;

  // Calculate sort keys
  const sortKeys = new Float64Array(totalPoints);
  for (let i = 0; i < totalPoints; i++) {
    sortKeys[i] = ((ALL_POINTS[i].x - start.x) * dx + (ALL_POINTS[i].y - start.y) * dy) * invLengthSquared;
  }

  // Insertion sort (optimal for small arrays)
  for (let i = 1; i < totalPoints; i++) {
    const keyI = sortKeys[i];
    const pointI = ALL_POINTS[i];
    const tempX = pointI.x;
    const tempY = pointI.y;

    let j = i - 1;
    while (j >= 0 && sortKeys[j] > keyI) {
      sortKeys[j + 1] = sortKeys[j];
      ALL_POINTS[j + 1].x = ALL_POINTS[j].x;
      ALL_POINTS[j + 1].y = ALL_POINTS[j].y;
      j--;
    }

    sortKeys[j + 1] = keyI;
    ALL_POINTS[j + 1].x = tempX;
    ALL_POINTS[j + 1].y = tempY;
  }

  // Remove duplicates in-place
  let uniqueCount = 0;
  for (let i = 0; i < totalPoints; i++) {
    if (uniqueCount === 0 ||
      Math.abs(ALL_POINTS[i].x - ALL_POINTS[uniqueCount - 1].x) > 1e-10 ||
      Math.abs(ALL_POINTS[i].y - ALL_POINTS[uniqueCount - 1].y) > 1e-10) {
      if (i !== uniqueCount) {
        ALL_POINTS[uniqueCount].x = ALL_POINTS[i].x;
        ALL_POINTS[uniqueCount].y = ALL_POINTS[i].y;
      }
      uniqueCount++;
    }
  }

  // Check each segment between consecutive points
  const midpoint = { x: 0, y: 0 }; // Reuse single midpoint object

  for (let i = 0; i < uniqueCount - 1; i++) {
    midpoint.x = (ALL_POINTS[i].x + ALL_POINTS[i + 1].x) * 0.5;
    midpoint.y = (ALL_POINTS[i].y + ALL_POINTS[i + 1].y) * 0.5;

    if (shape.containsPoint(midpoint)) {
      segments.push({
        start: { x: ALL_POINTS[i].x, y: ALL_POINTS[i].y },
        end: { x: ALL_POINTS[i + 1].x, y: ALL_POINTS[i + 1].y }
      });
    }
  }

  return segments;
}

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

    // Check corners
    const corners = [
      { x: rect.x + rect.radius, y: rect.y + rect.radius },                    // top-left
      { x: rect.x + rect.width - rect.radius, y: rect.y + rect.radius },      // top-right
      { x: rect.x + rect.width - rect.radius, y: rect.y + rect.height - rect.radius }, // bottom-right
      { x: rect.x + rect.radius, y: rect.y + rect.height - rect.radius }      // bottom-left
    ];

    // Check if point is in a corner region that needs radius checking
    if (p.x < rect.x + rect.radius && p.y < rect.y + rect.radius) {
      // Top-left corner
      return this.distance(p, corners[0]) <= rect.radius;
    } else if (p.x > rect.x + rect.width - rect.radius && p.y < rect.y + rect.radius) {
      // Top-right corner
      return this.distance(p, corners[1]) <= rect.radius;
    } else if (p.x > rect.x + rect.width - rect.radius && p.y > rect.y + rect.height - rect.radius) {
      // Bottom-right corner
      return this.distance(p, corners[2]) <= rect.radius;
    } else if (p.x < rect.x + rect.radius && p.y > rect.y + rect.height - rect.radius) {
      // Bottom-left corner
      return this.distance(p, corners[3]) <= rect.radius;
    }

    return true;
  }

  private distance(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

function lineCircleIntersections(start: Point, end: Point, center: Point, radius: number): Point[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const fx = start.x - center.x;
  const fy = start.y - center.y;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];

  const intersections: Point[] = [];
  const sqrt_discriminant = Math.sqrt(discriminant);

  const t1 = (-b - sqrt_discriminant) / (2 * a);
  const t2 = (-b + sqrt_discriminant) / (2 * a);

  if (t1 >= 0 && t1 <= 1) {
    intersections.push({
      x: start.x + t1 * dx,
      y: start.y + t1 * dy
    });
  }

  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 1e-10) {
    intersections.push({
      x: start.x + t2 * dx,
      y: start.y + t2 * dy
    });
  }

  return intersections;
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

function lineRoundedRectangleIntersections(start: Point, end: Point, rect: RoundedRectangle): Point[] {
  const intersections: Point[] = [];

  if (rect.radius === 0) {
    // Simple rectangle case
    const edges = [
      { p1: { x: rect.x, y: rect.y }, p2: { x: rect.x + rect.width, y: rect.y } },
      { p1: { x: rect.x + rect.width, y: rect.y }, p2: { x: rect.x + rect.width, y: rect.y + rect.height } },
      { p1: { x: rect.x + rect.width, y: rect.y + rect.height }, p2: { x: rect.x, y: rect.y + rect.height } },
      { p1: { x: rect.x, y: rect.y + rect.height }, p2: { x: rect.x, y: rect.y } }
    ];

    for (const edge of edges) {
      const intersection = lineSegmentIntersection(start, end, edge.p1, edge.p2);
      if (intersection) intersections.push(intersection);
    }
  } else {
    // Rounded rectangle case
    const r = rect.radius;

    // Define the straight edges (shortened by radius)
    const edges = [
      // Top edge
      { p1: { x: rect.x + r, y: rect.y }, p2: { x: rect.x + rect.width - r, y: rect.y } },
      // Right edge
      { p1: { x: rect.x + rect.width, y: rect.y + r }, p2: { x: rect.x + rect.width, y: rect.y + rect.height - r } },
      // Bottom edge
      { p1: { x: rect.x + rect.width - r, y: rect.y + rect.height }, p2: { x: rect.x + r, y: rect.y + rect.height } },
      // Left edge
      { p1: { x: rect.x, y: rect.y + rect.height - r }, p2: { x: rect.x, y: rect.y + r } }
    ];

    // Check straight edge intersections
    for (const edge of edges) {
      const intersection = lineSegmentIntersection(start, end, edge.p1, edge.p2);
      if (intersection) intersections.push(intersection);
    }

    // Define corner circles
    const corners = [
      { center: { x: rect.x + r, y: rect.y + r }, startAngle: Math.PI, endAngle: 1.5 * Math.PI }, // top-left
      { center: { x: rect.x + rect.width - r, y: rect.y + r }, startAngle: 1.5 * Math.PI, endAngle: 2 * Math.PI }, // top-right
      { center: { x: rect.x + rect.width - r, y: rect.y + rect.height - r }, startAngle: 0, endAngle: 0.5 * Math.PI }, // bottom-right
      { center: { x: rect.x + r, y: rect.y + rect.height - r }, startAngle: 0.5 * Math.PI, endAngle: Math.PI } // bottom-left
    ];

    // Check corner arc intersections
    for (const corner of corners) {
      const circleIntersections = lineCircleIntersections(start, end, corner.center, r);

      for (const p of circleIntersections) {
        // Check if intersection is on the actual arc (not the full circle)
        const angle = Math.atan2(p.y - corner.center.y, p.x - corner.center.x);
        const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;

        if (normalizedAngle >= corner.startAngle && normalizedAngle <= corner.endAngle) {
          intersections.push(p);
        }
      }
    }
  }

  return intersections;
}

export function findVectorSegmentsInRoundedShape(
  start: Point,
  end: Point,
  shape: RoundedShapeWithHole
): LineSegment[] {
  const segments: LineSegment[] = [];

  // Get all intersection points
  const outerIntersections = lineRoundedRectangleIntersections(start, end, shape.outer);
  const holeIntersections = lineRoundedRectangleIntersections(start, end, shape.hole);

  // Combine all points
  const allPoints: Point[] = [start, ...outerIntersections, ...holeIntersections, end];

  // Sort points along vector
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  allPoints.sort((a, b) => {
    const ta = ((a.x - start.x) * dx + (a.y - start.y) * dy) / (length * length);
    const tb = ((b.x - start.x) * dx + (b.y - start.y) * dy) / (length * length);
    return ta - tb;
  });

  // Remove duplicates
  const uniquePoints: Point[] = [];
  for (const p of allPoints) {
    if (uniquePoints.length === 0 ||
      Math.abs(p.x - uniquePoints[uniquePoints.length - 1].x) > 1e-10 ||
      Math.abs(p.y - uniquePoints[uniquePoints.length - 1].y) > 1e-10) {
      uniquePoints.push(p);
    }
  }

  // Check segments
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

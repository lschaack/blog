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

function lineCircleIntersections(startX: number, startY: number, endX: number, endY: number, centerX: number, centerY: number, radius: number, results: number[]): number {
  const dx = endX - startX;
  const dy = endY - startY;
  const fx = startX - centerX;
  const fy = startY - centerY;

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
    results[count * 2] = startX + t1 * dx;
    results[count * 2 + 1] = startY + t1 * dy;
    count++;
  }

  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 1e-10) {
    results[count * 2] = startX + t2 * dx;
    results[count * 2 + 1] = startY + t2 * dy;
    count++;
  }

  return count;
}

function lineSegmentIntersection(p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number, p4x: number, p4y: number, result: number[]): boolean {
  const dx1 = p2x - p1x;
  const dy1 = p2y - p1y;
  const dx2 = p4x - p3x;
  const dy2 = p4y - p3y;

  const denominator = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denominator) < 1e-10) return false;

  const t = ((p3x - p1x) * dy2 - (p3y - p1y) * dx2) / denominator;
  const u = ((p3x - p1x) * dy1 - (p3y - p1y) * dx1) / denominator;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    result[0] = p1x + t * dx1;
    result[1] = p1y + t * dy1;
    return true;
  }

  return false;
}

function lineRoundedRectangleIntersections(startX: number, startY: number, endX: number, endY: number, rect: RoundedRectangle, results: number[]): number {
  let count = 0;
  const tempIntersection = [0, 0];

  if (rect.radius === 0) {
    // Simple rectangle case - check 4 edges directly
    if (lineSegmentIntersection(startX, startY, endX, endY, rect.x, rect.y, rect.x + rect.width, rect.y, tempIntersection)) {
      results[count * 2] = tempIntersection[0];
      results[count * 2 + 1] = tempIntersection[1];
      count++;
    }

    if (lineSegmentIntersection(startX, startY, endX, endY, rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height, tempIntersection)) {
      results[count * 2] = tempIntersection[0];
      results[count * 2 + 1] = tempIntersection[1];
      count++;
    }

    if (lineSegmentIntersection(startX, startY, endX, endY, rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height, tempIntersection)) {
      results[count * 2] = tempIntersection[0];
      results[count * 2 + 1] = tempIntersection[1];
      count++;
    }

    if (lineSegmentIntersection(startX, startY, endX, endY, rect.x, rect.y + rect.height, rect.x, rect.y, tempIntersection)) {
      results[count * 2] = tempIntersection[0];
      results[count * 2 + 1] = tempIntersection[1];
      count++;
    }
  } else {
    // Rounded rectangle case
    const r = rect.radius;

    // Check straight edge intersections directly
    if (lineSegmentIntersection(startX, startY, endX, endY, rect.x + r, rect.y, rect.x + rect.width - r, rect.y, tempIntersection)) {
      results[count * 2] = tempIntersection[0];
      results[count * 2 + 1] = tempIntersection[1];
      count++;
    }

    if (lineSegmentIntersection(startX, startY, endX, endY, rect.x + rect.width, rect.y + r, rect.x + rect.width, rect.y + rect.height - r, tempIntersection)) {
      results[count * 2] = tempIntersection[0];
      results[count * 2 + 1] = tempIntersection[1];
      count++;
    }

    if (lineSegmentIntersection(startX, startY, endX, endY, rect.x + rect.width - r, rect.y + rect.height, rect.x + r, rect.y + rect.height, tempIntersection)) {
      results[count * 2] = tempIntersection[0];
      results[count * 2 + 1] = tempIntersection[1];
      count++;
    }

    if (lineSegmentIntersection(startX, startY, endX, endY, rect.x, rect.y + rect.height - r, rect.x, rect.y + r, tempIntersection)) {
      results[count * 2] = tempIntersection[0];
      results[count * 2 + 1] = tempIntersection[1];
      count++;
    }

    // Check corner arc intersections - reuse temp array
    const tempCircleIntersections = new Array(4); // Max 2 intersections * 2 coords
    
    // Top-left corner
    const tlCount = lineCircleIntersections(startX, startY, endX, endY, rect.x + r, rect.y + r, r, tempCircleIntersections);
    for (let i = 0; i < tlCount; i++) {
      const px = tempCircleIntersections[i * 2];
      const py = tempCircleIntersections[i * 2 + 1];
      const angle = Math.atan2(py - (rect.y + r), px - (rect.x + r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (normalizedAngle >= Math.PI && normalizedAngle <= 1.5 * Math.PI) {
        results[count * 2] = px;
        results[count * 2 + 1] = py;
        count++;
      }
    }

    // Top-right corner
    const trCount = lineCircleIntersections(startX, startY, endX, endY, rect.x + rect.width - r, rect.y + r, r, tempCircleIntersections);
    for (let i = 0; i < trCount; i++) {
      const px = tempCircleIntersections[i * 2];
      const py = tempCircleIntersections[i * 2 + 1];
      const angle = Math.atan2(py - (rect.y + r), px - (rect.x + rect.width - r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (normalizedAngle >= 1.5 * Math.PI && normalizedAngle <= 2 * Math.PI) {
        results[count * 2] = px;
        results[count * 2 + 1] = py;
        count++;
      }
    }

    // Bottom-right corner
    const brCount = lineCircleIntersections(startX, startY, endX, endY, rect.x + rect.width - r, rect.y + rect.height - r, r, tempCircleIntersections);
    for (let i = 0; i < brCount; i++) {
      const px = tempCircleIntersections[i * 2];
      const py = tempCircleIntersections[i * 2 + 1];
      const angle = Math.atan2(py - (rect.y + rect.height - r), px - (rect.x + rect.width - r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (normalizedAngle >= 0 && normalizedAngle <= 0.5 * Math.PI) {
        results[count * 2] = px;
        results[count * 2 + 1] = py;
        count++;
      }
    }

    // Bottom-left corner
    const blCount = lineCircleIntersections(startX, startY, endX, endY, rect.x + r, rect.y + rect.height - r, r, tempCircleIntersections);
    for (let i = 0; i < blCount; i++) {
      const px = tempCircleIntersections[i * 2];
      const py = tempCircleIntersections[i * 2 + 1];
      const angle = Math.atan2(py - (rect.y + rect.height - r), px - (rect.x + r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (normalizedAngle >= 0.5 * Math.PI && normalizedAngle <= Math.PI) {
        results[count * 2] = px;
        results[count * 2 + 1] = py;
        count++;
      }
    }
  }

  return count;
}

export function findVectorSegmentsInRoundedShape(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  shape: RoundedShapeWithHole
): LineSegment[] {
  const segments: LineSegment[] = [];

  // Reuse arrays for intersections - store as flat x,y coordinates
  const outerIntersections = new Array(16); // Max 8 intersections * 2 coords
  const holeIntersections = new Array(16);
  
  const outerCount = lineRoundedRectangleIntersections(startX, startY, endX, endY, shape.outer, outerIntersections);
  const holeCount = lineRoundedRectangleIntersections(startX, startY, endX, endY, shape.hole, holeIntersections);

  // Pre-allocate combined points array as flat coordinates
  const totalPoints = 2 + outerCount + holeCount;
  const allCoords = new Array(totalPoints * 2);
  allCoords[0] = startX;
  allCoords[1] = startY;
  
  let coordIndex = 2;
  for (let i = 0; i < outerCount; i++) {
    allCoords[coordIndex++] = outerIntersections[i * 2];
    allCoords[coordIndex++] = outerIntersections[i * 2 + 1];
  }
  for (let i = 0; i < holeCount; i++) {
    allCoords[coordIndex++] = holeIntersections[i * 2];
    allCoords[coordIndex++] = holeIntersections[i * 2 + 1];
  }
  allCoords[coordIndex++] = endX;
  allCoords[coordIndex] = endY;

  // Sort points along vector
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = dx * dx + dy * dy;

  // Create indices for sorting
  const indices = new Array(totalPoints);
  for (let i = 0; i < totalPoints; i++) {
    indices[i] = i;
  }

  indices.sort((a, b) => {
    const ax = allCoords[a * 2];
    const ay = allCoords[a * 2 + 1];
    const bx = allCoords[b * 2];
    const by = allCoords[b * 2 + 1];
    
    const ta = ((ax - startX) * dx + (ay - startY) * dy) / lengthSquared;
    const tb = ((bx - startX) * dx + (by - startY) * dy) / lengthSquared;
    return ta - tb;
  });

  // Remove duplicates using sorted indices
  const uniqueIndices = [indices[0]];
  for (let i = 1; i < indices.length; i++) {
    const currIdx = indices[i];
    const prevIdx = uniqueIndices[uniqueIndices.length - 1];
    
    const currX = allCoords[currIdx * 2];
    const currY = allCoords[currIdx * 2 + 1];
    const prevX = allCoords[prevIdx * 2];
    const prevY = allCoords[prevIdx * 2 + 1];
    
    if (Math.abs(currX - prevX) > 1e-10 || Math.abs(currY - prevY) > 1e-10) {
      uniqueIndices.push(currIdx);
    }
  }

  // Check segments
  for (let i = 0; i < uniqueIndices.length - 1; i++) {
    const idx1 = uniqueIndices[i];
    const idx2 = uniqueIndices[i + 1];
    
    const p1x = allCoords[idx1 * 2];
    const p1y = allCoords[idx1 * 2 + 1];
    const p2x = allCoords[idx2 * 2];
    const p2y = allCoords[idx2 * 2 + 1];
    
    // Reuse midpoint calculation without object allocation
    const midX = (p1x + p2x) / 2;
    const midY = (p1y + p2y) / 2;
    
    if (shape.containsPoint(midX, midY)) {
      segments.push({
        startX: p1x,
        startY: p1y,
        endX: p2x,
        endY: p2y
      });
    }
  }

  return segments;
}
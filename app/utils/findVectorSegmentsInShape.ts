// Thanks Claude
export interface LineSegment {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// Pre-allocated memory pools using primitive arrays to eliminate ALL object allocations
const WORKING_ARRAY_SIZE = 100;

// Working arrays using primitive coordinates - no object allocations ever
const WORKING_X = new Float64Array(WORKING_ARRAY_SIZE);
const WORKING_Y = new Float64Array(WORKING_ARRAY_SIZE);
const WORKING_ALL_X = new Float64Array(WORKING_ARRAY_SIZE);
const WORKING_ALL_Y = new Float64Array(WORKING_ARRAY_SIZE);
const WORKING_UNIQUE_X = new Float64Array(WORKING_ARRAY_SIZE);
const WORKING_UNIQUE_Y = new Float64Array(WORKING_ARRAY_SIZE);

// Note: Pool management removed - coordinates are written directly to working arrays, no pooling needed

function resetPools(): void {
  // No pools to reset - all operations use working arrays directly
}

export interface RoundedRectangle {
  x: number;      // left edge (before rounding)
  y: number;      // top edge (before rounding)
  width: number;
  height: number;
  radius: number; // corner radius (0 for sharp corners)
}

export class RoundedShapeWithHole {
  private _outer: RoundedRectangle;
  private _hole: RoundedRectangle;

  constructor(outer: RoundedRectangle, hole: RoundedRectangle) {
    this._outer = outer;
    this._hole = hole;
    // Ensure radius doesn't exceed half of smallest dimension
    this._outer.radius = Math.min(this._outer.radius, this._outer.width / 2, this._outer.height / 2);
    this._outer.radius = Math.min(this._outer.radius, this._outer.width / 2, this._outer.height / 2);
  }

  get outer() {
    return this._outer;
  }

  set outer(next: RoundedRectangle) {
    this._outer = next;
    // Ensure radius doesn't exceed half of smallest dimension
    this._outer.radius = Math.min(this._outer.radius, this._outer.width / 2, this._outer.height / 2);
  }

  get hole() {
    return this._hole;
  }

  set hole(next: RoundedRectangle) {
    this._hole = next;
    // Ensure radius doesn't exceed half of smallest dimension
    this._hole.radius = Math.min(this._hole.radius, this._hole.width / 2, this._hole.height / 2);
  }

  containsPoint(x: number, y: number): boolean {
    return this.isInRoundedRect(x, y, this._outer) && !this.isInRoundedRect(x, y, this._hole);
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
  targetXArray: Float64Array,
  targetYArray: Float64Array,
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
    targetXArray[targetIndex + count] = startX + t1 * dx;
    targetYArray[targetIndex + count] = startY + t1 * dy;
    count++;
  }

  if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 1e-10) {
    targetXArray[targetIndex + count] = startX + t2 * dx;
    targetYArray[targetIndex + count] = startY + t2 * dy;
    count++;
  }

  return count;
}

function tryAddLineSegmentIntersection(
  targetXArray: Float64Array,
  targetYArray: Float64Array,
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
    targetXArray[targetIndex] = x1 + t * dx1;
    targetYArray[targetIndex] = y1 + t * dy1;
    return 1;
  }

  return 0;
}

function populateLineRoundedRectangleIntersections(
  targetXArray: Float64Array,
  targetYArray: Float64Array,
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
      targetXArray, targetYArray, targetIndex + count,
      startX, startY, endX, endY,
      rect.x, rect.y, rect.x + rect.width, rect.y
    );
    // Right edge
    count += tryAddLineSegmentIntersection(
      targetXArray, targetYArray, targetIndex + count,
      startX, startY, endX, endY,
      rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height
    );
    // Bottom edge
    count += tryAddLineSegmentIntersection(
      targetXArray, targetYArray, targetIndex + count,
      startX, startY, endX, endY,
      rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height
    );
    // Left edge
    count += tryAddLineSegmentIntersection(
      targetXArray, targetYArray, targetIndex + count,
      startX, startY, endX, endY,
      rect.x, rect.y + rect.height, rect.x, rect.y
    );
  } else {
    // Rounded rectangle case
    const r = rect.radius;

    // Check straight edge intersections
    // Top edge
    count += tryAddLineSegmentIntersection(
      targetXArray, targetYArray, targetIndex + count,
      startX, startY, endX, endY,
      rect.x + r, rect.y, rect.x + rect.width - r, rect.y
    );
    // Right edge
    count += tryAddLineSegmentIntersection(
      targetXArray, targetYArray, targetIndex + count,
      startX, startY, endX, endY,
      rect.x + rect.width, rect.y + r, rect.x + rect.width, rect.y + rect.height - r
    );
    // Bottom edge
    count += tryAddLineSegmentIntersection(
      targetXArray, targetYArray, targetIndex + count,
      startX, startY, endX, endY,
      rect.x + rect.width - r, rect.y + rect.height, rect.x + r, rect.y + rect.height
    );
    // Left edge
    count += tryAddLineSegmentIntersection(
      targetXArray, targetYArray, targetIndex + count,
      startX, startY, endX, endY,
      rect.x, rect.y + rect.height - r, rect.x, rect.y + r
    );

    // Check corner arc intersections
    // Top-left corner
    const tlCount = populateLineCircleIntersections(
      WORKING_X, WORKING_Y, 0,
      startX, startY, endX, endY,
      rect.x + r, rect.y + r, r
    );
    for (let i = 0; i < tlCount; i++) {
      const px = WORKING_X[i];
      const py = WORKING_Y[i];
      const angle = Math.atan2(py - (rect.y + r), px - (rect.x + r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (normalizedAngle >= Math.PI && normalizedAngle <= 1.5 * Math.PI) {
        targetXArray[targetIndex + count] = px;
        targetYArray[targetIndex + count] = py;
        count++;
      }
    }

    // Top-right corner
    const trCount = populateLineCircleIntersections(
      WORKING_X, WORKING_Y, 0,
      startX, startY, endX, endY,
      rect.x + rect.width - r, rect.y + r, r
    );
    for (let i = 0; i < trCount; i++) {
      const px = WORKING_X[i];
      const py = WORKING_Y[i];
      const angle = Math.atan2(py - (rect.y + r), px - (rect.x + rect.width - r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (normalizedAngle >= 1.5 * Math.PI && normalizedAngle <= 2 * Math.PI) {
        targetXArray[targetIndex + count] = px;
        targetYArray[targetIndex + count] = py;
        count++;
      }
    }

    // Bottom-right corner
    const brCount = populateLineCircleIntersections(
      WORKING_X, WORKING_Y, 0,
      startX, startY, endX, endY,
      rect.x + rect.width - r, rect.y + rect.height - r, r
    );
    for (let i = 0; i < brCount; i++) {
      const px = WORKING_X[i];
      const py = WORKING_Y[i];
      const angle = Math.atan2(py - (rect.y + rect.height - r), px - (rect.x + rect.width - r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (normalizedAngle >= 0 && normalizedAngle <= 0.5 * Math.PI) {
        targetXArray[targetIndex + count] = px;
        targetYArray[targetIndex + count] = py;
        count++;
      }
    }

    // Bottom-left corner
    const blCount = populateLineCircleIntersections(
      WORKING_X, WORKING_Y, 0,
      startX, startY, endX, endY,
      rect.x + r, rect.y + rect.height - r, r
    );
    for (let i = 0; i < blCount; i++) {
      const px = WORKING_X[i];
      const py = WORKING_Y[i];
      const angle = Math.atan2(py - (rect.y + rect.height - r), px - (rect.x + r));
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      if (normalizedAngle >= 0.5 * Math.PI && normalizedAngle <= Math.PI) {
        targetXArray[targetIndex + count] = px;
        targetYArray[targetIndex + count] = py;
        count++;
      }
    }
  }

  return count;
}

// Zero-allocation version that populates primitive coordinate arrays
export function populateVectorSegmentsPrimitive(
  resultStartX: Float64Array,
  resultStartY: Float64Array,
  resultEndX: Float64Array,
  resultEndY: Float64Array,
  maxResults: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  shape: RoundedShapeWithHole
): number {
  // Reset pools at start of operation
  resetPools();

  // Populate start point
  WORKING_ALL_X[0] = startX;
  WORKING_ALL_Y[0] = startY;
  let allPointsCount = 1;

  // Get outer intersections
  const outerCount = populateLineRoundedRectangleIntersections(
    WORKING_ALL_X, WORKING_ALL_Y, allPointsCount,
    startX, startY, endX, endY, shape.outer
  );
  allPointsCount += outerCount;

  // Get hole intersections
  const holeCount = populateLineRoundedRectangleIntersections(
    WORKING_ALL_X, WORKING_ALL_Y, allPointsCount,
    startX, startY, endX, endY, shape.hole
  );
  allPointsCount += holeCount;

  // Add end point
  WORKING_ALL_X[allPointsCount] = endX;
  WORKING_ALL_Y[allPointsCount] = endY;
  allPointsCount++;

  // Sort points along vector using manual sorting with primitive arrays
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = dx * dx + dy * dy;

  // Simple insertion sort with primitive coordinates
  for (let i = 1; i < allPointsCount; i++) {
    const currentX = WORKING_ALL_X[i];
    const currentY = WORKING_ALL_Y[i];
    const currentT = ((currentX - startX) * dx + (currentY - startY) * dy) / lengthSquared;

    let j = i - 1;
    while (j >= 0) {
      const compareX = WORKING_ALL_X[j];
      const compareY = WORKING_ALL_Y[j];
      const compareT = ((compareX - startX) * dx + (compareY - startY) * dy) / lengthSquared;

      if (compareT <= currentT) break;

      // Swap coordinates
      WORKING_ALL_X[j + 1] = WORKING_ALL_X[j];
      WORKING_ALL_Y[j + 1] = WORKING_ALL_Y[j];
      j--;
    }
    WORKING_ALL_X[j + 1] = currentX;
    WORKING_ALL_Y[j + 1] = currentY;
  }

  // Remove duplicates using primitive coordinates
  let uniqueCount = 0;
  for (let i = 0; i < allPointsCount; i++) {
    const currentX = WORKING_ALL_X[i];
    const currentY = WORKING_ALL_Y[i];

    if (uniqueCount === 0) {
      WORKING_UNIQUE_X[uniqueCount] = currentX;
      WORKING_UNIQUE_Y[uniqueCount] = currentY;
      uniqueCount++;
    } else {
      const lastX = WORKING_UNIQUE_X[uniqueCount - 1];
      const lastY = WORKING_UNIQUE_Y[uniqueCount - 1];
      if (Math.abs(currentX - lastX) > 1e-10 || Math.abs(currentY - lastY) > 1e-10) {
        WORKING_UNIQUE_X[uniqueCount] = currentX;
        WORKING_UNIQUE_Y[uniqueCount] = currentY;
        uniqueCount++;
      }
    }
  }

  // Build segments directly into caller's primitive arrays - zero property assignments
  let segmentCount = 0;
  for (let i = 0; i < uniqueCount - 1 && segmentCount < maxResults; i++) {
    const startPtX = WORKING_UNIQUE_X[i];
    const startPtY = WORKING_UNIQUE_Y[i];
    const endPtX = WORKING_UNIQUE_X[i + 1];
    const endPtY = WORKING_UNIQUE_Y[i + 1];
    const midpointX = (startPtX + endPtX) / 2;
    const midpointY = (startPtY + endPtY) / 2;

    if (shape.containsPoint(midpointX, midpointY)) {
      // Direct primitive array writes - no objects, no property assignments
      resultStartX[segmentCount] = startPtX;
      resultStartY[segmentCount] = startPtY;
      resultEndX[segmentCount] = endPtX;
      resultEndY[segmentCount] = endPtY;
      segmentCount++;
    }
  }

  return segmentCount;
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

  // Populate start point
  WORKING_ALL_X[0] = startX;
  WORKING_ALL_Y[0] = startY;
  let allPointsCount = 1;

  // Get outer intersections
  const outerCount = populateLineRoundedRectangleIntersections(
    WORKING_ALL_X, WORKING_ALL_Y, allPointsCount,
    startX, startY, endX, endY, shape.outer
  );
  allPointsCount += outerCount;

  // Get hole intersections
  const holeCount = populateLineRoundedRectangleIntersections(
    WORKING_ALL_X, WORKING_ALL_Y, allPointsCount,
    startX, startY, endX, endY, shape.hole
  );
  allPointsCount += holeCount;

  // Add end point
  WORKING_ALL_X[allPointsCount] = endX;
  WORKING_ALL_Y[allPointsCount] = endY;
  allPointsCount++;

  // Sort points along vector using manual sorting with primitive arrays
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = dx * dx + dy * dy;

  // Simple insertion sort with primitive coordinates
  for (let i = 1; i < allPointsCount; i++) {
    const currentX = WORKING_ALL_X[i];
    const currentY = WORKING_ALL_Y[i];
    const currentT = ((currentX - startX) * dx + (currentY - startY) * dy) / lengthSquared;

    let j = i - 1;
    while (j >= 0) {
      const compareX = WORKING_ALL_X[j];
      const compareY = WORKING_ALL_Y[j];
      const compareT = ((compareX - startX) * dx + (compareY - startY) * dy) / lengthSquared;

      if (compareT <= currentT) break;

      // Swap coordinates
      WORKING_ALL_X[j + 1] = WORKING_ALL_X[j];
      WORKING_ALL_Y[j + 1] = WORKING_ALL_Y[j];
      j--;
    }
    WORKING_ALL_X[j + 1] = currentX;
    WORKING_ALL_Y[j + 1] = currentY;
  }

  // Remove duplicates using primitive coordinates
  let uniqueCount = 0;
  for (let i = 0; i < allPointsCount; i++) {
    const currentX = WORKING_ALL_X[i];
    const currentY = WORKING_ALL_Y[i];

    if (uniqueCount === 0) {
      WORKING_UNIQUE_X[uniqueCount] = currentX;
      WORKING_UNIQUE_Y[uniqueCount] = currentY;
      uniqueCount++;
    } else {
      const lastX = WORKING_UNIQUE_X[uniqueCount - 1];
      const lastY = WORKING_UNIQUE_Y[uniqueCount - 1];
      if (Math.abs(currentX - lastX) > 1e-10 || Math.abs(currentY - lastY) > 1e-10) {
        WORKING_UNIQUE_X[uniqueCount] = currentX;
        WORKING_UNIQUE_Y[uniqueCount] = currentY;
        uniqueCount++;
      }
    }
  }

  // Build segments directly into caller's array
  let segmentCount = 0;
  for (let i = 0; i < uniqueCount - 1 && segmentCount < maxResults; i++) {
    const startPtX = WORKING_UNIQUE_X[i];
    const startPtY = WORKING_UNIQUE_Y[i];
    const endPtX = WORKING_UNIQUE_X[i + 1];
    const endPtY = WORKING_UNIQUE_Y[i + 1];
    const midpointX = (startPtX + endPtX) / 2;
    const midpointY = (startPtY + endPtY) / 2;

    if (shape.containsPoint(midpointX, midpointY)) {
      // Populate the caller's pre-allocated segment instead of creating new object
      resultSegments[segmentCount].startX = startPtX;
      resultSegments[segmentCount].startY = startPtY;
      resultSegments[segmentCount].endX = endPtX;
      resultSegments[segmentCount].endY = endPtY;
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

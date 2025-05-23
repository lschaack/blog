// Thanks Claude
type Vec2 = [number, number];
type RectangleCoords = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type IntersectionType =
  | { intersects: false; startInside: false, endInside: false; intersectionPoints: Vec2[] }
  | { intersects: true; startInside: boolean; endInside: boolean; intersectionPoints: Vec2[] };

type DoesLineIntersectRectangle = (lineStart: Vec2, lineEnd: Vec2, rectangle: RectangleCoords) => IntersectionType;

export const doesLineIntersectRectangle: DoesLineIntersectRectangle = (lineStart, lineEnd, rectangle) => {
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  const { top, right, bottom, left } = rectangle;

  // Helper function to check if a point is inside the rectangle
  const isPointInside = (x: number, y: number): boolean => {
    return x >= left && x <= right && y >= top && y <= bottom;
  };

  const startInside = isPointInside(x1, y1);
  const endInside = isPointInside(x2, y2);

  // Helper function to find intersection point between two line segments
  const getSegmentIntersection = (
    p1x: number, p1y: number, p2x: number, p2y: number,
    p3x: number, p3y: number, p4x: number, p4y: number
  ): Vec2 | null => {
    const denom = (p1x - p2x) * (p3y - p4y) - (p1y - p2y) * (p3x - p4x);

    // Lines are parallel
    if (Math.abs(denom) < 1e-10) return null;

    const t = ((p1x - p3x) * (p3y - p4y) - (p1y - p3y) * (p3x - p4x)) / denom;
    const u = -((p1x - p2x) * (p1y - p3y) - (p1y - p2y) * (p1x - p3x)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      const intersectionX = p1x + t * (p2x - p1x);
      const intersectionY = p1y + t * (p2y - p1y);
      return [intersectionX, intersectionY];
    }

    return null;
  };

  // Find all intersection points with rectangle edges
  const intersectionPoints: Vec2[] = [];
  const rectEdges = [
    [left, top, right, top],         // top edge
    [right, top, right, bottom],     // right edge
    [right, bottom, left, bottom],   // bottom edge
    [left, bottom, left, top]        // left edge
  ];

  for (const [ex1, ey1, ex2, ey2] of rectEdges) {
    const intersection = getSegmentIntersection(x1, y1, x2, y2, ex1, ey1, ex2, ey2);
    if (intersection) {
      intersectionPoints.push(intersection);
    }
  }

  // If either endpoint is inside, add them to intersection points
  if (startInside) {
    intersectionPoints.push(lineStart);
  }
  if (endInside) {
    intersectionPoints.push(lineEnd);
  }

  if (intersectionPoints.length > 0) {
    return {
      intersects: true,
      startInside,
      endInside,
      intersectionPoints
    };
  }

  return {
    intersects: false,
    startInside: false,
    endInside: false,
    intersectionPoints
  };
};

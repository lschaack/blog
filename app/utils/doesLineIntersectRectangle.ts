// Thanks Claude
type Vec2 = [number, number];
type RectangleCoords = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type IntersectionType =
  | { intersects: false }
  | { intersects: true; startInside: boolean; endInside: boolean };

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

  // If either endpoint is inside the rectangle, there's an intersection
  if (startInside || endInside) {
    return { intersects: true, startInside, endInside };
  }

  // Helper function to check line segment intersection
  const doSegmentsIntersect = (
    p1x: number, p1y: number, p2x: number, p2y: number,
    p3x: number, p3y: number, p4x: number, p4y: number
  ): boolean => {
    const denom = (p1x - p2x) * (p3y - p4y) - (p1y - p2y) * (p3x - p4x);

    // Lines are parallel
    if (Math.abs(denom) < 1e-10) return false;

    const t = ((p1x - p3x) * (p3y - p4y) - (p1y - p3y) * (p3x - p4x)) / denom;
    const u = -((p1x - p2x) * (p1y - p3y) - (p1y - p2y) * (p1x - p3x)) / denom;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };

  // Check intersection with each of the four rectangle edges
  const rectEdges = [
    [left, bottom, right, bottom],   // bottom edge
    [right, bottom, right, top],     // right edge
    [right, top, left, top],         // top edge
    [left, top, left, bottom]        // left edge
  ];

  const hasEdgeIntersection = rectEdges.some(([ex1, ey1, ex2, ey2]) =>
    doSegmentsIntersect(x1, y1, x2, y2, ex1, ey1, ex2, ey2)
  );

  if (hasEdgeIntersection) {
    return { intersects: true, startInside, endInside };
  }

  return { intersects: false };
};

/**
 * Cubic Bézier Curve Maximum Curvature Finder
 * 
 * For a cubic Bézier curve B(t) with control points P₀, P₁, P₂, P₃:
 * B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
 * 
 * Curvature: κ(t) = |B'(t) × B''(t)| / |B'(t)|³
 * 
 * We find where κ'(t) = 0 to locate curvature extrema.
 */

interface Point2D {
  x: number;
  y: number;
}

/**
 * Computes the first derivative B'(t) of a cubic Bézier curve.
 * B'(t) = 3(1-t)²(P₁-P₀) + 6(1-t)t(P₂-P₁) + 3t²(P₃-P₂)
 */
function bezierFirstDerivative(
  t: number,
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D
): Point2D {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x),
    y: 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y),
  };
}

/**
 * Computes the second derivative B''(t) of a cubic Bézier curve.
 * B''(t) = 6(1-t)(P₂-2P₁+P₀) + 6t(P₃-2P₂+P₁)
 */
function bezierSecondDerivative(
  t: number,
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D
): Point2D {
  const mt = 1 - t;

  // Coefficients for second derivative
  const a = { x: p2.x - 2 * p1.x + p0.x, y: p2.y - 2 * p1.y + p0.y };
  const b = { x: p3.x - 2 * p2.x + p1.x, y: p3.y - 2 * p2.y + p1.y };

  return {
    x: 6 * mt * a.x + 6 * t * b.x,
    y: 6 * mt * a.y + 6 * t * b.y,
  };
}

/**
 * Computes the 2D cross product (z-component of 3D cross product with z=0).
 * For 2D vectors, this gives a scalar: v1.x * v2.y - v1.y * v2.x
 */
function cross2D(v1: Point2D, v2: Point2D): number {
  return v1.x * v2.y - v1.y * v2.x;
}

/**
 * Computes the magnitude (length) of a 2D vector.
 */
function magnitude(v: Point2D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * Computes the curvature κ(t) at parameter t.
 * κ(t) = |B'(t) × B''(t)| / |B'(t)|³
 */
function curvature(
  t: number,
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D
): number {
  const bPrime = bezierFirstDerivative(t, p0, p1, p2, p3);
  const bDoublePrime = bezierSecondDerivative(t, p0, p1, p2, p3);

  const crossProduct = Math.abs(cross2D(bPrime, bDoublePrime));
  const magBPrime = magnitude(bPrime);

  if (magBPrime < 1e-10) {
    return 0; // Avoid division by zero at cusps
  }

  return crossProduct / (magBPrime * magBPrime * magBPrime);
}

/**
 * Computes the derivative of curvature κ'(t) using the quotient rule.
 * 
 * κ(t) = |B' × B''| / |B'|³ = N(t) / D(t)
 * 
 * Where:
 * N(t) = |B' × B''| (numerator)
 * D(t) = |B'|³ (denominator)
 * 
 * κ'(t) = (N'·D - N·D') / D²
 * 
 * We use numerical differentiation for robustness.
 */
function curvatureDerivative(
  t: number,
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  h: number = 1e-7
): number {
  // Use central difference for better accuracy
  const tPlus = Math.min(1, t + h);
  const tMinus = Math.max(0, t - h);
  const actualH = (tPlus - tMinus) / 2;

  if (actualH < 1e-10) {
    return 0;
  }

  const kPlus = curvature(tPlus, p0, p1, p2, p3);
  const kMinus = curvature(tMinus, p0, p1, p2, p3);

  return (kPlus - kMinus) / (2 * actualH);
}

/**
 * Finds roots of κ'(t) = 0 in the interval [0, 1] using a combination of
 * bisection for robustness and Newton-Raphson for speed.
 */
function findCurvatureMaxima(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  tolerance: number = 1e-9,
  numSamples: number = 100
): number[] {
  const roots: number[] = [];

  // Sample κ'(t) to find sign changes (potential roots)
  const samples: { t: number; kPrime: number }[] = [];
  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const kPrime = curvatureDerivative(t, p0, p1, p2, p3);
    samples.push({ t, kPrime });
  }

  // Find intervals where sign changes occur
  for (let i = 0; i < samples.length - 1; i++) {
    const s1 = samples[i];
    const s2 = samples[i + 1];

    // Check for sign change (indicates a root)
    if (s1.kPrime * s2.kPrime < 0) {
      // Use bisection to find the root
      const root = bisectionSearch(
        s1.t,
        s2.t,
        (t) => curvatureDerivative(t, p0, p1, p2, p3),
        tolerance
      );

      if (root !== null && isLocalMaximum(root, p0, p1, p2, p3)) {
        roots.push(root);
      }
    }
  }

  // Also check endpoints for maxima (though typically we want interior points)
  // The endpoints are included if they represent local maxima within (0,1)

  return roots.sort((a, b) => a - b);
}

/**
 * Bisection search to find a root of f(t) = 0 in [a, b].
 */
function bisectionSearch(
  a: number,
  b: number,
  f: (t: number) => number,
  tolerance: number
): number | null {
  let fa = f(a);
  let fb = f(b);

  if (fa * fb > 0) {
    return null; // No root in interval
  }

  while (b - a > tolerance) {
    const mid = (a + b) / 2;
    const fMid = f(mid);

    if (Math.abs(fMid) < tolerance) {
      return mid;
    }

    if (fa * fMid < 0) {
      b = mid;
      fb = fMid;
    } else {
      a = mid;
      fa = fMid;
    }
  }

  return (a + b) / 2;
}

/**
 * Checks if a critical point is a local maximum of curvature.
 * Uses second derivative test: κ''(t) < 0 indicates maximum.
 */
function isLocalMaximum(
  t: number,
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  h: number = 1e-6
): boolean {
  const kPrimePlus = curvatureDerivative(t + h, p0, p1, p2, p3);
  const kPrimeMinus = curvatureDerivative(t - h, p0, p1, p2, p3);
  const kDoublePrime = (kPrimePlus - kPrimeMinus) / (2 * h);

  return kDoublePrime < 0;
}

/**
 * Main function to find all t values where curvature is maximized.
 * 
 * @param p0 - First control point
 * @param p1 - Second control point
 * @param p2 - Third control point
 * @param p3 - Fourth control point
 * @returns Array of t values in [0, 1] where curvature has local maxima
 */
export function findMaxCurvaturePoints(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D
): number[] {
  return findCurvatureMaxima(p0, p1, p2, p3);
}

/**
 * Extended version that also returns curvature values at maxima.
 */
export function findMaxCurvaturePointsWithValues(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D
): { t: number; curvature: number }[] {
  const maxPoints = findCurvatureMaxima(p0, p1, p2, p3);

  return maxPoints.map((t) => ({
    t,
    curvature: curvature(t, p0, p1, p2, p3),
  }));
}

// ============== Test/Demo ==============

function runTests() {
  console.log("=== Cubic Bézier Maximum Curvature Finder ===\n");

  // Test case 1: S-curve
  const test1 = {
    p0: { x: 0, y: 0 },
    p1: { x: 0, y: 1 },
    p2: { x: 1, y: 0 },
    p3: { x: 1, y: 1 },
  };

  console.log("Test 1: S-curve");
  console.log("Control points:", test1);
  const results1 = findMaxCurvaturePointsWithValues(
    test1.p0,
    test1.p1,
    test1.p2,
    test1.p3
  );
  console.log("Maximum curvature points:");
  results1.forEach((r) => {
    console.log(`  t = ${r.t.toFixed(6)}, κ = ${r.curvature.toFixed(6)}`);
  });
  console.log();

  // Test case 2: Simple arc
  const test2 = {
    p0: { x: 0, y: 0 },
    p1: { x: 0.5, y: 1 },
    p2: { x: 1.5, y: 1 },
    p3: { x: 2, y: 0 },
  };

  console.log("Test 2: Arc-like curve");
  console.log("Control points:", test2);
  const results2 = findMaxCurvaturePointsWithValues(
    test2.p0,
    test2.p1,
    test2.p2,
    test2.p3
  );
  console.log("Maximum curvature points:");
  results2.forEach((r) => {
    console.log(`  t = ${r.t.toFixed(6)}, κ = ${r.curvature.toFixed(6)}`);
  });
  console.log();

  // Test case 3: Loop curve (high curvature)
  const test3 = {
    p0: { x: 0, y: 0 },
    p1: { x: 2, y: 2 },
    p2: { x: -1, y: 2 },
    p3: { x: 1, y: 0 },
  };

  console.log("Test 3: Loop curve");
  console.log("Control points:", test3);
  const results3 = findMaxCurvaturePointsWithValues(
    test3.p0,
    test3.p1,
    test3.p2,
    test3.p3
  );
  console.log("Maximum curvature points:");
  results3.forEach((r) => {
    console.log(`  t = ${r.t.toFixed(6)}, κ = ${r.curvature.toFixed(6)}`);
  });
  console.log();

  // Verification: Plot curvature along the curve
  console.log("Curvature profile for Test 1 (S-curve):");
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const k = curvature(t, test1.p0, test1.p1, test1.p2, test1.p3);
    const bar = "█".repeat(Math.round(k * 10));
    console.log(`  t=${t.toFixed(2)}: ${bar} (${k.toFixed(4)})`);
  }
}

// Run tests
runTests();

import { Quadtree, Circle } from '@timohausmann/quadtree-ts';
import { randomBates, randomExponential, randomLcg, randomUniform } from 'd3-random';
import { nearlyEqual } from '@/app/utils/precision';
import clamp from 'lodash/clamp';

const VERBOSE_DEBUG = false;

interface Sector {
  startAngle: number;
  endAngle: number;
  width: number;
}

interface PackingState {
  circles: Circle[];
  currentCircle: Circle;
  unoccupiedSectors: Sector[];
}

interface PackingArea {
  width: number;
  height: number;
  minRadius: number;
  maxRadius: number;
}

export type PackingStrategy = 'shift' | 'pop';
export type RandomStrategy = 'uniform' | 'exponential' | 'bates';

type RandomRadius = (min: number, max: number) => number;

export const RANDOM_RADIUS_FNS: Record<RandomStrategy, (source: () => number) => RandomRadius> = {
  uniform: source => {
    const sourced = randomUniform.source(source);

    return (min, max) => sourced(min, max)();
  },
  exponential: source => {
    const sourced = randomExponential.source(source);

    return (min, max) => {
      const expectedValue = min;
      // make expectedValue the median
      const lambda = Math.LN2 / expectedValue;

      return clamp(sourced(lambda)(), min, max);
    }
  },
  bates: source => {
    const sourced = randomBates.source(source);

    return (min, max) => {
      const diff = max - min;

      return min + sourced(3)() * diff;
    }
  },
}

const TAU = 2 * Math.PI;

export class CirclePacker {
  private area: PackingArea;
  private quadtree: Quadtree<Circle>;
  private placedCircles: Circle[] = [];
  private stack: Circle[] = [];
  private onAddCircle?: (state: Partial<PackingState>) => Promise<void>;
  private randomRadius: RandomRadius;
  private strategy: PackingStrategy;

  constructor(
    area: PackingArea,
    packingStrategy?: PackingStrategy,
    randomStrategy?: RandomStrategy,
    onAddCircle?: (state: Partial<PackingState>) => Promise<void>,
    seed?: number
  ) {
    this.area = area;
    this.onAddCircle = onAddCircle;
    this.quadtree = new Quadtree<Circle>({
      width: area.width,
      height: area.height,
      maxObjects: 10,
      maxLevels: 4
    });
    this.validateConstraints();
    // FIXME: I think it will actually cause problems if these aren't truly constrained
    this.randomRadius = RANDOM_RADIUS_FNS[randomStrategy ?? 'uniform'](randomLcg(seed));
    this.strategy = packingStrategy ?? 'pop';
  }

  private validateConstraints(): void {
    const { width, height, minRadius, maxRadius } = this.area;
    if (width <= maxRadius || height <= maxRadius) {
      throw new Error('Area dimensions must be greater than maxRadius');
    }
    if (maxRadius < minRadius * 2) {
      throw new Error('maxRadius must be at least minRadius * 2');
    }
  }

  async pack(): Promise<Circle[]> {
    // Create initial circle in center
    const centerX = this.area.width / 2;
    const centerY = this.area.height / 2;
    const initialRadius = this.randomRadius(this.area.minRadius, this.area.maxRadius);
    const initialCircle = new Circle({ x: centerX, y: centerY, r: initialRadius });

    this.placedCircles.push(initialCircle);
    this.quadtree.insert(initialCircle);
    this.stack.push(initialCircle);

    if (this.onAddCircle) {
      await this.onAddCircle({ circles: this.placedCircles });
    }

    const MAX_ITERS = 500;
    let iter = 0;

    while (this.stack.length > 0 && iter < MAX_ITERS) {
      // FIXME: optimize this...
      const current = this.strategy === 'pop' ? this.stack.pop()! : this.stack.shift()!;
      if (this.onAddCircle) {
        await this.onAddCircle({ currentCircle: current });
      }
      const nearby = this.findNearbyCircles(current);
      const unoccupiedSectors = await this.calculateUnoccupiedSectors(current, nearby);

      for (const sector of unoccupiedSectors) {
        let updatedSector = sector;
        let availableRadius = this.thetaToRadius(current.r, updatedSector.width);
        let effectiveMaxRadius = this.calculateEffectiveMaxRadius(current, availableRadius);

        while (effectiveMaxRadius >= this.area.minRadius) {
          const newRadius = this.selectRadius(effectiveMaxRadius, current.r, updatedSector.width);
          const newCircle = this.placeCircleTangent(current, updatedSector, newRadius);

          this.placedCircles.push(newCircle);
          this.quadtree.insert(newCircle);
          this.stack.push(newCircle);

          if (this.onAddCircle) {
            await this.onAddCircle({ circles: this.placedCircles });
          }

          // account for new circle in sector and update effectiveMaxRadius
          const newlyOccupiedSector = this.getSectorForCircle(current, newCircle);

          // need clamp to avoid floating point errors where newStartAngle becomes slightly
          // larger than endAngle, wrapping the range to width ~= TAU and creating a new
          // "layer" for circles to be added on
          const newStartAngle = this.clampToCounterclockwiseRange(
            updatedSector.startAngle + newlyOccupiedSector.width,
            updatedSector.startAngle,
            updatedSector.endAngle
          );

          updatedSector = {
            startAngle: newStartAngle,
            endAngle: updatedSector.endAngle,
            width: this.getCounterclockwiseArcWidth(newStartAngle, updatedSector.endAngle),
          };

          if (updatedSector.width < 0 && !nearlyEqual(updatedSector.width, 0)) debugger;

          availableRadius = this.thetaToRadius(current.r, updatedSector.width);
          effectiveMaxRadius = this.calculateEffectiveMaxRadius(current, availableRadius);

          if (VERBOSE_DEBUG) debugger;
        }
      }

      iter += 1;
    }

    return this.placedCircles;
  }

  private findNearbyCircles(circle: Circle): Circle[] {
    const searchRadius = circle.r + this.area.maxRadius;
    const searchArea = new Circle({
      x: circle.x,
      y: circle.y,
      r: searchRadius
    });

    return this.quadtree.retrieve(searchArea).filter((c: Circle) => c !== circle);
  }

  private normalizeAngleRadians(angle: number) {
    // Preserve both angle === 0 and angle === TAU
    if (nearlyEqual(angle, TAU)) return TAU;
    else return (angle % TAU + TAU) % TAU;
  }

  private clampToCounterclockwiseRange(angle: number, min: number, max: number) {
    // TODO: everything should already be normalized going in
    const normMin = this.normalizeAngleRadians(min);
    const normMax = this.normalizeAngleRadians(max);
    const normAngle = this.normalizeAngleRadians(angle);

    if (normMin > normMax) {
      // wraparound case, valid if greater than min or less than max
      if (normAngle > min) {
        return normAngle;
      } else if (normAngle < max) {
        return normAngle;
      } else {
        return max;
      }
    } else {
      if (normAngle > min) {
        if (normAngle < max) {
          return normAngle;
        } else {
          return max;
        }
      } else {
        return min;
      }
    }
  }

  private getSectorForCircle(current: Circle, nearbyCircle: Circle) {
    const dx = nearbyCircle.x - current.x;
    const dy = nearbyCircle.y - current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const centerAngle = Math.atan2(dy, dx);
    const angularWidth = 2 * Math.asin(nearbyCircle.r / distance);

    const startAngle = this.normalizeAngleRadians(centerAngle - angularWidth / 2);
    const endAngle = this.normalizeAngleRadians(centerAngle + angularWidth / 2);

    return {
      startAngle,
      endAngle,
      width: this.getCounterclockwiseArcWidth(startAngle, endAngle),
    };
  }

  private async calculateUnoccupiedSectors(current: Circle, nearby: Circle[]): Promise<Sector[]> {
    const occupiedSectors: Sector[] = [];

    for (const nearbyCircle of nearby) {
      occupiedSectors.push(this.getSectorForCircle(current, nearbyCircle));
    }

    return this.findUnoccupiedSectors(occupiedSectors);
  }

  // accounts for overlap
  private getCounterclockwiseArcWidth = (start: number, end: number) => {
    return start <= end ? end - start : TAU - start + end;
  }

  private async findUnoccupiedSectors(occupiedSectors: Sector[]): Promise<Sector[]> {
    if (occupiedSectors.length === 0) {
      return [{
        startAngle: 0,
        endAngle: TAU,
        width: TAU
      }];
    }

    // Step 1: Join overlapping occupied sectors
    const joinedOccupied = this.joinSectors(occupiedSectors);

    const createSector = (startAngle: number, endAngle: number): Sector => {
      const width = this.getCounterclockwiseArcWidth(startAngle, endAngle);

      return { startAngle, endAngle, width };
    }

    // joinedOccupied is sorted by startAngle, so we can just join ends to starts
    const unoccupied: Sector[] = [];
    if (joinedOccupied[0].width !== TAU) {
      for (let i = 0; i < joinedOccupied.length - 1; i++) {
        const currSector = joinedOccupied[i];
        const nextSector = joinedOccupied[i + 1];

        unoccupied.push(createSector(
          currSector.endAngle,
          nextSector.startAngle,
        ))
      }

      unoccupied.push(createSector(
        joinedOccupied.at(-1)!.endAngle,
        joinedOccupied.at(0)!.startAngle,
      ))
    }

    if (this.onAddCircle) {
      await this.onAddCircle({
        unoccupiedSectors: unoccupied
      });
    }

    const totalJoinedArcSpace = joinedOccupied.reduce((total, { width }) => total + width, 0);
    const totalUnoccupiedArcSpace = unoccupied.reduce((total, { width }) => total + width, 0);

    if (!nearlyEqual(totalJoinedArcSpace + totalUnoccupiedArcSpace, TAU)) debugger;
    if (VERBOSE_DEBUG) debugger;

    return unoccupied;
  }

  // below two methods based on right triangle formed by the vector from c1 center
  // to c2 center, the arc boundary ray from c1 center tangent to c2, and the vector
  // from the tangent point to c2 center
  // where c1 is some circle, and c2 is the incircle of an arc of a given width theta
  // from the perspective of c2 center
  private thetaToRadius(perspectiveRadius: number, theta: number): number {
    return theta > Math.PI
      ? Infinity
      : (perspectiveRadius * Math.sin(theta / 2)) / (1 - Math.sin(theta / 2));
  }

  private radiiToTheta(perspectiveRadius: number, queryRadius: number): number {
    return 2 * Math.asin(queryRadius / (perspectiveRadius + queryRadius));
  }

  private calculateEffectiveMaxRadius(current: Circle, availableRadius: number): number {
    return Math.min(
      this.area.maxRadius,
      availableRadius,
      this.getDistanceToEdge(current) / 2,
    );
  }

  // Get distance from the current circle's edge to the area edge
  private getDistanceToEdge(circle: Circle): number {
    const { x, y, r } = circle;

    const distanceToRight = (this.area.width - x - r);
    const distanceToLeft = (x - r);
    const distanceToTop = (this.area.height - y - r);
    const distanceToBottom = (y - r);

    return Math.min(distanceToTop, distanceToRight, distanceToBottom, distanceToLeft);
  }

  private selectRadius(effectiveMaxRadius: number, perspectiveRadius: number, availableArcWidth: number): number {
    const { minRadius } = this.area;

    const effectiveMaxArcWidth = this.radiiToTheta(perspectiveRadius, effectiveMaxRadius);
    const minArcWidth = this.radiiToTheta(perspectiveRadius, minRadius);

    if (availableArcWidth >= effectiveMaxArcWidth + minArcWidth) {
      // can fit at least two circles regardless of random choice
      // still use effectiveMax instead of max to account for distance to edge
      return this.randomRadius(minRadius, effectiveMaxRadius);
    } else if (availableArcWidth < effectiveMaxArcWidth || nearlyEqual(availableArcWidth, effectiveMaxArcWidth)) {
      // if it's possible to fill the space with one circle, do it
      return effectiveMaxRadius;
    } else if (availableArcWidth >= 2 * minArcWidth) {
      // can fit up to two circles, limit random choice to ensure that two fit
      // i.e. eliminate the possibility of an unfillable remainder
      const limitedRadius = this.thetaToRadius(perspectiveRadius, availableArcWidth - minArcWidth);

      return this.randomRadius(minRadius, limitedRadius);
    } else {
      // we're fucked
      if (VERBOSE_DEBUG) debugger;
      return effectiveMaxRadius;
    }
  }

  private placeCircleTangent(current: Circle, sector: Sector, radius: number): Circle {
    const newCircleCenter = this.radiiToTheta(current.r, radius) / 2;

    // place tangent to both current and the ray defining the near edge of the arc
    const angle = sector.startAngle + newCircleCenter;
    const distance = current.r + radius;

    const newX = current.x + distance * Math.cos(angle);
    const newY = current.y + distance * Math.sin(angle);

    return new Circle({ x: newX, y: newY, r: radius });
  }

  private joinSectors(sectors: Sector[]): Sector[] {
    // Step 1: Normalize & Validate
    const validSectors = sectors
      .map(sector => ({
        startAngle: this.normalizeAngleRadians(sector.startAngle),
        endAngle: this.normalizeAngleRadians(sector.endAngle),
        width: sector.width
      }))
      .filter(sector => sector.width > 0);

    if (validSectors.length === 0) {
      return [];
    }

    // Step 2: Split wrap-around sectors
    const splitSectors: Sector[] = [];
    for (const sector of validSectors) {
      if (sector.endAngle < sector.startAngle) {
        // Wrap-around sector: split into two
        splitSectors.push({
          startAngle: sector.startAngle,
          endAngle: TAU,
          width: TAU - sector.startAngle
        });
        splitSectors.push({
          startAngle: 0,
          endAngle: sector.endAngle,
          width: sector.endAngle
        });
      } else {
        splitSectors.push(sector);
      }
    }

    // Step 3: Sort by startAngle
    splitSectors.sort((a, b) => a.startAngle - b.startAngle);

    // Step 4: Merge overlapping/touching sectors
    const merged: Sector[] = [];
    for (const sector of splitSectors) {
      if (merged.length === 0) {
        merged.push(sector);
      } else {
        const last = merged[merged.length - 1];

        // Check if sectors overlap or touch
        if (sector.startAngle <= last.endAngle) {
          // Merge: extend the last sector's end to cover this sector
          last.endAngle = Math.max(last.endAngle, sector.endAngle);
          last.width = last.endAngle - last.startAngle;
        } else {
          // No overlap: add as separate sector
          merged.push(sector);
        }
      }
    }

    // Step 5: Handle circular boundary reconnection
    if (merged.length > 1) {
      const first = merged[0];
      const last = merged[merged.length - 1];

      // Check if first starts at 0 and last ends at TAU
      if (first.startAngle === 0 && last.endAngle === TAU) {
        // They connect across the boundary - merge them into a wrap-around sector
        const reconnected: Sector = {
          startAngle: last.startAngle,
          endAngle: first.endAngle,
          width: first.width + last.width
        };

        // Return merged sectors excluding first and last, plus the reconnected one
        return [...merged.slice(1, -1), reconnected];
      }
    }

    return merged;
  }
}

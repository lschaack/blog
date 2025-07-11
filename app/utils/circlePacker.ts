import { Quadtree, Circle } from '@timohausmann/quadtree-ts';

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

const TAU = 2 * Math.PI;

export class CirclePacker {
  private area: PackingArea;
  private quadtree: Quadtree<Circle>;
  private placedCircles: Circle[] = [];
  private stack: Circle[] = [];
  private onAddCircle?: (state: Partial<PackingState>) => Promise<void>;

  constructor(area: PackingArea, onAddCircle?: (state: Partial<PackingState>) => Promise<void>) {
    this.area = area;
    this.onAddCircle = onAddCircle;
    this.quadtree = new Quadtree<Circle>({
      width: area.width,
      height: area.height,
      maxObjects: 10,
      maxLevels: 4
    });
    this.validateConstraints();
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
      const current = this.stack.shift()!;
      if (this.onAddCircle) {
        await this.onAddCircle({ currentCircle: current });
      }
      const nearby = this.findNearbyCircles(current);
      const unoccupiedSectors = await this.calculateUnoccupiedSectors(current, nearby);

      for (const sector of unoccupiedSectors) {
        let updatedSector = sector;
        let availableRadius = this.calculateAvailableRadius(current, updatedSector);
        let effectiveMaxRadius = this.calculateEffectiveMaxRadius(current, availableRadius);

        while (effectiveMaxRadius >= this.area.minRadius) {
          const newRadius = this.selectRadius(effectiveMaxRadius, availableRadius);
          const newCircle = this.placeCircleTangent(current, updatedSector, newRadius);

          this.placedCircles.push(newCircle);
          this.quadtree.insert(newCircle);
          this.stack.push(newCircle);

          if (this.onAddCircle) {
            await this.onAddCircle({ circles: this.placedCircles });
          }

          // account for new circle in sector and update effectiveMaxRadius
          const newlyOccupiedSector = this.getSectorForCircle(current, newCircle);

          // FIXME: It's common for positive-x-facing sectors to have start angles greater
          // than their end angle (b/c/o crossing the boundary), so Math.min() fundamentally
          // breaks these sectors and is not a valid floating point error fix
          const newStartAngle = this.clampToCounterclockwiseRange(
            updatedSector.startAngle + newlyOccupiedSector.width,
            updatedSector.startAngle,
            updatedSector.endAngle
          );

          // FIXME: new layers are started when a sector is perfectly filled, but floating
          // point rounding puts the start barely past the edge, which is then interpreted
          // as a near-TAU-width arc rather than a 0-width arc

          updatedSector = {
            startAngle: newStartAngle,
            endAngle: updatedSector.endAngle,
            width: this.getCounterclockwiseArcWidth(newStartAngle, updatedSector.endAngle),
          };

          if (updatedSector.width < 0 && Math.abs(updatedSector.width - 0) > 0.00000001) debugger;

          availableRadius = this.calculateAvailableRadius(current, updatedSector);
          effectiveMaxRadius = this.calculateEffectiveMaxRadius(current, availableRadius);
          debugger;
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
    return (angle % TAU + TAU) % TAU;
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
    // TODO: this can probably just be the loop w/o the first conditional b/c/o the way `at` works
    // after the final iteration, but the TAU check would need to be here in any case
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

    if (totalJoinedArcSpace + totalUnoccupiedArcSpace !== TAU) debugger;

    debugger;

    return unoccupied;
  }

  private calculateAvailableRadius(current: Circle, sector: Sector): number {
    const theta = sector.width;

    return sector.width > Math.PI
      ? Infinity
      : (current.r * Math.sin(theta / 2)) / (1 - Math.sin(theta / 2));
  }

  private calculateEffectiveMaxRadius(current: Circle, availableRadius: number): number {
    const distance = this.getDistanceToEdge(current) / 2;

    const effectiveMaxRadius = Math.min(
      this.area.maxRadius,
      availableRadius,
      distance,
    );

    if (effectiveMaxRadius === this.area.maxRadius) console.log('Effective max radius default')
    else if (effectiveMaxRadius === availableRadius) console.log('Effective max radius based on available space')
    if (effectiveMaxRadius === distance) console.log('Effective max radius based on distance to edge')

    return effectiveMaxRadius;
  }

  // Get distance from the current circle's edge to the area edge
  private getDistanceToEdge(circle: Circle): number {
    const { x, y, r } = circle;
    const circleEdgeX = x - r;
    const circleEdgeY = y - r;

    const distanceToRight = (this.area.width - circleEdgeX);
    const distanceToLeft = (circleEdgeX);
    const distanceToTop = (this.area.height - circleEdgeY);
    const distanceToBottom = (circleEdgeY);

    return Math.min(distanceToTop, distanceToRight, distanceToBottom, distanceToLeft);
  }

  // FIXME: This isn't always taking up all the space, check out the second condition
  private selectRadius(effectiveMaxRadius: number, availableRadius: number): number {
    const { minRadius } = this.area;

    if (availableRadius >= effectiveMaxRadius + minRadius) {
      // can fit at least two circles regardless of random choice
      // still use effectiveMax instead of max to account for distance to edge
      return this.randomRadius(minRadius, effectiveMaxRadius);
    } else if (availableRadius < effectiveMaxRadius) {
      // if it's possible to fill the space with one circle, do it
      return effectiveMaxRadius;
    } else {
      // can fit up to two circles, limit random choice to ensure that two fit
      // i.e. eliminate the possibility of an unfillable remainder
      return this.randomRadius(
        minRadius,
        Math.min(effectiveMaxRadius, availableRadius - minRadius),
      );
    }
  }

  private placeCircleTangent(current: Circle, sector: Sector, radius: number): Circle {
    // from sin(theta / 2) = r / (R + r) where R = c1 radius and r = c2 radius, we know that
    // theta = 2 * asin(r / (R + r)), but we need half theta so can avoid undoing the 2 *
    const newCircleCenter = Math.asin(radius / (current.r + radius));

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

  private randomRadius(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}

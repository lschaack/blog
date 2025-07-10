import { Quadtree, Circle } from '@timohausmann/quadtree-ts';

interface Sector {
  startAngle: number;
  endAngle: number;
  width: number;
}

interface PackingState {
  circles: Circle[];
  currentCircle?: Circle;
  unoccupiedSectors?: Sector[];
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
  private onAddCircle?: (state: PackingState) => Promise<void>;

  constructor(area: PackingArea, onAddCircle?: (state: PackingState) => Promise<void>) {
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

    const MAX_ITERS = 50;
    let iter = 0;

    while (this.stack.length > 0 && iter < MAX_ITERS) {
      // FIXME: optimize this...
      const current = this.stack.shift()!;
      const nearby = this.findNearbyCircles(current);
      const unoccupiedSectors = this.calculateUnoccupiedSectors(current, nearby);

      // Show current circle and its sectors
      if (this.onAddCircle) {
        await this.onAddCircle({
          circles: this.placedCircles,
          currentCircle: current,
          unoccupiedSectors
        });
      }

      for (const sector of unoccupiedSectors) {
        let updatedSector = sector;
        let availableRadius = this.calculateAvailableRadius(current, updatedSector);
        let effectiveMaxRadius = this.calculateEffectiveMaxRadius(current, updatedSector, availableRadius);

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

          let newStartAngle = updatedSector.startAngle + newlyOccupiedSector.width;

          if (newStartAngle > updatedSector.endAngle) {
            // check if these are approximately equal to avoid issues w/floating point rounding
            if (Math.abs(newStartAngle - updatedSector.endAngle) > 0.0000001) {
              debugger;
              throw new Error('Newly placed circle covers more than the available sector');
            } else {
              // if the issue is floating point rounding, just hack them into equality
              newStartAngle = updatedSector.endAngle;
            }
          }

          updatedSector = {
            startAngle: newStartAngle,
            endAngle: updatedSector.endAngle,
            width: updatedSector.endAngle - newStartAngle,
          };

          availableRadius = this.calculateAvailableRadius(current, updatedSector);
          effectiveMaxRadius = this.calculateEffectiveMaxRadius(current, updatedSector, availableRadius);
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

  private getSectorForCircle(current: Circle, nearbyCircle: Circle) {
    const dx = nearbyCircle.x - current.x;
    const dy = nearbyCircle.y - current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const centerAngle = Math.atan2(dy, dx);
    const angularWidth = 2 * Math.asin(nearbyCircle.r / distance);

    return {
      startAngle: centerAngle - angularWidth / 2,
      endAngle: centerAngle + angularWidth / 2,
      width: angularWidth
    };
  }

  private calculateUnoccupiedSectors(current: Circle, nearby: Circle[]): Sector[] {
    const occupiedSectors: Sector[] = [];

    for (const nearbyCircle of nearby) {
      occupiedSectors.push(this.getSectorForCircle(current, nearbyCircle));
    }

    return this.findUnoccupiedSectors(occupiedSectors);
  }

  private findUnoccupiedSectors(occupiedSectors: Sector[]): Sector[] {
    if (occupiedSectors.length === 0) {
      return [{
        startAngle: 0,
        endAngle: 2 * Math.PI,
        width: 2 * Math.PI
      }];
    }

    type SectorPoint = {
      angle: number,
      type: number,
    }

    const sectorPoints = occupiedSectors
      .flatMap<SectorPoint>(({ startAngle, endAngle }) => [
        {
          angle: startAngle,
          type: 1,
        },
        {
          angle: endAngle,
          type: -1,
        }
      ])
      .sort((a, b) => a.angle - b.angle);

    if (sectorPoints[0].type !== 1 || sectorPoints.at(-1)!.type !== -1) {
      debugger;
    }

    const joinedOccupiedSectors: Sector[] = [];
    let depth = 0;
    let isJoining = false;
    for (const { angle, type } of sectorPoints) {
      depth += type;
      console.log('depth', depth)

      if (depth === 1 && !isJoining) {
        joinedOccupiedSectors.push({
          startAngle: angle,
          endAngle: NaN,
          width: NaN,
        });

        isJoining = true;
      } else if (depth === 0) {
        const lastSector = joinedOccupiedSectors.at(-1)!;
        lastSector.endAngle = angle;
        lastSector.width = lastSector.endAngle - lastSector.startAngle;

        isJoining = false;
      }
    }

    if (isNaN(joinedOccupiedSectors.at(-1)!.endAngle)) {
      throw new Error('Unmatched types in SectorPoints');
    }

    const unoccupied: Sector[] = [];
    let currentAngle = 0;

    for (const sector of joinedOccupiedSectors) {
      if (currentAngle < sector.startAngle) {
        unoccupied.push({
          startAngle: currentAngle,
          endAngle: sector.startAngle,
          width: sector.startAngle - currentAngle
        });
      }
      currentAngle = Math.max(currentAngle, sector.endAngle);
    }

    // Check wrap-around
    if (currentAngle < 2 * Math.PI) {
      unoccupied.push({
        startAngle: currentAngle,
        endAngle: 2 * Math.PI,
        width: 2 * Math.PI - currentAngle
      });
    }

    debugger;

    return unoccupied;
  }

  private calculateAvailableRadius(current: Circle, sector: Sector): number {
    const theta = sector.width;

    return sector.width > Math.PI
      ? Infinity
      : (current.r * Math.sin(theta / 2)) / (1 - Math.sin(theta / 2));
  }

  private calculateEffectiveMaxRadius(current: Circle, sector: Sector, availableRadius: number): number {
    // Calculate distance to nearest edge
    const midAngle = (sector.startAngle + sector.endAngle) / 2;
    const distanceToEdge = this.getDistanceToEdge(current, midAngle);

    return Math.min(
      this.area.maxRadius,
      availableRadius,
      distanceToEdge / 2
    );
  }

  private getDistanceToEdge(circle: Circle, angle: number): number {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    // Calculate distance to each edge
    const distanceToRight = (this.area.width - circle.x) / dx;
    const distanceToLeft = -circle.x / dx;
    const distanceToTop = (this.area.height - circle.y) / dy;
    const distanceToBottom = -circle.y / dy;

    // Return minimum positive distance
    const distances = [distanceToRight, distanceToLeft, distanceToTop, distanceToBottom]
      .filter(d => d > 0);

    return Math.min(...distances);
  }

  // FIXME: This isn't always taking up all the space, check out the second condition
  private selectRadius(effectiveMaxRadius: number, availableRadius: number): number {
    const { minRadius } = this.area;

    if (availableRadius >= effectiveMaxRadius + minRadius) {
      // can fit at least two circles regardless of random choice
      // still use effectiveMax instead of max to account for distance to edge
      return this.randomRadius(minRadius, effectiveMaxRadius);
    } else if (effectiveMaxRadius > 2 * minRadius) {
      // can fit up to two circles, limit random choice to ensure that two fit
      // i.e. eliminate the possibility of an unfillable remainder
      return this.randomRadius(
        minRadius,
        Math.min(effectiveMaxRadius, availableRadius - minRadius),
      );
    } else {
      // Can only fit one circle, take up all available space
      return effectiveMaxRadius;
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

  private randomRadius(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}

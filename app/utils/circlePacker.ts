import { Quadtree, Circle } from '@timohausmann/quadtree-ts';

interface Sector {
  startAngle: number;
  endAngle: number;
  width: number;
}

interface PackingArea {
  width: number;
  height: number;
  minRadius: number;
  maxRadius: number;
}

export class CirclePacker {
  private area: PackingArea;
  private quadtree: Quadtree<Circle>;
  private placedCircles: Circle[] = [];
  private stack: Circle[] = [];

  constructor(area: PackingArea) {
    this.area = area;
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

  pack(): Circle[] {
    // Create initial circle in center
    const centerX = this.area.width / 2;
    const centerY = this.area.height / 2;
    const initialRadius = this.randomRadius(this.area.minRadius, this.area.maxRadius);
    const initialCircle = new Circle({ x: centerX, y: centerY, r: initialRadius });

    this.placedCircles.push(initialCircle);
    this.quadtree.insert(initialCircle);
    this.stack.push(initialCircle);

    while (this.stack.length > 0) {
      const current = this.stack.pop()!;
      const nearby = this.findNearbyCircles(current);
      const unoccupiedSectors = this.calculateUnoccupiedSectors(current, nearby);

      for (const sector of unoccupiedSectors) {
        const effectiveMaxRadius = this.calculateEffectiveMaxRadius(current, sector);

        if (effectiveMaxRadius < this.area.minRadius) {
          continue;
        }

        const newRadius = this.selectRadius(effectiveMaxRadius);
        const newCircle = this.placeCircleTangent(current, sector, newRadius);

        this.placedCircles.push(newCircle);
        this.quadtree.insert(newCircle);
        this.stack.push(newCircle);
      }
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

  private calculateUnoccupiedSectors(current: Circle, nearby: Circle[]): Sector[] {
    const occupiedSectors: Sector[] = [];

    for (const nearbyCircle of nearby) {
      const dx = nearbyCircle.x - current.x;
      const dy = nearbyCircle.y - current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < current.r + nearbyCircle.r + this.area.maxRadius) {
        const centerAngle = Math.atan2(dy, dx);
        const angularWidth = 2 * Math.asin(nearbyCircle.r / distance);

        occupiedSectors.push({
          startAngle: centerAngle - angularWidth / 2,
          endAngle: centerAngle + angularWidth / 2,
          width: angularWidth
        });
      }
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

    // Sort sectors by start angle
    occupiedSectors.sort((a, b) => a.startAngle - b.startAngle);

    const unoccupied: Sector[] = [];
    let currentAngle = 0;

    for (const sector of occupiedSectors) {
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

    return unoccupied;
  }

  private calculateEffectiveMaxRadius(current: Circle, sector: Sector): number {
    const theta = sector.width;
    const maxAvailableRadius = sector.width > Math.PI
      ? Infinity
      : (current.r * Math.sin(theta / 2)) / (1 - Math.sin(theta / 2));

    // Calculate distance to nearest edge
    const midAngle = (sector.startAngle + sector.endAngle) / 2;
    const distanceToEdge = this.getDistanceToEdge(current, midAngle);

    return Math.min(
      this.area.maxRadius,
      maxAvailableRadius,
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

  private selectRadius(effectiveMaxRadius: number): number {
    const { minRadius, maxRadius } = this.area;

    if (effectiveMaxRadius >= maxRadius + minRadius) {
      return this.randomRadius(minRadius, effectiveMaxRadius);
    } else if (effectiveMaxRadius >= minRadius && effectiveMaxRadius <= maxRadius + minRadius) {
      return this.randomRadius(minRadius, maxRadius - minRadius);
    } else {
      return effectiveMaxRadius;
    }
  }

  private placeCircleTangent(current: Circle, sector: Sector, radius: number): Circle {
    // Place at the start of the sector (near edge)
    const angle = sector.startAngle;
    const distance = current.r + radius;

    const newX = current.x + distance * Math.cos(angle);
    const newY = current.y + distance * Math.sin(angle);

    return new Circle({ x: newX, y: newY, r: radius });
  }

  private randomRadius(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}

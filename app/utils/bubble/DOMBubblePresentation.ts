import { BubblePresentation, BubblePresentationOptions } from "@/app/utils/bubble/BubblePresentation";

export class DOMBubblePresentation extends BubblePresentation {
  // Cached style calculations (computed lazily)
  private cachedOuterTransform: string | null = null;
  private cachedInnerTransform: string | null = null;
  private cachedInnerClipPath: string | null = null;
  private stylesCacheDirty: boolean = true;

  constructor(options: BubblePresentationOptions = {}) {
    super(options);
  }

  getOuterTransform(): string {
    if (this.stylesCacheDirty || this.cachedOuterTransform === null) {
      this.calculateOuterTransform();
    }
    return this.cachedOuterTransform!;
  }

  getInnerTransform(offsetX: number, offsetY: number): string {
    if (this.stylesCacheDirty || this.cachedInnerTransform === null) {
      this.calculateInnerStyles(offsetX, offsetY);
    }
    return this.cachedInnerTransform!;
  }

  getInnerClipPath(offsetX: number, offsetY: number): string {
    if (this.stylesCacheDirty || this.cachedInnerClipPath === null) {
      this.calculateInnerStyles(offsetX, offsetY);
    }
    return this.cachedInnerClipPath!;
  }

  protected invalidateStylesCache(): void {
    this.stylesCacheDirty = true;
  }

  private calculateOuterTransform(): void {
    const transform = this.getTransform();

    this.cachedOuterTransform = `matrix(${transform[0]},0,0,${transform[3]},${transform[4]},${transform[5]})`;
  }

  private calculateInnerStyles(offsetX: number, offsetY: number): void {
    const meta = this.getMeta();

    // Calculate scales first
    const scaleX = meta.width / this.getWidth();
    const scaleY = meta.height / this.getHeight();

    // Avoid shifting the text content too much since it still needs to be readable
    const contentOffsetX = offsetX * 0.5;
    const contentOffsetY = offsetY * 0.5;

    // Calculate transform
    this.cachedInnerTransform = `translate(${contentOffsetX}px,${contentOffsetY}px)`;

    // Calculate clip path
    const distortionX = scaleX - 1;
    const distortionY = scaleY - 1;
    const scaleAvg = (scaleX + scaleY) * 0.5;

    // Content needs to flow normally, but be clipped by the bubble which is necessarily a sibling
    const clipX = meta.left - contentOffsetX + this.getBoundary() * distortionX;
    const clipY = meta.top - contentOffsetY + this.getBoundary() * distortionY;

    const doubleBoundary = 2 * this.getBoundary();
    const clipWidth = Math.max(meta.width - doubleBoundary * scaleX, 0);
    const clipHeight = Math.max(meta.height - doubleBoundary * scaleY, 0);

    const clipRounding = Math.max(this.getRounding() - this.getBoundary(), 0) * scaleAvg;

    this.cachedInnerClipPath = `xywh(${clipX}px ${clipY}px ${clipWidth}px ${clipHeight}px round ${clipRounding}px)`;

    // Mark cache as clean after calculating inner styles
    this.stylesCacheDirty = false;
  }

  // Override updateMeta to invalidate cache
  updateMeta(offset: [number, number]): void {
    super.updateMeta(offset);
    this.invalidateStylesCache();
  }

  // Override updateConfiguration to invalidate cache
  updateConfiguration(options: BubblePresentationOptions): void {
    super.updateConfiguration(options);
    this.invalidateStylesCache();
  }

}

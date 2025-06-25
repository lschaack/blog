"use client";

import { Point } from "@/app/utils/findVectorSegmentsInShape";

type MouseSubscriber = {
  id: string;
  callback: (current: Point, previous: Point) => void;
};

class MouseTrackingService {
  private subscribers = new Map<string, MouseSubscriber>();
  private currentPos: Point = { x: 0, y: 0 };
  private previousPos: Point = { x: 0, y: 0 };
  private isListening = false;

  private handleMouseMove = (event: MouseEvent) => {
    const { pageX, pageY, movementX, movementY } = event;

    this.previousPos.x = pageX - movementX;
    this.previousPos.y = pageY - movementY;
    this.currentPos.x = pageX;
    this.currentPos.y = pageY;

    for (const subscriber of this.subscribers.values()) {
      subscriber.callback(this.currentPos, this.previousPos);
    }
  };

  subscribe(id: string, callback: (current: Point, previous: Point) => void) {
    this.subscribers.set(id, { id, callback });

    if (!this.isListening) {
      document.addEventListener('mousemove', this.handleMouseMove, { passive: true });
      this.isListening = true;
    }

    return () => this.unsubscribe(id);
  }

  unsubscribe(id: string) {
    this.subscribers.delete(id);

    if (this.subscribers.size === 0 && this.isListening) {
      document.removeEventListener('mousemove', this.handleMouseMove);
      this.isListening = false;
    }
  }

  getCurrentPosition(): Point {
    return this.currentPos;
  }

  getPreviousPosition(): Point {
    return this.previousPos;
  }
}

export const mouseService = new MouseTrackingService();

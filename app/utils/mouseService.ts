"use client";

type MouseSubscriber = {
  id: string;
  callback: (currentX: number, currentY: number, previousX: number, previousY: number) => void;
};

class MouseTrackingService {
  private subscribers = new Map<string, MouseSubscriber>();
  private currentX = 0;
  private currentY = 0;
  private previousX = 0;
  private previousY = 0;
  private isListening = false;

  private handleMouseMove = (event: MouseEvent) => {
    const { pageX, pageY, movementX, movementY } = event;

    this.previousX = pageX - movementX;
    this.previousY = pageY - movementY;
    this.currentX = pageX;
    this.currentY = pageY;

    for (const subscriber of this.subscribers.values()) {
      subscriber.callback(this.currentX, this.currentY, this.previousX, this.previousY);
    }
  };

  subscribe(id: string, callback: (currentX: number, currentY: number, previousX: number, previousY: number) => void) {
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

  getCurrentPosition(): [number, number] {
    return [this.currentX, this.currentY];
  }

  getPreviousPosition(): [number, number] {
    return [this.previousX, this.previousY];
  }
}

export const mouseService = new MouseTrackingService();

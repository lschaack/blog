"use client";

type ResizeSubscriber = {
  id: string;
  callback: (entry: ResizeObserverEntry) => void;
};

class ResizeService {
  private elementObservers = new Map<Element, ResizeObserver>();
  private elementSubscribers = new Map<Element, Map<string, ResizeSubscriber>>();
  private idCounter = 0;

  private createObserver(element: Element): ResizeObserver {
    const observer = new ResizeObserver((entries) => {
      const subscribers = this.elementSubscribers.get(element);
      if (subscribers) {
        const entry = entries[0];
        for (const subscriber of subscribers.values()) {
          subscriber.callback(entry);
        }
      }
    });

    observer.observe(element);
    return observer;
  }

  subscribe(element: Element, callback: (entry: ResizeObserverEntry) => void) {
    const id = `resize-${++this.idCounter}`;

    if (!this.elementSubscribers.has(element)) {
      this.elementSubscribers.set(element, new Map());
      const observer = this.createObserver(element);
      this.elementObservers.set(element, observer);
    }

    const subscribers = this.elementSubscribers.get(element)!;
    subscribers.set(id, { id, callback });

    return () => this.unsubscribe(element, id);
  }

  unsubscribe(element: Element, id: string) {
    const subscribers = this.elementSubscribers.get(element);
    if (!subscribers) return;

    subscribers.delete(id);

    if (subscribers.size === 0) {
      const observer = this.elementObservers.get(element);
      if (observer) {
        observer.unobserve(element);
        observer.disconnect();
        this.elementObservers.delete(element);
      }
      this.elementSubscribers.delete(element);
    }
  }
}

export const resizeService = new ResizeService();

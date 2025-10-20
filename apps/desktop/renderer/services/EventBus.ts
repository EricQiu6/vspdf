import type { AppEvent } from '@vspdf/types';

type EventListener = (event: AppEvent) => void;

/**
 * EventBus - Simple pub/sub for app-wide events
 * Decouples Viewers, Panels, and Workbench components
 */
export class EventBus {
  private listeners = new Map<string, Set<EventListener>>();

  subscribe(eventType: AppEvent['type'] | '*', listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  publish(event: AppEvent): void {
    // Notify specific type listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach((listener) => listener(event));
    }

    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((listener) => listener(event));
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

// Global singleton instance
export const eventBus = new EventBus();

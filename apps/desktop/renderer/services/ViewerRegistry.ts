import type { ViewerProps, ViewerHandle } from '@vspdf/types';
import type { ComponentType, RefObject } from 'react';

export type ViewerComponent = ComponentType<ViewerProps & { ref: RefObject<ViewerHandle> }>;

/**
 * ViewerRegistry - Maps viewer types to React components
 * Enables pluggable viewer architecture
 */
export class ViewerRegistry {
  private registry = new Map<string, ViewerComponent>();

  register(viewerType: string, component: ViewerComponent): void {
    this.registry.set(viewerType, component);
  }

  get(viewerType: string): ViewerComponent | undefined {
    return this.registry.get(viewerType);
  }

  has(viewerType: string): boolean {
    return this.registry.has(viewerType);
  }

  getAll(): string[] {
    return Array.from(this.registry.keys());
  }
}

// Global singleton instance
export const viewerRegistry = new ViewerRegistry();

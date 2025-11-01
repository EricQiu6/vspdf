/**
 * Context Key Service
 *
 * Manages hierarchical context values for conditional keybindings and commands.
 * Provides scoped contexts that inherit from parent contexts.
 */

import type {
  IContextKeyService,
  IScopedContextKeyService,
  IContextKey,
  Context,
  ContextKeyValue,
  ContextKeyMap,
  ContextChangeEvent,
} from './types.js';

/**
 * Main context key service implementation
 */
export class ContextKeyService implements IContextKeyService {
  private contexts = new Map<number, Context>();
  private nextId = 0;
  private rootContext: Context;
  private listeners = new Set<(event: ContextChangeEvent) => void>();

  constructor() {
    this.rootContext = {
      id: this.nextId++,
      parent: null,
      values: {},
    };
    this.contexts.set(this.rootContext.id, this.rootContext);
  }

  /**
   * Create a scoped context bound to a DOM element
   */
  createScoped(element: HTMLElement): IScopedContextKeyService {
    const parentContextId = this.getContextForElement(element.parentElement);
    const parentContext = parentContextId
      ? this.contexts.get(parentContextId)
      : this.rootContext;

    const context: Context = {
      id: this.nextId++,
      parent: parentContext || this.rootContext,
      values: {},
    };

    this.contexts.set(context.id, context);

    // Bind to DOM
    element.dataset.keybindingContext = context.id.toString();

    return new ScopedContextKeyService(this, context);
  }

  /**
   * Set a global context key value
   */
  setValue(key: string, value: ContextKeyValue): void {
    this.rootContext.values[key] = value;
    this.fireContextChange({ key, value });
  }

  /**
   * Get a context value (walks up hierarchy)
   */
  getValue(key: string, contextId?: number): ContextKeyValue {
    const context = contextId ? this.contexts.get(contextId) : this.rootContext;

    if (!context) return undefined;

    // Check current context
    if (key in context.values) {
      return context.values[key];
    }

    // Walk up parent chain
    if (context.parent) {
      return this.getValue(key, context.parent.id);
    }

    return undefined;
  }

  /**
   * Get all context values (flattened hierarchy)
   */
  getContext(contextId?: number): ContextKeyMap {
    const context = contextId ? this.contexts.get(contextId) : this.rootContext;

    if (!context) return {};

    // Build flattened map by walking up the hierarchy
    const result: ContextKeyMap = {};

    let current: Context | null = context;
    while (current) {
      // Add values from current context (don't overwrite - child takes precedence)
      for (const [key, value] of Object.entries(current.values)) {
        if (!(key in result)) {
          result[key] = value;
        }
      }
      current = current.parent;
    }

    return result;
  }

  /**
   * Get context ID for a DOM element
   */
  getContextForElement(element: HTMLElement | null): number | undefined {
    let current = element;

    while (current) {
      const contextId = current.dataset.keybindingContext;
      if (contextId !== undefined) {
        return parseInt(contextId, 10);
      }
      current = current.parentElement;
    }

    return undefined;
  }

  /**
   * Subscribe to context changes
   */
  onDidChangeContext(listener: (event: ContextChangeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Dispose the service and cleanup
   */
  dispose(): void {
    this.contexts.clear();
    this.listeners.clear();
  }

  /**
   * Fire context change event
   * @internal
   */
  fireContextChange(event: ContextChangeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /**
   * Set a value in a specific context
   * @internal
   */
  setValueInContext(contextId: number, key: string, value: ContextKeyValue): void {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }

    context.values[key] = value;
    this.fireContextChange({ key, value });
  }

  /**
   * Delete a context
   * @internal
   */
  deleteContext(contextId: number): void {
    this.contexts.delete(contextId);
  }
}

/**
 * Scoped context key service implementation
 */
class ScopedContextKeyService implements IScopedContextKeyService {
  constructor(
    private service: ContextKeyService,
    private context: Context
  ) {}

  get contextId(): number {
    return this.context.id;
  }

  createScoped(element: HTMLElement): IScopedContextKeyService {
    return this.service.createScoped(element);
  }

  setValue(key: string, value: ContextKeyValue): void {
    this.service.setValueInContext(this.context.id, key, value);
  }

  getValue(key: string): ContextKeyValue {
    return this.service.getValue(key, this.context.id);
  }

  getContext(): ContextKeyMap {
    return this.service.getContext(this.context.id);
  }

  getContextForElement(element: HTMLElement | null): number | undefined {
    return this.service.getContextForElement(element);
  }

  onDidChangeContext(listener: (event: ContextChangeEvent) => void): () => void {
    return this.service.onDidChangeContext(listener);
  }

  dispose(): void {
    this.service.deleteContext(this.context.id);
  }

  createKey<T extends ContextKeyValue>(
    key: string,
    defaultValue?: T
  ): IContextKey<T> {
    return new ContextKey(this, key, defaultValue);
  }
}

/**
 * Handle for a specific context key
 */
class ContextKey<T extends ContextKeyValue> implements IContextKey<T> {
  private defaultValue: T | undefined;

  constructor(
    private service: IScopedContextKeyService,
    private key: string,
    defaultValue?: T
  ) {
    this.defaultValue = defaultValue;
    if (defaultValue !== undefined) {
      this.set(defaultValue);
    }
  }

  set(value: T): void {
    this.service.setValue(this.key, value);
  }

  reset(): void {
    if (this.defaultValue !== undefined) {
      this.service.setValue(this.key, this.defaultValue);
    } else {
      this.service.setValue(this.key, undefined);
    }
  }

  get(): T | undefined {
    const value = this.service.getValue(this.key);
    return value as T | undefined;
  }
}

/**
 * Global singleton instance
 */
export const contextKeyService = new ContextKeyService();

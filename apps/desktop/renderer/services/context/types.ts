/**
 * Context Key Service Types
 *
 * Provides type definitions for the hierarchical context key system.
 * Context keys enable conditional keybindings and commands based on UI state.
 */

/**
 * Valid context key value types
 */
export type ContextKeyValue = string | number | boolean | undefined;

/**
 * Map of context key names to values
 */
export type ContextKeyMap = Record<string, ContextKeyValue>;

/**
 * Event fired when context changes
 */
export interface ContextChangeEvent {
  key?: string;
  value?: ContextKeyValue;
}

/**
 * Main context key service interface
 */
export interface IContextKeyService {
  /**
   * Create a scoped context bound to a DOM element
   * @param element DOM element to bind the context to
   * @returns A scoped context key service
   */
  createScoped(element: HTMLElement): IScopedContextKeyService;

  /**
   * Set a global context key value
   * @param key Context key name
   * @param value New value
   */
  setValue(key: string, value: ContextKeyValue): void;

  /**
   * Get a context value (walks up hierarchy)
   * @param key Context key name
   * @param contextId Optional context ID to start from
   * @returns The context value or undefined
   */
  getValue(key: string, contextId?: number): ContextKeyValue;

  /**
   * Get all context values (flattened hierarchy)
   * @param contextId Optional context ID to start from
   * @returns Flattened context map
   */
  getContext(contextId?: number): ContextKeyMap;

  /**
   * Get context ID for a DOM element
   * @param element DOM element
   * @returns Context ID or undefined
   */
  getContextForElement(element: HTMLElement | null): number | undefined;

  /**
   * Subscribe to context changes
   * @param listener Callback to invoke on context change
   * @returns Unsubscribe function
   */
  onDidChangeContext(listener: (event: ContextChangeEvent) => void): () => void;

  /**
   * Dispose the service and cleanup
   */
  dispose(): void;
}

/**
 * Scoped context key service interface
 * Provides methods for managing context within a specific scope
 */
export interface IScopedContextKeyService extends IContextKeyService {
  /**
   * Create a context key bound to this scope
   * @param key Context key name
   * @param defaultValue Default value
   * @returns A context key handle
   */
  createKey<T extends ContextKeyValue>(
    key: string,
    defaultValue?: T
  ): IContextKey<T>;

  /**
   * Get the context ID for this scope
   */
  readonly contextId: number;
}

/**
 * Handle for a specific context key
 * Allows getting and setting values for a single key
 */
export interface IContextKey<T extends ContextKeyValue> {
  /**
   * Set the value of this context key
   * @param value New value
   */
  set(value: T): void;

  /**
   * Reset the context key to its default value
   */
  reset(): void;

  /**
   * Get the current value
   * @returns Current value or undefined
   */
  get(): T | undefined;
}

/**
 * Internal context data structure
 * @internal
 */
export interface Context {
  id: number;
  parent: Context | null;
  values: Record<string, ContextKeyValue>;
}

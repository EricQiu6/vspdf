/**
 * useContextKey Hook
 *
 * React hook for managing context keys in components.
 * Creates a scoped context key bound to the component's DOM element.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { contextKeyService } from '../services/context/ContextKeyService.js';
import type {
  IContextKey,
  IScopedContextKeyService,
  ContextKeyValue,
} from '../services/context/types.js';

/**
 * Hook for managing a context key
 * @param key Context key name
 * @param defaultValue Default value
 * @param elementRef Optional ref to the element for scoped context
 * @returns Tuple of [value, setValue]
 */
export function useContextKey<T extends ContextKeyValue>(
  key: string,
  defaultValue?: T,
  elementRef?: React.RefObject<HTMLElement>
): [T | undefined, (value: T) => void] {
  const contextKeyRef = useRef<IContextKey<T>>();
  const scopedServiceRef = useRef<IScopedContextKeyService>();
  const [value, setValue] = useState<T | undefined>(defaultValue);

  useEffect(() => {
    // Use provided element ref, or fall back to document.body
    const element = elementRef?.current || document.body;
    const scoped = contextKeyService.createScoped(element);
    scopedServiceRef.current = scoped;
    contextKeyRef.current = scoped.createKey(key, defaultValue);

    // Subscribe to context changes
    const unsubscribe = contextKeyService.onDidChangeContext((event) => {
      if (event.key === key) {
        setValue(event.value as T | undefined);
      }
    });

    return () => {
      unsubscribe();
      scopedServiceRef.current?.dispose();
      contextKeyRef.current = undefined;
      scopedServiceRef.current = undefined;
    };
  }, [key, defaultValue, elementRef]);

  const setValueCallback = useCallback(
    (newValue: T) => {
      contextKeyRef.current?.set(newValue);
      setValue(newValue);
    },
    []
  );

  return [value, setValueCallback];
}

/**
 * Find nearest parent element with data-keybinding-context attribute
 * If not found, returns document.body
 * @returns HTMLElement or null
 */
function findContextElement(): HTMLElement | null {
  // Try to find the current component's DOM element
  // This is a heuristic - in practice, components should explicitly
  // set data-keybinding-context on their root element

  // For now, we'll use a ref-based approach where components
  // that want scoped contexts should set data-keybinding-context
  // on their root element themselves

  // Walk up from document.activeElement
  let current = document.activeElement as HTMLElement | null;

  while (current && current !== document.body) {
    if (current.dataset.keybindingContext !== undefined) {
      return current.parentElement; // Return parent to create child scope
    }
    current = current.parentElement;
  }

  // No context found - use body
  return document.body;
}

/**
 * Hook for creating a scoped context service
 * This is useful for components that want to manage multiple context keys
 *
 * @param elementRef Ref to the component's root element
 * @returns Scoped context key service
 */
export function useScopedContext(
  elementRef: React.RefObject<HTMLElement>
): IScopedContextKeyService | null {
  const [scoped, setScoped] = useState<IScopedContextKeyService | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const scopedService = contextKeyService.createScoped(elementRef.current);
    setScoped(scopedService);

    return () => {
      scopedService.dispose();
    };
  }, [elementRef]);

  return scoped;
}

/**
 * Default Keybindings
 *
 * Registers keyboard shortcuts for all commands that have keybindings defined.
 * This module provides the bridge between the command registry and keybinding service.
 */

import { commandRegistry } from '../CommandRegistry.js';
import { keybindingService } from './KeybindingService.js';
import type { Disposable } from './types.js';

/**
 * Convert a when predicate function to a when clause string
 *
 * This is a simplified conversion. In a full implementation, you might want to:
 * - Analyze the function to extract the expression
 * - Use a builder pattern for complex expressions
 * - Store the string alongside the function in the Command definition
 *
 * For now, we'll return undefined for function-based when clauses,
 * which means the keybinding will work in all contexts (less restrictive).
 *
 * @param when When predicate function
 * @returns When clause string or undefined
 */
function serializeWhenClause(
  when?: (ctx: any) => boolean
): string | undefined {
  // For now, we can't automatically convert function predicates to strings
  // This would require either:
  // 1. Storing the string representation alongside the function
  // 2. Analyzing the function's AST
  // 3. Using a builder pattern for when clauses
  //
  // For MVP, we'll return undefined (no when clause)
  // In Phase 5, we can enhance commands to include string when clauses
  return undefined;
}

/**
 * Register default keybindings for all commands
 *
 * Iterates through all registered commands and creates keybindings
 * for those that have a `keybinding` field defined.
 *
 * @returns Array of disposables for cleanup
 *
 * @example
 * ```typescript
 * // In Workbench.tsx
 * useEffect(() => {
 *   const disposables = registerDefaultKeybindings();
 *   return () => {
 *     disposables.forEach(d => d.dispose());
 *   };
 * }, []);
 * ```
 */
export function registerDefaultKeybindings(): Disposable[] {
  const commands = commandRegistry.getAll();
  const disposables: Disposable[] = [];

  let count = 0;

  for (const cmd of commands) {
    if (cmd.keybinding) {
      const disposable = keybindingService.registerKeybinding({
        id: `default.${cmd.id}`,
        commandId: cmd.id,
        key: cmd.keybinding,
        when: serializeWhenClause(cmd.when),
      });

      disposables.push(disposable);
      count++;
    }
  }

  console.log(`[Keybindings] Registered ${count} default keybindings`);

  return disposables;
}

/**
 * Unregister all default keybindings
 *
 * @param disposables Array of disposables returned from registerDefaultKeybindings
 */
export function unregisterDefaultKeybindings(disposables: Disposable[]): void {
  disposables.forEach((d) => d.dispose());
  console.log(`[Keybindings] Unregistered ${disposables.length} keybindings`);
}

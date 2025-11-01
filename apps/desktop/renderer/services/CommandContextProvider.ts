/**
 * Command Context Provider
 *
 * Provides the current command execution context (active group, tab, operations).
 * The EditorArea component updates this whenever state changes.
 */

import type { CommandContext } from '@vspdf/types';

/**
 * Global command context provider
 * EditorArea updates this whenever state changes
 */
class CommandContextProvider {
  private currentContext: CommandContext = {};

  /**
   * Update the current command context
   * Called by EditorArea whenever state changes
   */
  updateContext(context: CommandContext): void {
    this.currentContext = context;
  }

  /**
   * Get the current command context
   * Used by KeybindingService when executing commands
   */
  getContext(): CommandContext {
    return this.currentContext;
  }

  /**
   * Clear the context (cleanup)
   */
  clear(): void {
    this.currentContext = {};
  }
}

/**
 * Global singleton instance
 */
export const commandContextProvider = new CommandContextProvider();

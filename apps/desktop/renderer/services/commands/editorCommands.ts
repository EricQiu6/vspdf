import { commandRegistry } from '../CommandRegistry';
import type { Command } from '@vspdf/types';

/**
 * Editor-related commands
 *
 * These commands demonstrate the operations API integration pattern.
 * They access EditorAreaOperations through CommandContext, which is
 * injected by the Workbench when commands are executed.
 *
 * Command Design Principles:
 * - Declarative: Commands describe what they do, not how
 * - Contextual: Use `when` predicates for conditional availability
 * - Type-safe: CommandContext provides typed access to operations
 * - Testable: Commands are pure functions of context
 *
 * Usage:
 * 1. Define command with id, handler, when, keybinding
 * 2. Register with commandRegistry
 * 3. Execute via commandRegistry.execute(id, context)
 * 4. Command palette / keybindings / menus will invoke automatically
 */

// ============================================================================
// Split Commands
// ============================================================================

export const splitRightCommand: Command = {
  id: 'workbench.action.splitRight',
  handler: (ctx) => {
    if (!ctx.editorAreaOps || !ctx.activeGroup) {
      console.warn('splitRightCommand: Missing required context');
      return;
    }
    ctx.editorAreaOps.splitRight(ctx.activeGroup);
  },
  when: (ctx) => !!ctx.activeGroup,
  keybinding: 'Cmd+\\',
};

export const splitLeftCommand: Command = {
  id: 'workbench.action.splitLeft',
  handler: (ctx) => {
    if (!ctx.editorAreaOps || !ctx.activeGroup) {
      console.warn('splitLeftCommand: Missing required context');
      return;
    }
    ctx.editorAreaOps.splitLeft(ctx.activeGroup);
  },
  when: (ctx) => !!ctx.activeGroup,
  keybinding: 'Cmd+K Cmd+Left',
};

export const splitDownCommand: Command = {
  id: 'workbench.action.splitDown',
  handler: (ctx) => {
    if (!ctx.editorAreaOps || !ctx.activeGroup) {
      console.warn('splitDownCommand: Missing required context');
      return;
    }
    ctx.editorAreaOps.splitDown(ctx.activeGroup);
  },
  when: (ctx) => !!ctx.activeGroup,
  keybinding: 'Cmd+K Cmd+\\',
};

export const splitUpCommand: Command = {
  id: 'workbench.action.splitUp',
  handler: (ctx) => {
    if (!ctx.editorAreaOps || !ctx.activeGroup) {
      console.warn('splitUpCommand: Missing required context');
      return;
    }
    ctx.editorAreaOps.splitUp(ctx.activeGroup);
  },
  when: (ctx) => !!ctx.activeGroup,
  keybinding: 'Cmd+K Cmd+Up',
};

// ============================================================================
// Group Commands
// ============================================================================

export const closeGroupCommand: Command = {
  id: 'workbench.action.closeGroup',
  handler: (ctx) => {
    if (!ctx.editorAreaOps || !ctx.activeGroup) {
      console.warn('closeGroupCommand: Missing required context');
      return;
    }

    ctx.editorAreaOps.closeGroup(ctx.activeGroup);
  },
  when: (ctx) => !!ctx.activeGroup,
  // Note: Close last group is no-op (handled by reducer), so no special check needed
};

export const focusNextGroupCommand: Command = {
  id: 'workbench.action.focusNextGroup',
  handler: (_ctx) => {
    // This command needs access to state to find next group
    // In a real implementation, we'd need to either:
    // 1. Add navigation helpers to operations API
    // 2. Expose state in CommandContext
    // 3. Have commands be more tightly coupled to Workbench
    //
    // For now, this is a placeholder demonstrating the pattern
    console.log('focusNextGroupCommand: Not yet implemented');
  },
  when: (ctx) => !!ctx.activeGroup,
  keybinding: 'Cmd+K Cmd+Right',
};

export const focusPreviousGroupCommand: Command = {
  id: 'workbench.action.focusPreviousGroup',
  handler: (_ctx) => {
    console.log('focusPreviousGroupCommand: Not yet implemented');
  },
  when: (ctx) => !!ctx.activeGroup,
  keybinding: 'Cmd+K Cmd+Left',
};

// ============================================================================
// Tab Commands
// ============================================================================

export const closeActiveEditorCommand: Command = {
  id: 'workbench.action.closeActiveEditor',
  handler: (ctx) => {
    if (!ctx.editorAreaOps || !ctx.activeGroup || !ctx.activeTab) {
      console.warn('closeActiveEditorCommand: Missing required context');
      return;
    }

    // To close the active tab, we need its index
    // This would typically be stored in CommandContext
    // For now, this demonstrates the pattern
    console.log('closeActiveEditorCommand: Needs tab index in context');
  },
  when: (ctx) => !!ctx.activeTab,
  keybinding: 'Cmd+W',
};

export const openFileCommand: Command = {
  id: 'workbench.action.files.openFile',
  handler: async (ctx) => {
    if (!ctx.editorAreaOps) {
      console.warn('openFileCommand: Missing operations');
      return;
    }

    // In production, this would:
    // 1. Show native file picker dialog
    // 2. Get selected file URI
    // 3. Open in active or new group
    //
    // For now, just log
    console.log('openFileCommand: Would show file picker');
  },
  keybinding: 'Cmd+O',
};

// ============================================================================
// Registration
// ============================================================================

/**
 * Register all editor commands with the command registry
 *
 * This should be called during app initialization (e.g., in Workbench mount)
 * Commands registered here become available to:
 * - Command palette (future)
 * - Keybinding system (future)
 * - Context menus (future)
 * - Programmatic execution (commandRegistry.execute)
 *
 * @example
 * // In Workbench.tsx useEffect
 * registerEditorCommands();
 *
 * // Later, execute a command
 * await commandRegistry.execute('workbench.action.splitRight', context);
 */
export function registerEditorCommands(): void {
  commandRegistry.register(splitRightCommand);
  commandRegistry.register(splitLeftCommand);
  commandRegistry.register(splitDownCommand);
  commandRegistry.register(splitUpCommand);
  commandRegistry.register(closeGroupCommand);
  commandRegistry.register(focusNextGroupCommand);
  commandRegistry.register(focusPreviousGroupCommand);
  commandRegistry.register(closeActiveEditorCommand);
  commandRegistry.register(openFileCommand);

  console.log('[Commands] Registered 9 editor commands');
}

/**
 * Unregister all editor commands (for cleanup)
 *
 * Call this during unmount or hot reload to prevent duplicate registrations
 */
export function unregisterEditorCommands(): void {
  commandRegistry.unregister('workbench.action.splitRight');
  commandRegistry.unregister('workbench.action.splitLeft');
  commandRegistry.unregister('workbench.action.splitDown');
  commandRegistry.unregister('workbench.action.splitUp');
  commandRegistry.unregister('workbench.action.closeGroup');
  commandRegistry.unregister('workbench.action.focusNextGroup');
  commandRegistry.unregister('workbench.action.focusPreviousGroup');
  commandRegistry.unregister('workbench.action.closeActiveEditor');
  commandRegistry.unregister('workbench.action.files.openFile');

  console.log('[Commands] Unregistered editor commands');
}

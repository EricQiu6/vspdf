/**
 * Command Palette Component
 *
 * Quick access UI for searching and executing commands.
 * Inspired by VS Code's command palette.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CommandList } from './CommandList.js';
import { fuzzyFilter } from './fuzzySearch.js';
import { commandRegistry } from '../../services/CommandRegistry.js';
import { keybindingService } from '../../services/keybindings/KeybindingService.js';
import { contextKeyService } from '../../services/context/ContextKeyService.js';
import { commandContextProvider } from '../../services/CommandContextProvider.js';
import type { Command } from '@vspdf/types';
import styles from './CommandPalette.module.css';

/**
 * Command item for display in the palette
 */
export interface CommandItem {
  id: string;
  title: string;
  category?: string;
  keybinding?: string;
  command: Command;
}

/**
 * Command palette props
 */
export interface CommandPaletteProps {
  /**
   * Whether the palette is visible
   */
  visible: boolean;

  /**
   * Callback when palette should close
   */
  onClose: () => void;
}

/**
 * Command Palette Component
 *
 * Provides a searchable list of available commands.
 * Supports fuzzy search, keyboard navigation, and execution.
 */
export function CommandPalette({
  visible,
  onClose,
}: CommandPaletteProps): JSX.Element | null {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get filtered commands based on query
  const commands = useCommandList(query);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when palette becomes visible
  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [visible]);

  // Reset query when palette closes
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [visible]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, commands.length - 1));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;

        case 'Enter':
          e.preventDefault();
          if (commands[selectedIndex]) {
            executeCommand(commands[selectedIndex]);
            onClose();
          }
          break;

        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [commands, selectedIndex, onClose]
  );

  const executeCommand = useCallback((item: CommandItem) => {
    const context = commandContextProvider.getContext();
    commandRegistry.execute(item.id, context).catch((error) => {
      console.error(`Failed to execute command ${item.id}:`, error);
    });
  }, []);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      executeCommand(item);
      onClose();
    },
    [executeCommand, onClose]
  );

  if (!visible) {
    return null;
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.palette}
        onClick={(e) => e.stopPropagation()}
        data-testid="command-palette"
      >
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command or search..."
          autoFocus
        />
        <CommandList
          commands={commands}
          selectedIndex={selectedIndex}
          onSelect={handleSelect}
          query={query}
        />
      </div>
    </div>,
    document.body
  );
}

/**
 * Hook to get filtered and sorted command list
 */
function useCommandList(query: string): CommandItem[] {
  const allCommands = useMemo(() => commandRegistry.getAll(), []);

  return useMemo(() => {
    // Convert commands to command items
    const commandItems: CommandItem[] = allCommands.map((cmd) => {
      // Extract category from command ID (e.g., "workbench.action.splitRight" -> "workbench")
      const category = cmd.id.split('.')[0];

      // Get keybinding for this command
      const keybinding = keybindingService.lookupKeybinding(cmd.id);
      const keybindingStr = keybinding?.key;

      // Format title from command ID
      const title = formatCommandTitle(cmd.id);

      return {
        id: cmd.id,
        title,
        category,
        keybinding: keybindingStr,
        command: cmd,
      };
    });

    // Note: We don't filter by 'when' predicates here because:
    // 1. Command 'when' predicates expect CommandContext (with activeGroup, editorAreaOps, etc.)
    // 2. We only have ContextKeyMap from the context service (simple key-value pairs)
    // 3. The 'when' check happens during command execution (in CommandRegistry.execute)
    // This means all commands are always visible in the palette (like VS Code)

    // If no query, return all commands
    if (!query) {
      return commandItems;
    }

    // Fuzzy filter by query
    const filtered = fuzzyFilter(query, commandItems, (item) => item.title);

    return filtered.map((result) => result.item);
  }, [query, allCommands]);
}

/**
 * Format command ID into readable title
 * @param id Command ID (e.g., "workbench.action.splitRight")
 * @returns Formatted title (e.g., "Split Right")
 */
function formatCommandTitle(id: string): string {
  // Take last part of ID (after last dot)
  const parts = id.split('.');
  const lastPart = parts[parts.length - 1];

  // Split camelCase into words
  const words = lastPart.replace(/([A-Z])/g, ' $1').trim();

  // Capitalize first letter of each word
  return words
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

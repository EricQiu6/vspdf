/**
 * Command Item Component
 *
 * Displays a single command in the command palette.
 */

import { forwardRef } from 'react';
import { highlightMatches, fuzzySearch } from './fuzzySearch.js';
import type { CommandItem as CommandItemType } from './CommandPalette.js';
import styles from './CommandPalette.module.css';

/**
 * Command item props
 */
export interface CommandItemProps {
  /**
   * Command to display
   */
  command: CommandItemType;

  /**
   * Whether this item is selected
   */
  selected: boolean;

  /**
   * Callback when item is clicked
   */
  onSelect: () => void;

  /**
   * Search query (for highlighting)
   */
  query: string;
}

/**
 * Command Item Component
 *
 * Displays a command with its title, category, and keybinding.
 * Highlights matching characters from the search query.
 */
export const CommandItem = forwardRef<HTMLDivElement, CommandItemProps>(
  ({ command, selected, onSelect, query }, ref) => {
    // Get highlighted title
    const titleSegments = query
      ? (() => {
          const match = fuzzySearch(query, command.title);
          return match
            ? highlightMatches(command.title, match.matchedIndices)
            : [{ text: command.title, highlighted: false }];
        })()
      : [{ text: command.title, highlighted: false }];

    return (
      <div
        ref={ref}
        className={`${styles.commandItem} ${selected ? styles.selected : ''}`}
        onClick={onSelect}
        data-command-id={command.id}
      >
        <div className={styles.commandInfo}>
          <div className={styles.commandTitle}>
            {titleSegments.map((segment, index) => (
              <span
                key={index}
                className={segment.highlighted ? styles.highlight : ''}
              >
                {segment.text}
              </span>
            ))}
          </div>
          {command.category && (
            <div className={styles.commandCategory}>{command.category}</div>
          )}
        </div>
        {command.keybinding && (
          <div className={styles.commandKeybinding}>
            {formatKeybinding(command.keybinding)}
          </div>
        )}
      </div>
    );
  }
);

CommandItem.displayName = 'CommandItem';

/**
 * Format keybinding for display
 * @param keybinding Keybinding string (e.g., "Cmd+K Cmd+P")
 * @returns Formatted keybinding (e.g., "⌘K ⌘P")
 */
function formatKeybinding(keybinding: string): string {
  // Replace modifier keys with symbols on Mac
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('mac')) {
    return keybinding
      .replace(/Cmd\+/g, '⌘')
      .replace(/Ctrl\+/g, '⌃')
      .replace(/Alt\+/g, '⌥')
      .replace(/Shift\+/g, '⇧');
  }

  // Keep as-is on other platforms
  return keybinding;
}

/**
 * Command List Component
 *
 * Renders a scrollable list of command items.
 */

import { useEffect, useRef } from 'react';
import { CommandItem as CommandItemComponent } from './CommandItem.js';
import type { CommandItem } from './CommandPalette.js';
import styles from './CommandPalette.module.css';

/**
 * Command list props
 */
export interface CommandListProps {
  /**
   * Commands to display
   */
  commands: CommandItem[];

  /**
   * Index of selected command
   */
  selectedIndex: number;

  /**
   * Callback when a command is selected
   */
  onSelect: (command: CommandItem) => void;

  /**
   * Search query (for highlighting)
   */
  query: string;
}

/**
 * Command List Component
 *
 * Displays a list of commands with keyboard navigation support.
 * Automatically scrolls selected item into view.
 */
export function CommandList({
  commands,
  selectedIndex,
  onSelect,
  query,
}: CommandListProps): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      const list = listRef.current;
      const selected = selectedRef.current;

      const listRect = list.getBoundingClientRect();
      const selectedRect = selected.getBoundingClientRect();

      // Check if selected item is out of view
      if (selectedRect.bottom > listRect.bottom) {
        // Scroll down
        selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (selectedRect.top < listRect.top) {
        // Scroll up
        selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (commands.length === 0) {
    return (
      <div className={styles.list}>
        <div className={styles.noResults}>No commands found</div>
      </div>
    );
  }

  return (
    <div ref={listRef} className={styles.list}>
      {commands.map((command, index) => (
        <CommandItemComponent
          key={command.id}
          ref={index === selectedIndex ? selectedRef : null}
          command={command}
          selected={index === selectedIndex}
          onSelect={() => onSelect(command)}
          query={query}
        />
      ))}
    </div>
  );
}

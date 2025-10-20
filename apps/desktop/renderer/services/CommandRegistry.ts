import type { Command, CommandContext } from '@vspdf/types';

/**
 * CommandRegistry - Central command dispatcher
 * Manages all executable commands and their predicates
 */
export class CommandRegistry {
  private commands = new Map<string, Command>();

  register(command: Command): void {
    this.commands.set(command.id, command);
  }

  unregister(commandId: string): void {
    this.commands.delete(commandId);
  }

  async execute(commandId: string, context: CommandContext = {}): Promise<void> {
    const command = this.commands.get(commandId);
    if (!command) {
      console.warn(`Command not found: ${commandId}`);
      return;
    }

    if (command.when && !command.when(context)) {
      console.warn(`Command precondition failed: ${commandId}`);
      return;
    }

    await command.handler(context);
  }

  canExecute(commandId: string, context: CommandContext = {}): boolean {
    const command = this.commands.get(commandId);
    if (!command) return false;
    if (!command.when) return true;
    return command.when(context);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  get(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }
}

// Global singleton instance
export const commandRegistry = new CommandRegistry();

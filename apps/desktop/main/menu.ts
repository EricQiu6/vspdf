/**
 * Application Menu Configuration
 *
 * Custom Electron menu that removes shortcuts we want to handle in the renderer.
 * Keeps native shortcuts for system-level actions (Quit, Hide, Minimize, etc.)
 */

import { app, Menu, shell, type MenuItemConstructorOptions } from 'electron';

const isMac = process.platform === 'darwin';

/**
 * Create and set the application menu
 *
 * This menu removes shortcuts that conflict with our in-app keybinding system:
 * - Cmd+W (we want to close tabs, not windows)
 * - Cmd+Shift+P (command palette)
 * - Other editor shortcuts
 *
 * But keeps essential system shortcuts:
 * - Cmd+Q (Quit)
 * - Cmd+H (Hide)
 * - Cmd+M (Minimize)
 * - Edit menu (Copy, Paste, Undo, etc.)
 */
export function setupApplicationMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    // App Menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),

    // File Menu
    {
      label: 'File',
      submenu: [
        // No menu items - all file operations handled via in-app commands
        // This prevents Cmd+W conflict and keeps menu minimal
        {
          label: 'Close Window',
          accelerator: 'CmdOrCtrl+Shift+W',
          role: 'close',
        },
        ...(!isMac ? [{ role: 'quit' as const }] : []),
      ],
    },

    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
              { type: 'separator' as const },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' as const }, { role: 'stopSpeaking' as const }],
              },
            ]
          : [{ role: 'delete' as const }, { type: 'separator' as const }, { role: 'selectAll' as const }]),
      ],
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        // Development tools
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },

    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },

    // Help Menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/anthropics/claude-code');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

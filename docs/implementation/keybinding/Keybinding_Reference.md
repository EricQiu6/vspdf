# VS PDF Keybinding Reference

**Version:** 1.0
**Status:** Planned (Implementation pending)

---

## Overview

This document provides a comprehensive reference of all keyboard shortcuts in VS PDF, organized by category. All keybindings follow VS Code conventions for familiarity and muscle memory.

**Platform Conventions:**
- **Mac**: `Cmd` = Command key, `Opt` = Option/Alt key
- **Windows/Linux**: `Ctrl` = Control key, `Alt` = Alt key
- This reference shows Mac keybindings. Windows/Linux users should substitute `Ctrl` for `Cmd`.

---

## Global Commands

| Command | Mac | Windows/Linux | Description |
|---------|-----|---------------|-------------|
| Command Palette | `Cmd+Shift+P` | `Ctrl+Shift+P` | Open command palette |
| Quick Open File | `Cmd+P` | `Ctrl+P` | Quick file picker |
| Open File | `Cmd+O` | `Ctrl+O` | Open file dialog |
| New Window | `Cmd+Shift+N` | `Ctrl+Shift+N` | Open new window |
| Close Window | `Cmd+W` | `Ctrl+W` | Close current window |

---

## Editor Group Commands

### Splitting

| Command | Mac | Windows/Linux | Description |
|---------|-----|---------------|-------------|
| Split Right | `Cmd+\` | `Ctrl+\` | Split editor right |
| Split Left | `Cmd+K Cmd+[` | `Ctrl+K Ctrl+[` | Split editor left |
| Split Down | `Cmd+K Cmd+\` | `Ctrl+K Ctrl+\` | Split editor down |
| Split Up | `Cmd+K Cmd+Up` | `Ctrl+K Ctrl+Up` | Split editor up |

### Navigation

| Command | Mac | Windows/Linux | Description |
|---------|-----|---------------|-------------|
| Focus Next Group | `Cmd+K Cmd+Right` | `Ctrl+K Ctrl+Right` | Focus next editor group |
| Focus Previous Group | `Cmd+K Cmd+Left` | `Ctrl+K Ctrl+Left` | Focus previous editor group |
| Focus Above Group | `Cmd+K Cmd+Up` | `Ctrl+K Ctrl+Up` | Focus group above |
| Focus Below Group | `Cmd+K Cmd+Down` | `Ctrl+K Ctrl+Down` | Focus group below |

### Group Management

| Command | Mac | Windows/Linux | Description |
|---------|-----|---------------|-------------|
| Close Group | `Cmd+K Cmd+W` | `Ctrl+K Ctrl+W` | Close active editor group |
| Close Other Groups | `Cmd+K Cmd+Shift+W` | `Ctrl+K Ctrl+Shift+W` | Close all other groups |

---

## Tab Commands

| Command | Mac | Windows/Linux | Description |
|---------|-----|---------------|-------------|
| Close Active Tab | `Cmd+W` | `Ctrl+W` | Close active editor tab |
| Close All Tabs | `Cmd+K W` | `Ctrl+K W` | Close all tabs in group |
| Reopen Closed Tab | `Cmd+Shift+T` | `Ctrl+Shift+T` | Reopen last closed tab |
| Next Tab | `Cmd+Opt+Right` | `Ctrl+Tab` | Switch to next tab |
| Previous Tab | `Cmd+Opt+Left` | `Ctrl+Shift+Tab` | Switch to previous tab |
| Go to Tab 1-8 | `Cmd+1` to `Cmd+8` | `Ctrl+1` to `Ctrl+8` | Jump to specific tab |
| Go to Last Tab | `Cmd+9` | `Ctrl+9` | Jump to last tab |

---

## PDF Viewer Commands

| Command | Mac | Windows/Linux | Description |
|---------|-----|---------------|-------------|
| Zoom In | `Cmd++` | `Ctrl++` | Increase zoom level |
| Zoom Out | `Cmd+-` | `Ctrl+-` | Decrease zoom level |
| Reset Zoom | `Cmd+0` | `Ctrl+0` | Reset zoom to 100% |
| Fit to Width | `Cmd+Shift+0` | `Ctrl+Shift+0` | Fit page to width |
| Fit to Page | `Cmd+Opt+0` | `Ctrl+Alt+0` | Fit entire page |
| Next Page | `PageDown` or `Down` | `PageDown` or `Down` | Go to next page |
| Previous Page | `PageUp` or `Up` | `PageUp` or `Up` | Go to previous page |
| First Page | `Home` | `Home` | Jump to first page |
| Last Page | `End` | `End` | Jump to last page |
| Go to Page | `Cmd+G` | `Ctrl+G` | Open "Go to Page" dialog |
| Search in PDF | `Cmd+F` | `Ctrl+F` | Open find widget |
| Next Search Result | `Cmd+G` | `F3` | Jump to next match |
| Previous Search Result | `Cmd+Shift+G` | `Shift+F3` | Jump to previous match |

---

## Annotation Commands

| Command | Mac | Windows/Linux | Description |
|---------|-----|---------------|-------------|
| New Comment | `Cmd+Shift+C` | `Ctrl+Shift+C` | Create new comment thread |
| Reply to Comment | `Cmd+R` | `Ctrl+R` | Reply to active thread |
| Resolve Thread | `Cmd+Shift+R` | `Ctrl+Shift+R` | Resolve current thread |
| Next Comment | `F7` | `F7` | Jump to next comment |
| Previous Comment | `Shift+F7` | `Shift+F7` | Jump to previous comment |

---

## Sidebar & Panels

| Command | Mac | Windows/Linux | Description |
|---------|-----|---------------|-------------|
| Toggle Sidebar | `Cmd+B` | `Ctrl+B` | Show/hide sidebar |
| Toggle Panel | `Cmd+J` | `Ctrl+J` | Show/hide bottom panel |
| Focus Sidebar | `Cmd+Shift+E` | `Ctrl+Shift+E` | Focus file explorer |
| Focus Outline | `Cmd+Shift+O` | `Ctrl+Shift+O` | Focus outline panel |
| Focus Comments | `Cmd+Shift+C` | `Ctrl+Shift+C` | Focus comments panel |
| Focus AI Chat | `Cmd+Shift+A` | `Ctrl+Shift+A` | Focus AI chat panel |

---

## AI Commands

| Command | Mac | Windows/Linux | Description |
|---------|-----|---------------|-------------|
| Ask AI | `Cmd+K` | `Ctrl+K` | Open AI quick input |
| Ask AI about Selection | `Cmd+Shift+K` | `Ctrl+Shift+K` | Ask AI about selection |
| Toggle AI Chat | `Cmd+Shift+A` | `Ctrl+Shift+A` | Show/hide AI chat panel |

---

## Search & Navigation

| Command | Mac | Windows/Linux | Description |
|---------|-----|---------------|-------------|
| Find in File | `Cmd+F` | `Ctrl+F` | Search current file |
| Find in Workspace | `Cmd+Shift+F` | `Ctrl+Shift+F` | Search all files |
| Replace in File | `Cmd+Opt+F` | `Ctrl+H` | Find and replace |
| Go to Line | `Cmd+G` | `Ctrl+G` | Jump to line number |
| Go to Symbol | `Cmd+Shift+O` | `Ctrl+Shift+O` | Open document outline |

---

## Multi-Chord Keybindings

Some commands require pressing multiple key sequences in order. Press the first chord, then the second within 5 seconds.

**Examples:**

- **Split Left**: Press `Cmd+K`, release, then press `Cmd+[`
- **Close Group**: Press `Cmd+K`, release, then press `Cmd+W`
- **Focus Next Group**: Press `Cmd+K`, release, then press `Cmd+Right`

**Chord Mode Indicator**: When you press the first chord, you'll see a status indicator showing the active chord (e.g., "Cmd+K") in the status bar.

---

## Context-Specific Keybindings

Some keybindings only work in specific contexts:

### Editor Focus Only

These shortcuts only work when an editor pane has focus:

- `Cmd+W` - Close active tab
- `Cmd+\` - Split right
- `Cmd+F` - Find in current file
- PDF viewer shortcuts (zoom, page navigation)

### Input Fields

When typing in input fields (search boxes, comment boxes), most editor shortcuts are disabled to allow normal text input.

**Active shortcuts in input fields:**
- `Escape` - Cancel/close input
- `Enter` - Submit/confirm

### Command Palette

When the command palette is open:
- `Up/Down` - Navigate items
- `Enter` - Execute command
- `Escape` - Close palette

---

## Customizing Keybindings

**Future Feature** (Phase 7): Users will be able to customize keybindings via `~/.vspdf/keybindings.json`.

Example custom keybinding:
```json
[
  {
    "key": "Cmd+D",
    "command": "workbench.action.splitRight",
    "when": "editorFocus"
  }
]
```

---

## When Clause Context Keys

Commands can be conditionally enabled based on context. Here are the available context keys:

### Platform
- `isMac`, `isWindows`, `isLinux` - Platform detection

### Editor
- `editorFocus` - Editor has keyboard focus
- `editorTextFocus` - Editor text area has focus (not toolbars)
- `editorReadonly` - Current editor is read-only
- `activeGroupId` - ID of active editor group

### Viewer
- `viewerType` - Type of active viewer (`pdf`, `stub`, `image`, `text`)
- `viewerUri` - URI of current document
- `canZoom`, `canSearch`, `canGoToPage` - Viewer capabilities

### Panels
- `sidebarVisible` - Sidebar is visible
- `panelVisible` - Bottom panel is visible
- `commentsPanelFocus` - Comments panel has focus
- `outlinePanelFocus` - Outline panel has focus

### Input
- `inputFocus` - Any input field has focus
- `commandPaletteVisible` - Command palette is open

**Example**: The keybinding `Cmd+W` for closing tabs only works when `editorFocus && !inputFocus` is true.

---

## Accessibility

All commands are accessible via:
1. **Keyboard shortcuts** (this reference)
2. **Command palette** (`Cmd+Shift+P`)
3. **Context menus** (right-click)
4. **Application menu** (Electron menu bar)

Users who prefer not to use keyboard shortcuts can access all functionality through the command palette or menus.

---

## Quick Reference Card

For easy printing, here's a condensed quick reference:

### Essential Shortcuts
```
Cmd+Shift+P     Command Palette
Cmd+P           Quick Open
Cmd+\           Split Right
Cmd+W           Close Tab
Cmd+B           Toggle Sidebar
Cmd+F           Find in File
Cmd+G           Go to Page
Cmd++/−         Zoom In/Out
```

### Multi-Chord Shortcuts
```
Cmd+K Cmd+P     Go to Previous Group
Cmd+K Cmd+→     Go to Next Group
Cmd+K Cmd+W     Close Group
Cmd+K Cmd+\     Split Down
```

---

## Troubleshooting

### Keybinding Not Working

1. **Check context**: Some shortcuts only work in specific contexts (e.g., editor focused)
2. **Check for conflicts**: Another app might be capturing the shortcut
3. **Restart app**: Services may need reinitialization
4. **Open command palette**: Try executing the command via palette to verify it works

### Multi-Chord Timeout

If you press the first chord but the second chord doesn't register:
- You have 5 seconds between chords
- Check the status bar for the chord mode indicator
- Try again, pressing keys more deliberately

### Platform-Specific Issues

**Mac**:
- System shortcuts may override (e.g., `Cmd+Space` for Spotlight)
- Check System Preferences > Keyboard > Shortcuts

**Windows**:
- Some `Ctrl+Alt` combinations may conflict with AltGr on international keyboards
- Try using scan code mode if experiencing issues

**Linux**:
- Window manager shortcuts may conflict
- Check your desktop environment's keyboard settings

---

## Related Documentation

- [Implementation Plan](./Hotkeys_and_CommandPalette_Implementation_Plan.md) - Technical implementation details
- [Design Philosophy](../design/Design_Philosophy.md) - Architecture principles
- [Command Registry](../tech/Tech_Stack.md#command-system) - How commands work

---

**Last Updated**: Implementation pending (planned for Sprint S2)

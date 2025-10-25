# VSPDF - VS Code-Style PDF Workspace

[![CI](https://github.com/EricQiu6/vspdf/actions/workflows/ci.yml/badge.svg)](https://github.com/EricQiu6/vspdf/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Private-blue.svg)]()

A desktop research IDE with a VS Code-like workbench: multi-pane PDF reading, inline highlights, and a docked Comments panel. Built with Electron, React, and TypeScript.

## Project Status

✅ **Architecture Initialized** - Foundation complete, ready for Sprint 1 development

## What's Been Created

### 1. **Workspace Structure**

```
vspdf/
   apps/desktop/          # Main Electron application
      main/             # Electron main process (Node.js)
      preload/          # Secure IPC bridge
      renderer/         # React UI application
          components/workbench/
          viewers/      # Pluggable viewer components
          services/     # Core services (EventBus, CommandRegistry, ViewerRegistry)
          panels/       # Comments, AI chat (future)
   packages/
      types/            # Shared TypeScript types
      utils/            # Shared utility functions
   e2e/                  # E2E tests (Playwright)
```

### 2. **Core Services**

- **EventBus** - Pub/sub system for decoupled component communication
- **ViewerRegistry** - Plugin system for document viewers
- **CommandRegistry** - Centralized command dispatcher with context awareness

### 3. **Foundation Components**

- **Workbench** - Top-level layout orchestrator (placeholder for Sidebar, EditorArea, Panels)
- **StubViewer** - Development placeholder enabling workbench development before PDF.js integration

### 4. **Security & Architecture**

- Electron security best practices (`contextIsolation: true`, no `nodeIntegration`)
- IPC bridge for safe file system access
- Type-safe contracts between processes

## Quick Start

### Install Dependencies

```bash
pnpm install
```

### Run Development Server

```bash
pnpm dev
```

This will:

1. Build the Electron main process
2. Build the preload script
3. Start the Vite dev server for the renderer
4. Launch the Electron app with hot reload

### Other Commands

```bash
pnpm build        # Build for production
pnpm test         # Run unit tests (Vitest)
pnpm e2e          # Run E2E tests (Playwright)
pnpm lint         # Run ESLint
pnpm fmt          # Format code with Prettier
```

## Tech Stack

As specified in `docs/tech/Tech_Stack.md`:

- **Runtime:** Electron 31
- **UI Framework:** React 18
- **Language:** TypeScript 5 (strict mode, ES2022)
- **Bundler:** Vite 5
- **PDF Rendering:** pdfjs-dist 4.x (to be integrated)
- **Annotations:** pdfAnnotate (highkite/pdfAnnotate)
- **Layout:** @devbookhq/splitter (for panes)
- **Tree UI:** react-arborist (for file explorer)
- **Markdown:** remark + remark-gfm + remark-math
- **Math:** KaTeX + rehype-katex
- **Sanitization:** DOMPurify

## Next Steps (Sprint 1)

Per `docs/design/Design_Document.md`, Sprint 1 deliverables:

1. **Sidebar (Explorer)**
   - File tree with react-arborist
   - Open file → EditorArea
   - Context menus

2. **EditorArea**
   - Split pane layout (@devbookhq/splitter)
   - EditorGroups with tabs
   - Active viewer rendering via ViewerRegistry

3. **Command System**
   - Implement workbench commands (split, focus, close)
   - Context menu integration
   - Keyboard shortcuts

4. **StubViewer → Real Usage**
   - Hook up StubViewer in EditorGroups
   - Test tab switching, split panes, focus management

## Architecture Highlights

### IPC Security

The preload script (`apps/desktop/preload/index.ts`) exposes a safe API via `contextBridge`:

```typescript
window.electronAPI.fs.read(filePath);
window.electronAPI.fs.write(filePath, data);
window.electronAPI.fs.listDir(dirPath);
```

### Event-Driven Communication

Components communicate via EventBus without direct coupling:

```typescript
eventBus.publish({ type: 'viewer.ready', uri });
eventBus.subscribe('viewer.selectionChanged', handleSelection);
```

### Pluggable Viewers

Viewers implement a stable contract (`ViewerHandle` interface) and register themselves:

```typescript
viewerRegistry.register('pdf', PdfJsViewer);
viewerRegistry.register('stub', StubViewer);
```

## Documentation

- `CLAUDE.md` - Quick project brief for AI assistants
- `docs/design/Design_Document.md` - Complete system architecture
- `docs/tech/Tech_Stack.md` - Unambiguous build plan & dependencies
- `docs/prd/PRD_vscode_layout.md` - Workbench UX requirements
- `docs/prd/PRD_pdf_viewer.md` - Threads, annotations, import/export

## License

Private project.

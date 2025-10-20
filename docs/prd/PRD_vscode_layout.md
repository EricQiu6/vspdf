# Sub-PRD: VS Code–Style Multi-Tab PDF Workspace (Extended MVP)

### Sprint Goal

Deliver a **multi-tab, split-pane PDF workspace** modeled after VS Code’s layout system.  
This MVP focuses on the **core workbench and layout architecture** (tabs, panes, editor groups, sidebar, command palette) — not the PDF rendering itself.

All actual PDF viewers will be replaced with **placeholders** that can be seamlessly swapped later for real implementations.

---

## 1. User Stories

| ID  | Story                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------- |
| U1  | As a researcher, I can open multiple PDFs as tabs and switch between them.                                             |
| U2  | As a user, I can split my workspace horizontally or vertically to compare PDFs side by side.                           |
| U3  | As a user, I can view my open files and local folders in a sidebar similar to VS Code’s Explorer.                      |
| U4  | As a user, I can search, zoom, and scroll within each viewer pane independently.                                       |
| U5  | As a user, I can close, move, and reorder tabs within or between panes.                                                |
| U6  | As a user, I can invoke commands (open, close, split, toggle sidebar) through a command palette or keyboard shortcuts. |
| U7  | As a developer, I can later integrate a full PDF viewer without modifying the layout or tab management code.           |

---

## 2. System Overview

The application mimics the **VS Code Workbench** layout:

```
┌───────────────────────────────────────────────┐
│ Title Bar                                     │
├───────────────────────────────────────────────┤
│ Activity Bar │ Sidebar │ Editor Area          │
│              │          │  (Editor Groups)    │
│              │          │  ┌───────────────┐  │
│              │          │  │ EditorGroup 1 │  │
│              │          │  ├───────────────┤  │
│              │          │  │ EditorGroup 2 │  │
│              │          │  └───────────────┘  │
├──────────────┴──────────┴─────────────────────┤
│ Panel (outline, notes, etc.)                  │
└───────────────────────────────────────────────┘
```

---

## 3. Core Components (Architecture Level)

### 🧱 **Workbench**

Top-level layout manager responsible for:

- Docking regions (Sidebar, EditorArea, Panel, StatusBar)
- Managing visibility and proportions (everything should be size-adjustable)
- Routing keyboard shortcuts and commands

### 📂 **Sidebar**

- Displays directory tree.
- Handles file open events (drag-drop, “Open File…” Right-Click Menu:).
- Mirrors VS Code’s **Explorer view**.
- Resizable with drag handle
- toggleable with button

### 🖼️ **EditorArea**

- Central container holding one or more **EditorGroups**.
- Implements **split logic**: divides space horizontally/vertically with adjustable sizes
- Manages focus and active group tracking.

### 🔳 **EditorGroup**

- Equivalent to VS Code’s “pane.”
- Each group maintains:
  - A **tab bar** (open documents)
  - A single **active viewer**
  - Local state: active tab index, viewer handles, toolbar state
- Can host any document type — the PDF viewer will plug in later.

### 📑 **Tabs**

- Each tab represents one open document (e.g., `Attention.pdf`).
- Stores metadata:
  ```json
  { "id": "t1", "uri": "file:///...", "title": "Attention.pdf", "viewerKind": "stub", "state": {} }
  ```

### 🪟 **Viewer Abstraction**

- Defined by a `ViewerHandle` and `ViewerProps` interface.
- All viewers (PDF, placeholder, future image viewer) follow the same contract:
  - Input: `uri`, `initialState`, `onEvent`
  - Output: events (`ready`, `stateChanged`, etc.)
  - Methods: `focus`, `getState`, optional `zoomIn`, `search`, `goToPage`
- This abstraction allows **hot-swapping the viewer** without breaking EditorGroup.

### 🧩 **StubViewer (Placeholder)**

- Minimal component showing the filename and “placeholder” label.
- Emits standard viewer events (`ready`, `capabilitiesChanged`).
- Implements `getState()` but returns dummy data.
- Enables development/testing of layout, tabs, and command palette before the real PDF viewer is built.

### ⚙️ **ViewerRegistry**

- Acts as a dependency injector for viewer types.
- Maps `viewerKind` or `mimeType` → viewer component.
- Example:
  ```ts
  registry.register('stub', StubViewer);
  registry.register('pdf', PdfJsViewer);
  ```
- Current sprint: only `'stub'` registered.
- Later: add `'pdf'` (real implementation) — no refactor needed.

### 🧭 **Command Palette**

- Text-based launcher for commands (`open`, `split right`, `toggle sidebar`).
- Invoked via `Cmd+Shift+P` or toolbar.
- Command dispatch handled by a shared `CommandRegistry`.

---

## 4. Persistence (Deferred Feature)

### **Current Sprint**

- Persistence **not included**.
- However, the architecture anticipates it:
  - Each viewer supports `getState()` and `initialState`.
  - `EditorGroup` and `EditorArea` are pure state machines, making snapshot serialization trivial later.

### **Future Implementation**

Persistence will store:

1. Workspace layout (EditorArea split tree)
2. EditorGroups (tabs, activeIndex)
3. Viewer states (page, zoom, etc.)

Since these states already exist in component memory, persistence can be added with:

- A workspace serializer (`collectSnapshot()`)
- A rehydration routine (`restoreWorkspace(snapshot)`)

This can be safely added in a future sprint with **no redesign** of current components.

---

## 5. MVP Functional Requirements

| Category               | Requirement                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| **File Handling**      | Open local PDFs (drag/drop or dialog). Close and reorder tabs.                                 |
| **Split View**         | Split active EditorGroup horizontally or vertically.                                           |
| **Independent State**  | Each group maintains its own active tab and viewer.                                            |
| **Layout**             | Support arbitrary splits, reordering, and resizing.                                            |
| **Tab Management**     | Add, switch, close, and move tabs between groups.                                              |
| **Keyboard Shortcuts** | Ctrl/Cmd+W (close tab), Ctrl+Tab (switch tab), Ctrl+\ (split), Ctrl+Shift+P (command palette). |
| **Placeholders**       | StubViewer renders content pane; PDF viewer stubbed.                                           |
| **Performance**        | All operations reactive; instant switching; lazy mounting.                                     |

---

## 6. Stretch Goals (Next Sprints)

1. **Persistence Layer** — save/restore workspace and per-tab state.
2. **Real PDF Viewer Integration** — replace StubViewer with PDF.js-based implementation.
3. **Annotations Layer** — highlight, comments, tagging.
4. **Outline / Notes Panel** — as a dockable bottom or side `PanelContainer`.
5. [[PRD_pdf_viewer]]
6. **Cross-Document Search** — unify queries across open PDFs.
7. **AI Panel Integration** — Q&A, compare, and summarize panes.

---

## 7. Non-Functional Requirements

| Area               | Requirement                                             |
| ------------------ | ------------------------------------------------------- |
| **Performance**    | Layout operations and tab switching < 50 ms latency.    |
| **Scalability**    | Support ≥10 open documents without slowdown.            |
| **Extensibility**  | Viewer replacement must require 0 layout changes.       |
| **Security**       | Local file access only; no external network calls.      |
| **Accessibility**  | Full keyboard support; minimal color dependency.        |
| **Cross-Platform** | Electron target (Mac/Win/Linux); web fallback optional. |

---

## 8. Deliverables (Sprint Exit Criteria)

- **UI Shell:** Workbench with Sidebar, EditorArea, and Command Palette.
- **Layout:** Multi-pane split system with EditorGroups.
- **Tabs:** Creation, selection, and close behaviors.
- **Viewer Placeholder:** StubViewer registered and functional.
- **Command Palette:** Minimal text interface for workspace actions.
- **No Persistence:** Feature stubbed for future sprint (interfaces ready).
- **Demo:** Able to open and arrange multiple PDFs in split panes, each showing placeholders labeled by file name.

---

## 9. Future Extensibility

| Planned Add-on          | How It Fits                                          |
| ----------------------- | ---------------------------------------------------- |
| **PDF.js Viewer**       | Swaps into ViewerRegistry under key `'pdf'`.         |
| **Annotation System**   | Docked panel using same interface as PanelContainer. |
| **Session Persistence** | Adds save/load layer using existing state tree.      |
| **AI Assistant Panel**  | New right-side PanelContainer instance.              |
| **Multi-File Search**   | Uses EditorArea registry of open URIs.               |

---

## 10. Summary

This sprint delivers the **skeleton of a VS Code–style document IDE**, focused on **layout correctness**, **EditorGroup architecture**, and **extension points**.  
No real PDF rendering or persistence is implemented yet — but all necessary contracts (ViewerHandle, ViewerRegistry, state containers) are designed so that:

- Persistence can be added **without refactoring**.
- The PDF viewer can be **hot-swapped** in seamlessly.
- The layout engine (panes, tabs, splits) will remain stable for future features.

---

Would you like me to format this PRD into a publish-ready Markdown file (with numbered sections and indentation like a spec)? It’ll be easier to import into a GitHub project or Notion doc.

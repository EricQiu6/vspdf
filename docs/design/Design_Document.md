Based on your full PRD, here is a **complete design document** written in the **LLM-coder** style — concise, technical, and implementation-ready.

---

# 🧩 Design Document — VSCode+Google-Doc-Style PDF Workspace

## 0. Overview

A modular **workbench-style PDF IDE**, combining:

- **VS Code layout** (multi-pane, multi-tab workspace)
    
- **Google-Doc-style commenting** (threaded annotations)
    
- **Copilot-style AI collaboration** (chat + inline AI replies)
    

Core architectural goal: _extendibility without rewrite_ — everything (PDF rendering, AI, annotations, persistence) mounts through stable service contracts.

---

## 1. System Architecture

### 1.1 Layered View

```
App Shell (Electron/Web)
 ├── Workbench (layout + event routing)
 │    ├── Sidebar (Explorer)
 │    ├── EditorArea (split layout)
 │    │    └── EditorGroups → Tabs → Viewers
 │    ├── PanelContainer (Outline, Comments, AI)
 │    └── StatusBar
 └── Core Services (decoupled)
      ├── CommandRegistry / ContextMenuService
      ├── EventBus
      ├── ViewerRegistry
      ├── AnnotationService
      ├── WorkspaceService / FileSystemAdapter
      ├── PersistenceService (deferred)
      ├── IndexerService
      ├── AIBroker / PolicyService
      └── Telemetry
```

---

## 2. Key Components

### 2.1 Workbench

**Purpose:** top-level orchestrator for layout regions and focus.  
**Responsibilities**

- Initializes all services.
    
- Persists/loads workspace state (later).
    
- Routes commands, shortcuts, and context menus.
    

---

### 2.2 Sidebar (Explorer)

**Purpose:** navigation and workspace awareness.

- Lists open files + directory tree.
    
- Emits `openFile(uri)` commands.
    
- Context menu: _Open_, _Open to Side_, _Rename_, _Reveal in Finder_, _Add Folder_.
    

---

### 2.3 EditorArea

**Purpose:** manage split panes and EditorGroups.

- Maintains a **layout tree** (`row` / `column` / `leaf`).
    
- Splits, merges, resizes groups.
    
- Tracks active group and focus order.
    

---

### 2.4 EditorGroup (“Pane”)

**Purpose:** self-contained editor with tabs and one active viewer.  
**Internal state:**

```ts
{
  id: string,
  tabs: DocTab[],
  activeIndex: number
}
```

**Responsibilities**

- Tab management (open/close/reorder).
    
- Renders active Viewer via ViewerRegistry.
    
- Relays Viewer events to EventBus.
    
- Displays toolbars/menus according to `capabilitiesChanged`.
    

---

### 2.5 Viewer Interface

**Contract:**

```ts
interface ViewerProps {
  uri: string;
  initialState?: unknown;
  onEvent(ev: ViewerEvent): void;
}
interface ViewerHandle {
  focus(): void;
  getState(): unknown;
  dispose(): void;
  search?(q: string): void;
  zoomIn?(): void;
  zoomOut?(): void;
  goToPage?(n: number): void;
}
```

**Events:** `ready`, `stateChanged`, `capabilitiesChanged`, `selectionChanged`, `annotationClicked`, `error`.

Viewers (PDF, image, text) are _plugins_; only the interface is fixed.

---

### 2.6 ViewerRegistry

Maps MIME or `viewerKind` → Viewer component.  
Current:

```ts
register('stub', StubViewer);
register('pdf', PdfJsViewer); // future
```

StubViewer enables development before PDF.js integration.

---

### 2.7 PanelContainer

Dockable panels (bottom or right).  
Reserved IDs:

- **outline**
    
- **comments**
    
- **ai-chat**
    

Panels subscribe to the EventBus and respond to selection or context changes.

---

### 2.8 Command & Context Menu System

**CommandRegistry**

- Centralized definitions: `id`, `handler(ctx)`, `keybinding`, `predicate(ctx)`.
    

**ContextMenuService**

- Detects `data-ui-role` target (`tab`, `editorGroup`, `sidebar.item[file]`, etc.).
    
- Builds a menu spec → executes commands via registry.
    
- Works in Electron (native menu) or web (HTML overlay).
    

Menus are context-aware (`when:` + `enabled:` predicates) and capability-driven (e.g., show Zoom only if `canZoom`).

---

## 3. Core Services

|Service| Purpose                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
|**EventBus**| Pub/sub between Viewers, Panels, and Workbench.                                                               |
|**WorkspaceService**| Tracks root folder(s), open documents, recents.                                                               |
|**AnnotationService**| Manages threaded comments with Markdown rendering. Supports Text/Rect/Hybrid anchors; persists via PDF embed. |
|**PersistenceService**| (Deferred) Save/restore workspace layout and state snapshots.                                                 |
|**IndexerService**| Builds local text + embedding index of all PDFs (policy-gated). Enables folder-wide AI context.               |
|**AIBroker**| Mediates all model calls, enforces “cite-or-no-answer”.                                                       |
|**PolicyService**| Security/enterprise flags: network access, background indexing, PII masking.                                  |
|**FileSystemAdapter**| Abstracts FS I/O; supports local and cloud.                                                                   |
|**Telemetry**| Opt-in structured logs.                                                                                       |

---

## 4. Data Model Snapshots

### 4.1 Workspace

```json
{
  "schemaVersion": 1,
  "layout": { "type": "split", "direction": "row", "sizes": [0.5, 0.5], "children": [...] },
  "groups": {
    "g1": { "tabs": [...], "activeIndex": 0 },
    "g2": { "tabs": [...] }
  }
}
```

### 4.2 Annotation

```json
{
  "threadId": "uuid",
  "anchors": [
    { "type": "TextAnchor", "hash": "sha1", "start": 102, "end": 156 },
    { "type": "RectAnchor", "page": 2, "bbox": [100,200,150,230] }
  ],
  "comments": [
    { "id": "c1", "author": "user", "text": "markdown text", "created": "iso" },
    { "id": "c2", "author": "ai", "text": "ai reply", "created": "iso" }
  ]
}
```

---

## 5. AI Integration

### 5.1 Inline AI Comments

- Trigger: user clicks “Ask AI” inside a comment.
    
- Context: current thread’s highlighted text.
    
- Output: AI reply saved as a new comment with `author = ai`.
    
- Guardrails: timeouts, minimal latency, optional on-device model.
    

### 5.2 Copilot Chat Panel

- Scope: folder-wide conversation.
    
- Context sources:
    
    - open tabs,
        
    - highlighted text,
        
    - pinned comments,
        
    - workspace index (via IndexerService).
        
- Persistent history per workspace.
    

---

## 6. Flows

### 6.1 Open File

1. Sidebar → `openFile(uri, targetGroup)` → CommandRegistry.
    
2. EditorArea ensures group, creates tab.
    
3. ViewerRegistry resolves viewer.
    
4. Viewer mounts → emits `ready`.
    

### 6.2 Selection → Comment

1. Viewer emits `selectionChanged`.
    
2. Comments panel subscribes via EventBus.
    
3. AnnotationService creates thread and persists anchors.
    

### 6.3 Selection → Ask AI

1. Viewer emits `selectionChanged`.
    
2. AI panel enabled.
    
3. AIBroker composes context (selection + index hits).
    
4. Response → AI panel with citations.
    

### 6.4 Persistence (future)

- Workbench calls `collectSnapshot()`.
    
- All groups append each viewer’s `getState()`.
    
- PersistenceService writes JSON atomically.
    

---

## 7. Extensibility Guarantees

- **Viewer independence:** PDF, image, or text all work via the same API.
    
- **Panel independence:** outline/comments/chat panels subscribe via EventBus, not hard-wired.
    
- **Command extensibility:** menus/palette auto-discover commands.
    
- **Persistence optionality:** ready hooks; adding it later doesn’t alter component boundaries.
    
- **AI modularity:** AIBroker and Indexer are optional services behind policy flags.
    

---

## 8. Security & Privacy

- No external calls in MVP.
    
- PolicyService must gate all network + background jobs.
    
- AI features disabled by default until policy grants.
    
- Annotation and workspace files are plain text; redact before sharing.
    

---

## 9. Performance Targets

|Metric|Target|
|---|---|
|Tab switch latency|< 50 ms|
|Viewer render FPS|≥ 60|
|Memory per open PDF|≤ 150 MB|
|Search latency|< 300 ms|
|AI round-trip (local)|< 2 s|

---

## 10. Future Hooks

- **Annotation anchors → collaborative sync** (multi-user editing).
    
- **Workspace index → real-time embedding updates.**
    
- **AIBroker → multi-model routing (LLM-on-prem, cloud).**
    
- **Persistence → multi-workspace management.**
    
- **Cloud sync** via FileSystemAdapter extensions.
    

---

## 11. Implementation Roadmap

|Sprint|Deliverables|
|---|---|
|**S1**|Workbench shell + Sidebar + EditorArea + EditorGroups + StubViewer + Command/Context menu system|
|**S2**|PersistenceService, real PDF.js Viewer integration|
|**S3**|AnnotationService + threaded Markdown comments|
|**S4**|Inline AI comment replies (AIBroker minimal)|
|**S5**|Copilot chat panel + workspace Indexer|
|**S6+**|Cloud sync, collaboration, multi-user commenting|

---

### ✅ Design Summary

This design fully realizes the PRD’s vision:

- VS Code layout: ✔ multi-pane, tabbed workbench.
    
- Threaded annotations: ✔ via AnnotationService + PanelContainer.
    
- AI collaboration: ✔ inline + copilot chat via AIBroker.
    
- Extensible core: ✔ every future feature (PDF, persistence, AI) plugs in through existing contracts.
    

The architecture is ready for immediate prototyping.
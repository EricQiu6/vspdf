# Tech Stack Specification

This spec turns the PRDs + design into an **unambiguous build plan**. Every component below names **one** stack choice and the **exact interface** the team must implement. The architecture remains modular so later features (persistence, richer AI, collaboration) plug in without rewrites.

---

## 0) Platform, Languages, Tooling

- **Runtime / Shell:** **Electron 31+** (Chromium + Node) desktop app.
- **Language:** **TypeScript** (strict mode, `"target": "ES2022"`).
- **UI Framework:** **React 18** (function components + hooks).
- **Bundler:** **Vite** (React plugin, `esbuild` for TS transpile).
- **Process Bridge:** Electron **contextBridge + IPC** (no remote module).
- **Package Manager:** **pnpm**.
- **Lint/Format:** **ESLint** (typescript-eslint) + **Prettier**.
- **Tests:** **Vitest** (unit) + **Playwright** (e2e headful Electron).
- **Packager:** **electron-builder**.

> Deliverable: a mono-repo with `apps/desktop` (Electron) and `packages/` for shared modules (AnnotationService, CommandRegistry…).

---

## 1) Top‑Level Architecture (where each design is used)

```
Electron (Main)
 ├─ FileSystemAdapter (Node fs; safe APIs exposed via IPC)
 ├─ PolicyService (feature flags: network, indexing)
 └─ App Lifecycle / Auto‑updates (later)

Electron (Renderer) — React App
 ├─ Workbench (shell + layout + focus mgmt)
 │   ├─ Sidebar (Explorer)
 │   ├─ EditorArea → EditorGroups (panes) → Tabs → Viewers
 │   │                 └─ PdfJsViewer (+ pdfAnnotate engine)
 │   ├─ PanelContainer (Comments, AI Chat; Outline later)
 │   └─ StatusBar
 └─ Core Services (renderer)
     ├─ CommandRegistry / ContextMenuService
     ├─ EventBus
     ├─ ViewerRegistry
     ├─ AnnotationService (threads, transcripts, anchors)
     ├─ AIBroker (invisible replies, optional chat)
     └─ (Deferred) PersistenceService, IndexerService
```

---

## 2) Layout & Navigation

- **Pane Splitter:** **`allotment`** (derived from VS Code's actual split view library; nested row/column splits). Originally planned `@devbookhq/splitter`, but switched for 100% VS Code fidelity and better maintenance (active as of June 2025 vs Aug 2023). API: `<Allotment vertical={boolean}> <Allotment.Pane/> … </Allotment>`
- **Tabs:** Custom React tabs (simple reducer).
- **Explorer Tree:** **`react-arborist`** (virtualized tree; file drag/drop).
- **Routing:** App‑internal; no URL router needed.

**EditorGroup State**

```ts
type GroupId = string;
interface DocTab {
  uri: string;
  title: string;
  viewer: 'pdf';
}
interface EditorGroupState {
  id: GroupId;
  tabs: DocTab[];
  activeIndex: number;
}
```

**Commands**

- `workbench.splitVertical`, `workbench.splitHorizontal`, `group.focusNext`, `tab.close`, `tab.moveToNewGroup`.

## -![[Pasted image 20251005205841.png|700]]

## 3) Viewer Layer

- **PDF Renderer:** **pdfjs-dist 4.x**. Use **textLayer** + **annotationLayer**.
- **Viewer Component:** `PdfJsViewer` wraps PDF.js, exposes a **stable handle**:

```ts
interface ViewerHandle {
  focus(): void;
  getState(): { page: number; zoom: number };
  search?(q: string): void;
  zoomIn?(): void;
  zoomOut?(): void;
  goToPage?(n: number): void;
}
```

- **Events emitted to EventBus:** `ready`, `stateChanged`, `selectionChanged({ anchors })`, `annotationClicked({ annotId })`, `error`.

## ![[Screenshot 2025-10-05 at 8.49.46 PM.png|500]]

## 4) Annotation Engine (low‑level)

- **Library:** **highkite/pdfAnnotate** (MIT). Loaded inside `PdfJsViewer` overlay.
- **Responsibility:** create/read/update/delete **standard PDF annotations** (highlights, text notes, pins). Provides geometry and writing back to PDF.
- **Do not** implement thread logic in pdfAnnotate; it only draws + stores raw `Contents`.

**Integration Surface**

```ts
interface PdfAnnotateAdapter {
  createHighlight(page: number, quads: Quad[], contents: string): Promise<string /*annotId*/>;
  createNote(page: number, rect: Rect, contents: string): Promise<string>;
  updateContents(annotId: string, contents: string): Promise<void>;
  delete(annotId: string): Promise<void>;
  list(page?: number): Promise<AnnotSummary[]>; // includes geometry + contents
}
```

## ![[Pasted image 20251005205239.png|700]]

## 5) Thread Model & Comments Panel

- **Truth:** The **canonical transcript** is plain text inside **one** annotation’s `Contents`.
- **Links:** Other anchors store `[thread-link <id>]` in `Contents`.
- **Panel duties:** parse transcript → render Markdown + KaTeX → append new comments → write updated transcript back to canonical annotation.

**Transcript Grammar** (line‑based)

```
[thread <id>]
@<author> <ISO8601>
<text…>

@<author> <ISO8601>
<text…>
@end
```

- Link: `[thread-link <id>]`
- Optional (ignored) hint: `[text-hint] <excerpt>`

**Parser**

```ts
interface Comment {
  id: string;
  author: string;
  time: string;
  raw: string;
}
function parseTranscript(txt: string): Comment[] {
  /* as spec */
}
```

**Rendering**

- **Markdown:** **remark** + **remark-gfm**.
- **Math:** **remark-math** + **rehype-katex**; style via **katex 0.16+** CSS.
- **Sanitize:** **DOMPurify** on the generated HTML.

**Panel Scope**

- Default **Focused document**; switcher: _Focused_ / _This group_ / _All open_ / _Workspace_.

**Panel ↔ Viewer Interactions**

- Click highlight → `annotationClicked` → open thread, scroll/flash.
- Click thread/anchor chip → `revealAnchor(docUri, threadId)` → `goToPage(n)`.
- New thread → create canonical annotation (full transcript) + additional anchors with `[thread-link]`.

## ![[Pasted image 20251005210155.png|550]]

## 6) Import / Export

- **Primary:** **Annotated PDF** (incremental write).Canonical `Contents` holds the full thread; linked anchors hold `[thread-link <id>]`.
- **Round‑trip:** On open, list annotations → parse `Contents` → rebuild threads + anchors.

**AnnotationService API**

```ts
interface AnnotationService {
  createThread(
    docUri: string,
    anchors: AnchorInput[],
    first: { author: string; text: string }
  ): Promise<{ threadId: string }>;
  appendComment(
    docUri: string,
    threadId: string,
    c: { author: string; text: string }
  ): Promise<void>;
  addAnchorLink(docUri: string, threadId: string, anchor: AnchorInput): Promise<string /*annotId*/>;
  getThread(docUri: string, threadId: string): Promise<ThreadViewModel>;
}
```

---

## 7) AI (future work to scale)

- **Inline replies only:** `@assistant` appears as a normal author.
- **Broker:** `AIBroker.ask({ docUri, threadId, selection?, history }) → Promise<string>`
- **Model:** default **OpenAI** Chat Completions (configurable provider later).
- **No badges/provenance** in UI; store plain text.

**UI hooks**: Button `[ Ask assistant ]` under composer. On success: `appendComment(author='assistant')`.

https://logically.app/file/68e2b6a01b555c3867e3a546

---

## 8) Command System & Context Menus

- **CommandRegistry** (single source):

```ts
register({ id: 'viewer.zoomIn', when: (ctx) => ctx.viewer?.canZoom, handler });
register({ id: 'thread.create', when: (ctx) => !!ctx.selection, handler });
register({ id: 'thread.append', when: (ctx) => !!ctx.thread, handler });
register({ id: 'anchor.reveal', handler });
```

- **ContextMenuService:** inspects `data-ui-role` to build menus:
  - Viewer mark: Open thread, Add link to existing…, Copy thread id, Delete anchor
  - Tab/Group/Sidebar items per PRD

---

## 9) File I/O & Security

- **FileSystemAdapter (Main):** `readFile`, `writeFileAtomic`, `listDir`, `stat` via Node `fs/promises`.
- **IPC contracts:** `fs.read(uri) → Uint8Array`, `fs.write(uri, bytes) → ok`.
- **Security:** enable `contextIsolation`, disable `nodeIntegration` in renderer; whitelist IPC channels; sanitize HTML in comments panel.

---

## 10) Performance Budgets

- Tab switch < **50 ms**; overlay work per frame < **16 ms**.
- Import **1k** annotations < **2 s**.
- Memory ≤ **150 MB** per open PDF.

**Practices**: windowed rendering (only visible pages), passive listeners, batched state updates, `requestIdleCallback` for parse.

---

## 11) Project Structure

```
apps/desktop/
  ├─ main/            # Electron main (IPC, FS)
  ├─ preload/         # contextBridge API
  └─ renderer/        # React app
      ├─ components/workbench/*
      ├─ viewers/pdf/PdfJsViewer.tsx
      ├─ services/AnnotationService.ts
      ├─ services/CommandRegistry.ts
      ├─ services/EventBus.ts
      ├─ services/AIBroker.ts
      └─ panels/{comments,ai-chat}/*
packages/
  ├─ types/           # shared TS types
  └─ utils/           # DOM, parsing, math render helpers
```

---

## 12) Dependencies (pin majors)

- **electron** `^31`, **vite** `^5`, **react** `^18`, **typescript** `^5`
- **pdfjs-dist** `^4`
- **pdfAnnotate** (git dependency to highkite/pdfAnnotate commit SHA)
- **@devbookhq/splitter**, **react-arborist**
- **remark**, **remark-gfm**, **remark-math**, **rehype-katex**, **katex`, **dompurify\*\*
- **vitest**, **@playwright/test**, **eslint**, **prettier**

---

---

## 14) Appendix — Key Contracts

**EventBus**

```ts
type AppEvent =
  | { type: 'viewer.ready'; uri: string }
  | { type: 'viewer.selectionChanged'; uri: string; anchors: AnchorInput[] }
  | { type: 'viewer.annotationClicked'; uri: string; annotId: string }
  | { type: 'thread.updated'; uri: string; threadId: string };
```

**Anchor Types**

```ts
interface Quad {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  x4: number;
  y4: number;
}
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface AnchorInput {
  page: number;
  quads?: Quad[];
  rect?: Rect;
}
```

**ThreadViewModel**

```ts
interface ThreadViewModel {
  docUri: string;
  threadId: string;
  comments: { id: string; author: string; time: string; raw: string }[];
  anchors: { annotId: string; page: number }[];
}
```

This document is the single source of truth for implementation choices; engineers should not substitute alternatives without a change request.

- essentially a mini chat living inside a comment/annotation
- (all read/write will still follow the standard format described above)
- must be fast

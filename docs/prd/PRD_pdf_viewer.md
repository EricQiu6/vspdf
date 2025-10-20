
![[Pasted image 20251007041303.png|500]]
# PRD — VS Code-Style PDF Workspace (pdfAnnotate Edition)

**Decision:** Build on **pdfAnnotate** as the free, low-level annotation engine.  
**Core stance:** Keep data portable and simple. Threads are stored as **plain text** inside standard PDF annotations. AI is an **invisible** participant. No collaboration workflows (resolve/accept) in MVP.  
**This revision adds:** thread-link model and workflow, the full **Thread Panel** viewer/editor spec (plain-text parsing → Markdown/KaTeX rendering), and clarified scoping & interactions.

---

## 1) Product Goals

- A **workbench** for reading/research like VS Code: multi-pane splits, tabs, sidebars, panels.
    
- **Inline marks** (highlights/pins) render in the PDF viewer; **full discussions** live in a docked **Comments Panel**.
    
- **Minimalist import/export:** threads encoded as plain text in the PDF’s annotation `Contents` (and optionally XFDF). Round-trip works in any PDF reader.
    

**Out of scope (MVP):** workspace persistence, collaboration states (resolve/accept), AI badges/provenance UI, non-PDF formats, heavy re-anchoring heuristics.

---

## 2) Target Users & Jobs

- **Researchers/engineers:** open multiple PDFs, split views, annotate, discuss math/text, ask questions.
    
- **Reviewers/collaborators (outside our app):** open annotated PDFs in any reader; see highlights and the plain-text notes; optionally send back the same PDF for re-import.
    

---

## 3) Architecture Overview

```
App Shell (Electron/Web)
└─ Workbench
   ├─ Sidebar (Explorer)
   ├─ EditorArea
   │   └─ EditorGroups (panes) → Tabs → Viewer
   │                         └─ PdfJsViewer + pdfAnnotate (engine)
   ├─ PanelContainer (bottom/right)
   │   └─ Comments Panel (thread list + viewer/editor)
   └─ Status Bar
```

**Core services**

- **CommandRegistry** (actions/shortcuts), **ContextMenuService**, **EventBus**
    
- **ViewerRegistry** (‘pdf’ → `PdfJsViewer`)
    
- **AnnotationService** (threads, anchors, transcript I/O)
    
- _(Deferred)_ **PersistenceService**, **Indexer/AIBroker**, **PolicyService**
    

---

## 4) Key Decisions

### 4.1 Viewer & Engine

- **Renderer:** PDF.js (paging, zoom, text layer)
    
- **Annotations:** **pdfAnnotate** for creating, editing, reading, and writing standard PDF annotations (highlights, text notes, shapes).
    
- The **Viewer** hosts pdfAnnotate; **thread state** lives in AnnotationService + the PDF’s annotation `Contents`.
    

### 4.2 Threads vs. Anchors (separation of concerns)

- **Anchors** (where): PDF annotation geometry (rect/quadpoints). One anchor is _canonical_; others are _links_.
    
- **Thread** (what): the discussion. Stored as **plain-text transcript** on the canonical anchor’s `Contents`.
    
- **Comments Panel:** parses transcript → renders Markdown/KaTeX → handles editing/append → writes updated transcript back.
    

---

## 5) Minimalist Import/Export (Authoritative)

### 5.1 Transcript format (canonical anchor’s `Contents`)

```
[thread <id>]
@<author> <ISO8601>
<comment text...>

@<author> <ISO8601>
<comment text...>
@end
```

- One **canonical** anchor per thread stores the full transcript.
    
- All **secondary** anchors store:  
    `[thread-link <id>]`
    
- **Optional hint** (off by default):  
    `[text-hint] <short excerpt for relocation>`
    

**AI is invisible:** the system replies as a normal author, e.g. `@assistant`.

### 5.2 Export targets

- **Annotated PDF (primary):** standard PDF annotations + plain-text `Contents`.
    
- **XFDF sidecar (optional):** same plain-text content for interop/versioning.
    
- **Native `.ann.json` (optional):** our internal backup (not required).
    

### 5.3 Import behavior

- Parse all page annotations via pdfAnnotate.
    
- If `[thread …] … @end` → create/update thread; bind to that anchor’s geometry.
    
- If `[thread-link …]` → attach this anchor to the existing thread.
    
- Deduplicate by `(docUri, threadId, normalized text, timestamp ±ε, geometry)`.
    
- If geometry mismatch (revised PDFs), attach to nearest region on same page and flag as “approximate.”
    

---

## 6) Thread-Link Model & Workflow

**What is a thread link?** A lightweight marker that says “this anchor belongs to thread `<id>`; the canonical transcript lives on a different anchor.”

**Why:** avoid duplicate transcripts, support many-to-one mapping (multiple highlights → one discussion), keep PDFs interoperable.

**Use cases**

- **Multi-page concept:** page 2 intro, page 10 equation, page 14 appendix — all point to one discussion.
    
- **Figure + caption + paragraph:** figure holds the canonical transcript; caption/paragraph are links.
    
- **Definition & occurrences:** thread on the definition; links on re-uses.
    

**Rules**

- Exactly **one canonical** per thread. If deleted, promote a link to canonical (move transcript).
    
- Short, human-friendly thread ids (unique per doc).
    
- Cross-document links are future work (namespace later if needed).
    

---

## 7) Comments Panel (Viewer/Editor) — Spec

### 7.1 Responsibilities

1. **Parse** plain-text transcript into comments.
    
2. **Render** comments in **Markdown + KaTeX** (display only; we store plain text).
    
3. **Edit/append** comments → write updated transcript back to canonical anchor.
    
4. **Coordinate** with viewer anchors (reveal/flash, add links, etc.).
    

### 7.2 Transcript grammar (line-based)

```
THREAD      ::= "[thread " ID "]" NL BODY "@end"
BODY        ::= (ENTRY)+
ENTRY       ::= HEADER NL (TEXTLINE)* NL?
HEADER      ::= "@" AUTHOR SP ISO8601
TEXTLINE    ::= any line not starting with "@" or "[thread" or "@end"
ID          ::= [a-z0-9_-]+
AUTHOR      ::= [A-Za-z0-9._-]+
```

- Thread link: `[thread-link ID]` (no body).
    
- Optional hints: `[text-hint] ...` (ignored by panel).
    

**Parser behavior**

- Ignore leading/trailing whitespace; tolerate missing `@end` (EOF terminates).
    
- If malformed timestamp → use `now()` and flag as unverified.
    

### 7.3 Rendering pipeline

- Treat each comment’s text as **Markdown** with math:
    
    - Inline: `*italic*`, `**bold**`, `` `code` ``, `[link](url)`.
        
    - Lists: `- item`.
        
    - Math: inline `$...$`, block `$$...$$` → **KaTeX**.
        
- Sanitize HTML; allow KaTeX output only.
    

### 7.4 Panel UI (ASCII)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Comments ▾  [Focused doc | This group | All open | Workspace]  [∑] │
│ Filter: [search…]  [author v] [has math] [has links] [unread]      │
├─────────────────────────────────────────────────────────────────────┤
│ ▸ Thread 8f2b1  | p.10  | 2 anchors                                 │
│   eric  2025-10-08 04:12  The update step looks off by a sign…      │
│   assistant  2025-10-08 04:14  It’s correct; compare to m̂…         │
│                                                                     │
│ ▸ Thread fig42   | p.3   | 3 anchors                                 │
│   eric  12:03  Is the y-axis log-scaled? The text implies…          │
│                                                                     │
│ (…group by doc when scope ≠ Focused)                                 │
├─────────────────────────────────────────────────────────────────────┤
│ Thread 8f2b1 — 2 anchors: p.2, p.10                                 │
│ ─────────────────────────────────────────────────────────────────── │
│ eric • 2025-10-08 04:12                                             │
│ The update step looks off by a sign near Eq. (5).                   │
│                                                                     │
│ assistant • 2025-10-08 04:14                                        │
│ It’s correct; compare to Adam’s bias-corrected m̂:                  │
│ $$ \hat{m}_t = \frac{m_t}{1-\beta_1^t} $$                           │
│ ─────────────────────────────────────────────────────────────────── │
│ Reply:                                                              │
│ [ plain text (Markdown; $…$ for math)                         ]     │
│ [ Send ]  [ Ask assistant ]                                         │
└─────────────────────────────────────────────────────────────────────┘
```

**Inline tooltip on hover**

```
+---------------------------+
| 8f2b1 • eric (p.10)       |
| The update step looks…    |
| [Open thread]             |
+---------------------------+
```

### 7.5 Interactions (events/commands)

**Viewer (pdfAnnotate) → Panel (EventBus)**

- `annotationClicked({ docUri, annotId })` → Panel locates `threadId` via AnnotationService; opens thread; highlights active anchor.
    
- `selectionChanged({ docUri, anchors })` → Panel enables “New thread” composer with those anchors.
    

**Panel → Viewer (CommandRegistry)**

- `revealAnchor({ docUri, threadId, anchorPref? })` → focus tab, `goToPage`, flash highlight.
    
- `createThread({ docUri, anchors, firstComment })` → create canonical annotation + transcript; add `[thread-link]` anchors for the rest.
    
- `appendComment({ docUri, threadId, comment })` → reload canonical transcript, append `@author ISO`, write back.
    

**AnnotationService**

- Maps `annotId ↔ threadId`.
    
- Emits `annotationUpdated(threadId)` to refresh viewer overlays/tooltips.
    

---

## 8) Scoping (Comments Panel)

- **Default:** **Focused document**.
    
- **Switcher:** _Focused doc_ ▸ _This group_ ▸ _All open_ ▸ _Workspace_.
    
- When scope ≠ Focused doc, list groups by document title.
    
- Each thread item shows page no. and anchor count.
    

---

## 9) Context Menus (command-driven)

- **Sidebar (files):** Open, Open to side, Rename, Reveal in Finder.
    
- **Tab (EditorGroup):** Close, Close others, Move to new group, Split.
    
- **EditorGroup (pane):** Split, Focus left/right, Close group.
    
- **Viewer (mark):** Open thread, Add link to existing thread…, Copy thread id, Delete anchor.
    
- **Panel (thread header):** Copy thread id, Jump to next anchor, Promote this anchor to canonical.
    
- **Panel (comment):** Copy text; _(optional later: edit/delete)_.
    

---

## 10) Non-Functional Requirements

- **Performance:** tab switch < 50 ms; overlay render < 16 ms/frame; import 1k annots < 2 s.
    
- **Robustness:** if parsing fails, show raw `Contents` and offer “Repair”.
    
- **Accessibility:** keyboard nav; screen-reader labels for marks and threads.
    
- **Security:** local by default; network only when user configures XFDF endpoints.
    
- **Licensing:** pdfAnnotate (MIT) kept isolated; our code remains permissive.
    

---

## 11) Risks & Mitigations

- **Rotated pages / PDF quirks:** limit certain shapes if needed; prefer highlights/pins first.
    
- **Transcript bloat in `Contents`:** soft cap; suggest XFDF for long docs; “Load more” in panel.
    
- **PDF revisions shifting layout:** approximate anchoring with page-local search + optional `[text-hint]`.
    

---

## 12) Milestones

**S1 — Shell + Annotations MVP**

- Workbench (Sidebar, EditorArea, EditorGroups, Tabs) completed from [[PRD_vscode_layout]]

this document implements:
- PdfJsViewer + pdfAnnotate
    
- Create/edit/delete highlight & pin; hover tooltip
    
- Comments Panel (Focused doc), parser/renderer (Markdown + KaTeX)
    
- Thread-link workflow (canonical + links)
    
- Export **Annotated PDF**; Import annotated PDF
    

**S2 — Scopes + Commands**

- Panel scope switcher
    
- Command palette + right-click menus
    
- Wrap annotation ops in CommandRegistry for basic undo/redo
    

**S3 — Stress testing
    
- Perf passes (≥300 annotations, 500-page PDFs)
    

_(Workspace persistence, AI prompts beyond “Ask assistant”, and cross-doc indexer come later.)_

---

## 13) Acceptance Criteria (S1)

- Create a thread with one canonical highlight and two `[thread-link]` anchors on other pages.
    
- Panel parses and renders comments (Markdown + KaTeX) from the **plain-text** transcript.
    
- Clicking a highlight opens the thread; clicking a thread reveals and flashes the anchor.
    
- Export to Annotated PDF; viewing in Preview/Acrobat shows the same highlights and readable note text.
    
- Re-import restores the same threads and anchors without duplication.
    

---

## 14) Glossary

- **EditorGroup (pane):** a split area hosting tabs.
    
- **Viewer:** PDF.js component that hosts pdfAnnotate.
    
- **Annotation (anchor):** standard PDF mark (highlight/pin/shape) with geometry.
    
- **Thread:** conversation stored as plain text in `[thread <id>] … @end`.
    
- **Thread link:** `[thread-link <id>]` on secondary anchors linking back to the same conversation.
    
- **Canonical anchor:** the single anchor carrying the full transcript.
    

---

## 15) Appendix — Parser Sketch (for engineering)

```
function parseTranscript(txt):
  lines = split(txt)
  if not startsWith(lines[0], "[thread "): return []
  i = 1
  comments = []
  while i < len(lines):
    if lines[i] == "@end": break
    if not lines[i].startsWith("@"): i++; continue
    (author, time) = parseHeader(lines[i]) or ("unknown", now())
    i++
    buf = []
    while i < len(lines) and not lines[i].startsWith("@") and lines[i] != "@end":
      if lines[i].startsWith("[thread ") or lines[i].startsWith("[text-hint]"): i++; continue
      buf.push(lines[i]); i++
    raw = join(buf).trim()
    comments.push({id: stableId(author,time,raw), author, time, raw, markdown: raw})
  return comments
```

---

### Notes for the next revision

- Add the **Thread-Link Use Cases** (multi-page, figure+caption, definition & occurrences) to the “Use Cases” section with tiny examples (done above).
    
- When we introduce persistence and AI prompts, we’ll add sections that preserve this plain-text contract and the viewer/panel separation.
Here’s a concise **`CLAUDE.md`** you can drop at the repo root. It follows Anthropic’s guidance (keep it short, human-readable, auto-ingested; use it to brief Claude on goals, stack, workflows, and rules). ([Anthropic](https://www.anthropic.com/engineering/claude-code-best-practices "Claude Code Best Practices \\ Anthropic"))

---

# Project Brief — VS Code-Style PDF Workspace

**Goal.** A desktop research IDE with a VS Code-like workbench: multi-pane PDF reading, inline highlights, and a docked Comments panel. Threads are plain-text transcripts embedded in standard PDF annotations; AI replies appear as normal comments (`@assistant`).

**Non-negotiables.**

- **Stack:** Electron 31, React 18, Vite, TypeScript.
- **PDF:** `pdfjs-dist@^4` for rendering; **pdfAnnotate** for create/update/delete of standard PDF annotations.
- **Threads:** One **canonical** annotation per thread stores the transcript in `Contents` using:

  ```
  [thread <id>]
  @<author> <ISO8601>
  <text…>

  @<author> <ISO8601>
  <text…>
  @end
  ```

  Secondary anchors: `[thread-link <id>]`. No HTML stored; render as Markdown + KaTeX in the panel.

**How to help (you = Claude).**

- Follow the **Tech Stack Spec** exactly; do not substitute libraries without an explicit request.
- When adding features, wire actions through **CommandRegistry** and UI context menus.
- For comments: parse transcript → render (Markdown+KaTeX) → append new entries → write back to canonical annotation’s `Contents`.
- Keep changes modular (Viewer vs Panel vs Services). Ask before modifying architecture.

**Where to read next (authoritative).**

- `docs/tech/Tech_Stack.md` (build plan; interfaces)
- `docs/prd/PRD_vscode_layout.md` (workbench UX)
- `docs/prd/PRD_pdf_viewer.md` (threads, import/export)
- `docs/design/Design_Document.md` (system interactions)

**Run & test.**

- Install: `pnpm i`
- Dev app: `pnpm dev` (Electron + Vite)
- Tests: `pnpm test` (Vitest) / `pnpm e2e` (Playwright)
- Lint/format: `pnpm lint` / `pnpm fmt`

**Guardrails.**

- Do **not** store HTML in transcripts; plain text only.
- Respect Electron security: `contextIsolation: true`, no `nodeIntegration`; sanitize rendered HTML (DOMPurify).

---
- use context7 to search up-to-date libraries and documentation
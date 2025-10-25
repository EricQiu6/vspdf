# Architecture Philosophy

**Guiding principle:** _Build for change without rewrite._

---

## Core Tenets

### 1. **Immutability First**
- All state changes through reducers (pure functions)
- No `useRef` for state (only DOM refs, performance optimization)
- No mutations—spread operators, `Array.map/filter`, object spread
- If you need mutable escape hatch, design is wrong

### 2. **Single Source of Truth**
- Reducer = canonical state
- No parallel state systems (refs, local vars, closures)
- Derived state computed, not stored
- UI renders from state, doesn't track state

### 3. **Type Safety as Architecture**
- Input types ≠ domain types (e.g., `DocTabInput` vs `DocTab`)
- Factory pattern: reducers add IDs, validate, transform
- `unknown` over `any`, discriminated unions, exhaustive checks
- Types document contracts, not just prevent errors

### 4. **Stable Contracts, Pluggable Implementations**
- Interfaces frozen early (e.g., `ViewerHandle`, `ViewerProps`)
- Registry pattern for extensibility (ViewerRegistry, CommandRegistry)
- Dependency injection via props/parameters, not imports (except singletons)
- StubViewer proves interface correct before real implementation

### 5. **Testability = Correctness**
- Pure functions > classes with state
- Factory functions for complex initialization
- Test logic independently of UI (reducers testable without React)
- If hard to test, refactor until easy

### 6. **Idempotency > Imperativity**
- Operations safe to repeat (duplicate tab prevention)
- StrictMode friend, not enemy
- Effects declare dependencies honestly
- "Run once" guard = code smell

### 7. **Explicit Over Magic**
- No hidden coupling (import graphs, module side effects minimal)
- Data flow visible (EventBus pub/sub over callbacks)
- Module-level init for singletons, not effect-based
- Comments explain _why_, code explains _what_

### 8. **Separation by Concern**
```
UI Components   → Render, events, layout
Services        → Business logic, stateless utilities
Reducers        → State transitions, validation
Types           → Contracts, domain boundaries
```

No mixing. Components don't contain logic. Services don't render.

### 9. **Optimize for Deletion**
- Features = additive, not invasive
- Temp scaffolding clearly marked (e.g., `createTestEditorState`)
- Decouple: removing feature shouldn't break others
- Delete code > maintain dead code

### 10. **Composition > Inheritance**
- Small, focused components
- HOCs/hooks for cross-cutting concerns
- Render props for inversion of control
- No class hierarchies

---

## Patterns in Use

| Pattern | Where | Why |
|---------|-------|-----|
| **Reducer** | EditorAreaState | Predictable state, time-travel debug, testable |
| **Registry** | ViewerRegistry | Pluggable viewers without recompile |
| **Factory** | createTestEditorState | Pure initialization, reusable, testable |
| **Singleton** | eventBus, viewerRegistry | Global coordination, module-level init |
| **Input/Domain Split** | DocTabInput → DocTab | Validation boundary, ID generation |
| **Lazy Init** | useReducer 3rd param | StrictMode-safe, runs once, optimized |
| **Pub/Sub** | EventBus | Decouple components, extensible |
| **Data Attributes** | `data-ui-role="tab"` | Context menus, testing, styling hooks |

---

## Anti-Patterns

❌ **Mutable refs for state** → Use reducer
❌ **`any` type** → Use `unknown` + type guards
❌ **Direct DOM manipulation** → Declarative React
❌ **Nested ternaries** → Extract to functions
❌ **God components** → Compose smaller pieces
❌ **Side effects in render** → `useEffect`
❌ **Magic strings** → Discriminated unions
❌ **Prop drilling > 2 levels** → Context or EventBus

---

## Decision Framework

When choosing between options, ask:

1. **Can I test this in isolation?** (If no → refactor)
2. **Is state mutation-free?** (If no → find pure alternative)
3. **Are types honest?** (If `any` → make precise)
4. **Can I delete this without cascading changes?** (If no → decouple)
5. **Would StrictMode break this?** (If yes → not idempotent enough)
6. **Does this violate single responsibility?** (If yes → split)

---

## For Coding Agents

When implementing features:

1. **Read types first** → They define contracts
2. **Reducer for state** → Never mutate, always through actions
3. **Factory for complex init** → Pure functions, testable
4. **Stub before real** → Prove interface works (StubViewer pattern)
5. **Test logic separately** → Don't test React, test your logic
6. **Module-level for singletons** → Not in effects
7. **Document deviations** → If breaking pattern, explain why

---

## Tech Stack Constraints

- **Electron 31** + **React 18** + **TypeScript strict**
- **Vite** (no Webpack magic, explicit imports)
- **CSS Modules** (scoped styles, no CSS-in-JS)
- **Vitest** (unit) + **Playwright** (e2e)
- **No class components** (hooks only)
- **No Radix where custom better** (tabs, because reducer already manages content)

---

## References

- Design: `/docs/design/Design_Document.md`
- Tech Stack: `/docs/tech/Tech_Stack.md`
- Patterns: `/docs/implementation/State_Initialization_Pattern.md`
- Project Brief: `/CLAUDE.md`

---

**Philosophy TL;DR:**

> _Immutable state through reducers. Types define boundaries. Pure functions everywhere testable. Composition over complexity. If StrictMode breaks it, fix the design._

# Keybinding System Architecture

**Document Version:** 1.0
**Last Updated:** 2025-11-01
**Status:** Partial Implementation (Core Complete, When Clauses Incomplete)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current System Design](#current-system-design)
3. [What Works Today](#what-works-today)
4. [The Incomplete When Clause System](#the-incomplete-when-clause-system)
5. [What's Left to Complete](#whats-left-to-complete)
6. [Guidance for Future Developers](#guidance-for-future-developers)
7. [API Reference](#api-reference)

---

## Executive Summary

The keybinding system implements VS Code-style keyboard shortcuts with two-layer filtering:

**Layer 1: Keybinding When Clauses (INCOMPLETE)**
- String expressions like `"editorFocus && !inputFocus"`
- Evaluates against simple key-value context (UI state)
- Parser exists and is tested, but **not wired to commands**

**Layer 2: Command Predicates (COMPLETE & WORKING)**
- Function predicates like `(ctx) => !!ctx.activeTab`
- Evaluates against rich objects (CommandContext)
- Fully functional and used by all commands today

### Current Status

| Feature | Status | Works? |
|---------|--------|--------|
| Keyboard shortcuts | ✅ Complete | ✅ Yes |
| Multi-chord sequences (Cmd+K Cmd+P) | ✅ Complete | ✅ Yes |
| Command predicates | ✅ Complete | ✅ Yes |
| Command palette | ✅ Complete | ✅ Yes |
| Context tracking (EditorGroup, etc.) | ✅ Complete | ✅ Yes |
| When clause parser | ✅ Complete | ✅ Yes (tested) |
| When clause → command wiring | ❌ Incomplete | ⚠️ No |
| User-defined keybindings | ❌ Not started | ❌ No |

**Key Constraint:** Commands use function predicates, but when clauses need string expressions. There's no automatic conversion between them.

---

## Current System Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     User Presses Key                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              GlobalKeyboardListener (React)                  │
│  - Captures window keydown events                            │
│  - Calls keybindingService.handleKeyDown()                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   KeybindingService                          │
│  - Converts event to chord string                            │
│  - Tracks chord sequences (with 5s timeout)                  │
│  - Gets ContextKeyMap from contextKeyService                 │
│  - Calls KeybindingResolver.resolve()                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  KeybindingResolver                          │
│  ⚠️ INCOMPLETE: Should filter by when clause                │
│  Currently: Just matches chord, ignores when clause          │
│  Returns: Found | MoreChordsNeeded | NoMatch                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    If Found (keybinding matched)
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              KeybindingService (continued)                   │
│  - Gets CommandContext from commandContextProvider           │
│  - Checks: commandRegistry.canExecute(commandId, context)    │
│  - If can execute:                                           │
│    * event.preventDefault()  ← Consume key                   │
│    * event.stopPropagation()                                 │
│    * Execute command                                         │
│  - If cannot execute:                                        │
│    * Don't consume event (key propagates)                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    CommandRegistry                           │
│  - Checks command.when(commandContext) predicate             │
│  - If true: Executes command.handler(commandContext)         │
│  - If false: Returns without executing                       │
└─────────────────────────────────────────────────────────────┘
```

### Two Context Systems

The system uses **two separate context types** that serve different purposes:

#### 1. ContextKeyMap (for Keybinding When Clauses)

**Purpose:** Simple UI state for keybinding filtering
**File:** `services/context/ContextKeyService.ts`
**Type:** `Record<string, string | number | boolean | undefined>`

```typescript
// Example ContextKeyMap
{
  editorFocus: true,
  inputFocus: false,
  activeGroupId: 'group-abc',
  viewerType: 'stub',
  isMac: true,
  isDevelopment: true
}
```

**Updated by:**
- `EditorGroup` - Sets `editorFocus`, `activeGroupId`
- `StubViewer` - Sets `viewerType`, `viewerUri`
- `defaultContextKeys` - Sets platform keys (`isMac`, etc.)

**Consumed by:**
- ⚠️ **Should be:** KeybindingResolver when clauses
- **Actually:** Not consumed (when clauses not wired)

#### 2. CommandContext (for Command Predicates)

**Purpose:** Rich application objects for command execution
**File:** `services/CommandContextProvider.ts`
**Type:** From `@vspdf/types`

```typescript
// Example CommandContext
{
  activeGroup: 'group-abc',
  activeTab: { id: '...', uri: '...', title: '...', viewer: 'stub' },
  activeTabIndex: 0,
  editorAreaOps: {
    splitRight: (groupId) => { ... },
    closeTab: (groupId, index) => { ... },
    // ... methods
  }
}
```

**Updated by:**
- `EditorArea` - Updates on every state change

**Consumed by:**
- `CommandRegistry.canExecute()` - Check if command can run
- `CommandRegistry.execute()` - Pass to command handler

### The Check-Before-Consume Pattern

**Critical fix applied 2025-11-01:**

```typescript
// KeybindingService.handleKeyDown()
if (result.type === 'Found') {
  const commandContext = commandContextProvider.getContext();

  // CHECK FIRST ✅
  if (commandRegistry.canExecute(result.commandId, commandContext)) {
    // Only consume if command can actually execute
    event.preventDefault();
    event.stopPropagation();

    commandRegistry.execute(result.commandId, commandContext);
  } else {
    // Don't consume - let event propagate
  }
}
```

**Why this matters:**
- Without this: Keys get swallowed even when commands can't execute
- With this: Keys only consumed when command successfully executes
- Result: Better UX, keys available for fallback handlers

---

## What Works Today

### ✅ Working Features

#### 1. Basic Keyboard Shortcuts

```typescript
// Register a command with keybinding
commandRegistry.register({
  id: 'workbench.action.splitRight',
  handler: (ctx) => {
    ctx.editorAreaOps.splitRight(ctx.activeGroup);
  },
  when: (ctx) => !!ctx.activeGroup && !!ctx.editorAreaOps,
  keybinding: 'Cmd+\\',
});

// Automatically registered by registerDefaultKeybindings()
// Press Cmd+\ → Executes if predicate passes
```

**Status:** ✅ Fully working

#### 2. Multi-Chord Sequences

```typescript
// Command with multi-chord keybinding
commandRegistry.register({
  id: 'workbench.action.focusNextGroup',
  handler: (ctx) => { /* ... */ },
  when: (ctx) => !!ctx.activeGroup,
  keybinding: 'Cmd+K Cmd+Right',  // ← Two chords
});

// Press Cmd+K, then within 5 seconds press Cmd+Right
// → Executes
```

**Status:** ✅ Fully working (timeout handled, chord tracking works)

#### 3. Command Predicates (Function-Based)

```typescript
// Command only executes when predicate passes
commandRegistry.register({
  id: 'workbench.action.closeActiveEditor',
  handler: (ctx) => {
    ctx.editorAreaOps.closeTab(ctx.activeGroup, ctx.activeTabIndex);
  },
  when: (ctx) => !!ctx.activeTab && !!ctx.editorAreaOps,
  //     ^^^^^^^^ Function predicate checks CommandContext
});

// System checks predicate BEFORE consuming key event
// If predicate fails, key propagates to other handlers
```

**Status:** ✅ Fully working

#### 4. Command Palette

```typescript
// Opens with Cmd+Shift+P
// - Fuzzy search
// - Shows keybindings
// - Filters by command.when predicate
// - Executes on Enter
```

**Status:** ✅ Fully working

#### 5. Context Tracking

Components set context keys that are available in ContextKeyMap:

```typescript
// In EditorGroup.tsx
const [, setEditorFocus] = useContextKey('editorFocus', false, groupRef);
const [, setActiveGroup] = useContextKey('activeGroupId', '', groupRef);

useEffect(() => {
  if (isActive) {
    setEditorFocus(true);
    setActiveGroup(groupState.id);
  }
}, [isActive]);
```

**Status:** ✅ Context keys are set correctly
**Problem:** ⚠️ Not consumed by keybinding when clauses

---

## The Incomplete When Clause System

### What Exists (Fully Implemented & Tested)

#### 1. ContextKeyExpression Parser ✅

**File:** `services/context/ContextKeyExpression.ts`
**Tests:** 17/17 passing in `__tests__/ContextKeyExpression.test.ts`

Parses VS Code-style when clause strings:

```typescript
// Supported syntax
ContextKeyExpression.parse('editorFocus')
ContextKeyExpression.parse('!inputFocus')
ContextKeyExpression.parse('editorFocus && !inputFocus')
ContextKeyExpression.parse('viewerType == pdf')
ContextKeyExpression.parse('lineNumber > 0')
ContextKeyExpression.parse('resourceExtname =~ /\\.(ts|js)$/')
ContextKeyExpression.parse('viewColumn in [1, 2, 3]')

// All work correctly, full grammar implemented
```

**What it does:**
- Parses string → AST (ContextKeyExpression tree)
- Evaluates AST against ContextKeyMap
- Returns boolean (matches or not)

**Status:** ✅ Complete, tested, ready to use

#### 2. ContextKeyService ✅

**File:** `services/context/ContextKeyService.ts`

Manages hierarchical context with scoping:

```typescript
// Global context
contextKeyService.setValue('isMac', true);

// Scoped context (inherits from parent)
const scoped = contextKeyService.createScoped(element);
const editorFocus = scoped.createKey('editorFocus', false);
editorFocus.set(true);

// Get flattened context
const context = contextKeyService.getContext();
// { isMac: true, editorFocus: true, ... }
```

**Status:** ✅ Complete and working

#### 3. React Hooks ✅

**Files:** `hooks/useContextKey.ts`

```typescript
// In component
const [, setEditorFocus] = useContextKey('editorFocus', false, elementRef);

// Sets value in scoped context
setEditorFocus(true);
```

**Status:** ✅ Complete and working

#### 4. KeybindingResolver Has When Clause Support ✅

**File:** `services/keybindings/KeybindingResolver.ts`

```typescript
// resolve() method DOES filter by when clause
const contextMatched = chordMatched.filter((kb) => {
  if (!kb.when) return true;

  const expr = ContextKeyExpression.parse(kb.when);
  if (!expr) return true;

  return expr.evaluate(context);  // ← This works!
});
```

**Status:** ✅ Code exists, tested, functional

### What's Missing (The Gap)

#### ❌ Commands Don't Provide String When Clauses

**The Problem:**

```typescript
// In editorCommands.ts
export const splitRightCommand: Command = {
  id: 'workbench.action.splitRight',
  handler: (ctx) => { /* ... */ },
  when: (ctx) => !!ctx.activeGroup,  // ← FUNCTION
  keybinding: 'Cmd+\\',
};

// In defaultKeybindings.ts
export function registerDefaultKeybindings() {
  commands.forEach(cmd => {
    if (cmd.keybinding) {
      keybindingService.registerKeybinding({
        id: `default.${cmd.id}`,
        commandId: cmd.id,
        key: cmd.keybinding,
        when: serializeWhenClause(cmd.when),  // ← Can't convert function to string!
      });
    }
  });
}

// serializeWhenClause() returns undefined
// So keybindings registered with when: undefined
```

**Root Cause:** Type mismatch

```typescript
// Command interface
interface Command {
  when?: (ctx: CommandContext) => boolean;  // ← Function
}

// Keybinding interface
interface Keybinding {
  when?: string;  // ← String
}
```

### What Should Work (Design Intent)

When fully implemented, this should work:

```typescript
// 1. Command stores BOTH function and string
export const splitRightCommand: Command = {
  id: 'workbench.action.splitRight',
  handler: (ctx) => { /* ... */ },
  when: (ctx) => !!ctx.activeGroup,           // ← Function for runtime
  whenClause: 'activeGroupId',                // ← String for keybindings
  keybinding: 'Cmd+\\',
};

// 2. Keybinding registered with string when clause
keybindingService.registerKeybinding({
  id: 'default.splitRight',
  commandId: 'workbench.action.splitRight',
  key: 'Cmd+\\',
  when: 'activeGroupId',  // ← Now has when clause!
});

// 3. Two-layer filtering
Press Cmd+\
→ Layer 1: Check whenClause against ContextKeyMap
  - ContextKeyMap has activeGroupId: 'group-abc'
  - Keybinding matches ✓
→ Layer 2: Check when predicate against CommandContext
  - CommandContext has activeGroup: 'group-abc'
  - Command can execute ✓
→ Execute command
```

### Why Two Layers Are Valuable

| Scenario | Layer 1 (When Clause) | Layer 2 (Predicate) | Result |
|----------|----------------------|---------------------|--------|
| Editor focused, tab open | `editorFocus` ✓ | `activeTab` ✓ | ✅ Executes |
| Editor focused, no tab | `editorFocus` ✓ | `activeTab` ✗ | ⚠️ Key not consumed |
| Sidebar focused | `editorFocus` ✗ | (never checked) | ✅ Key propagates |

**Benefits:**
1. **Early exit:** Don't build CommandContext if UI state is wrong
2. **Multiple bindings:** Same key can trigger different commands in different contexts
3. **User customization:** Users can override keybindings with string when clauses
4. **Better UX:** Keys only consumed when they should be handled

---

## What's Left to Complete

### Option 1: Dual Storage (Recommended)

**Effort:** Medium
**Impact:** Enables full when clause system

#### Step 1: Update Command Type

```typescript
// packages/types/index.ts
export interface Command {
  id: string;
  handler: (ctx: CommandContext) => void | Promise<void>;
  when?: (ctx: CommandContext) => boolean;  // Keep for runtime
  whenClause?: string;  // ← ADD THIS: String for keybindings
  keybinding?: string;
}
```

#### Step 2: Update Command Definitions

```typescript
// services/commands/editorCommands.ts
export const splitRightCommand: Command = {
  id: 'workbench.action.splitRight',
  handler: (ctx) => {
    ctx.editorAreaOps.splitRight(ctx.activeGroup);
  },
  when: (ctx) => !!ctx.activeGroup && !!ctx.editorAreaOps,
  whenClause: 'activeGroupId && editorFocus',  // ← ADD THIS
  keybinding: 'Cmd+\\',
};

// Apply to all 9 commands in editorCommands.ts
```

**Mapping Guide:**

| Function Predicate | String When Clause |
|-------------------|--------------------|
| `(ctx) => !!ctx.activeGroup` | `'activeGroupId'` |
| `(ctx) => !!ctx.activeTab` | `'activeGroupId'` (tab exists if group exists) |
| `(ctx) => !!ctx.editorAreaOps` | Always true, omit |
| `(ctx) => ctx.activeGroup && ctx.editorAreaOps` | `'activeGroupId'` |

#### Step 3: Update defaultKeybindings.ts

```typescript
// services/keybindings/defaultKeybindings.ts
export function registerDefaultKeybindings(): Disposable[] {
  const commands = commandRegistry.getAll();
  const disposables: Disposable[] = [];

  for (const cmd of commands) {
    if (cmd.keybinding) {
      const disposable = keybindingService.registerKeybinding({
        id: `default.${cmd.id}`,
        commandId: cmd.id,
        key: cmd.keybinding,
        when: cmd.whenClause,  // ← Use whenClause instead of trying to convert
      });
      disposables.push(disposable);
    }
  }

  return disposables;
}
```

#### Step 4: Test

```bash
pnpm -w test
# Should pass - no breaking changes

pnpm dev
# Press Cmd+\ in editor → works
# Press Cmd+\ outside editor → doesn't consume key
```

**Estimated time:** 2-3 hours

---

### Option 2: Context Key Builder (Advanced)

**Effort:** High
**Impact:** Cleaner API, prevents divergence

Create a builder that generates both function and string:

```typescript
// New file: services/context/ContextKeyBuilder.ts
class ContextKeyBuilder {
  static has(key: string): ContextKeyExpr {
    return new HasKeyExpr(key);
  }

  static equals(key: string, value: any): ContextKeyExpr {
    return new EqualsExpr(key, value);
  }

  static and(...exprs: ContextKeyExpr[]): ContextKeyExpr {
    return new AndExpr(exprs);
  }

  static not(expr: ContextKeyExpr): ContextKeyExpr {
    return new NotExpr(expr);
  }
}

class ContextKeyExpr {
  // Generate function predicate
  asPredicate(): (ctx: CommandContext) => boolean {
    // Convert to function
  }

  // Generate string when clause
  asString(): string {
    // Convert to string
  }
}

// Usage in commands
const when = ContextKeyBuilder.and(
  ContextKeyBuilder.has('activeGroupId'),
  ContextKeyBuilder.has('editorFocus')
);

export const splitRightCommand: Command = {
  id: 'workbench.action.splitRight',
  handler: (ctx) => { /* ... */ },
  when: when.asPredicate(),   // (ctx) => ...
  whenClause: when.asString(), // 'activeGroupId && editorFocus'
  keybinding: 'Cmd+\\',
};
```

**Estimated time:** 1-2 days

---

### Option 3: Manual Registration (Quick Fix)

**Effort:** Low
**Impact:** Limited (no automatic registration)

Don't try to convert - manually register keybindings with when clauses:

```typescript
// services/keybindings/defaultKeybindings.ts
export function registerDefaultKeybindings(): Disposable[] {
  const disposables: Disposable[] = [];

  // Manual registration with when clauses
  const keybindings = [
    {
      commandId: 'workbench.action.splitRight',
      key: 'Cmd+\\',
      when: 'activeGroupId && editorFocus',
    },
    {
      commandId: 'workbench.action.closeActiveEditor',
      key: 'Cmd+W',
      when: 'activeGroupId && editorFocus',
    },
    // ... all other commands
  ];

  keybindings.forEach(kb => {
    disposables.push(keybindingService.registerKeybinding({
      id: `default.${kb.commandId}`,
      commandId: kb.commandId,
      key: kb.key,
      when: kb.when,
    }));
  });

  return disposables;
}
```

**Downside:** Commands and keybindings defined separately (can diverge)

**Estimated time:** 30 minutes

---

## Guidance for Future Developers

### If You're Adding New Features (Unrelated to Keybindings)

**Short version:** The system works. Ignore the incomplete when clause infrastructure.

#### When Adding New Commands

```typescript
// Just define the command with a predicate and keybinding
commandRegistry.register({
  id: 'my.new.command',
  handler: (ctx) => {
    // Your implementation
  },
  when: (ctx) => {
    // Check if command can execute
    return !!ctx.activeTab;
  },
  keybinding: 'Cmd+K Cmd+M',  // Optional
});
```

**What happens:**
- ✅ Keybinding will be registered automatically
- ⚠️ Will work globally (no context filtering yet)
- ✅ Command predicate will still prevent execution when inappropriate
- ✅ Key won't be consumed if command can't execute (check-before-consume)

**You don't need to:**
- ❌ Add a `whenClause` field (doesn't exist yet)
- ❌ Set context keys (infrastructure exists but unused for keybindings)
- ❌ Worry about ContextKeyExpression (works but not wired)

#### When to Set Context Keys (Optional)

Only if you want context tracking for future when clause support:

```typescript
// In your component
const myRef = useRef<HTMLDivElement>(null);
const [, setMyFeatureFocus] = useContextKey('myFeatureFocus', false, myRef);

useEffect(() => {
  if (isActive) {
    setMyFeatureFocus(true);
  }
}, [isActive]);
```

**Impact:**
- Context key gets set in ContextKeyMap ✅
- Available for future when clauses ✅
- Doesn't affect current behavior (when clauses not wired) ⚠️

### If You're Implementing User-Defined Keybindings

**Don't start until when clauses are wired!** User keybindings require string when clauses.

**Prerequisite:** Complete Option 1, 2, or 3 from "What's Left to Complete"

**Then:**

```typescript
// Load user keybindings from JSON
const userKeybindings = await loadUserKeybindings();
// [
//   { "key": "Cmd+W", "command": "closeEditor", "when": "editorFocus" },
//   ...
// ]

userKeybindings.forEach(kb => {
  keybindingService.registerKeybinding({
    id: `user.${crypto.randomUUID()}`,
    commandId: kb.command,
    key: kb.key,
    when: kb.when,  // ← String when clause works
  });
});
```

### If You're Fixing a Bug

**Check both layers:**

```typescript
// Layer 1: Keybinding when clause (currently always passes)
// services/keybindings/KeybindingResolver.ts
// Line ~349: Filter by when clause

// Layer 2: Command predicate (working)
// services/CommandRegistry.ts
// Line ~24: Check command.when predicate
```

**Common issues:**

1. **"Key doesn't work"** → Check command predicate returns true
2. **"Key works everywhere"** → Expected (when clauses not wired)
3. **"Key consumed but nothing happens"** → Should be fixed by check-before-consume
4. **"Multi-chord doesn't work"** → Check timeout (5 seconds between chords)

### Working Around Incomplete When Clauses

**If you need context-specific keybinding RIGHT NOW:**

```typescript
// Register manually in Workbench.tsx or wherever
useEffect(() => {
  // This works because when clauses ARE implemented in resolver
  const disposable = keybindingService.registerKeybinding({
    id: 'custom.myCommand',
    commandId: 'my.command',
    key: 'Cmd+M',
    when: 'editorFocus && !inputFocus',  // ← Works!
  });

  return () => disposable.dispose();
}, []);
```

**Why this works:** KeybindingResolver already filters by when clauses. The incomplete part is just the automatic registration from commands.

---

## API Reference

### KeybindingService

**File:** `services/keybindings/KeybindingService.ts`

```typescript
// Register a keybinding
const disposable = keybindingService.registerKeybinding({
  id: 'unique-id',
  commandId: 'command.to.execute',
  key: 'Cmd+K Cmd+P',         // Multi-chord supported
  when: 'editorFocus',        // ← Optional when clause (works!)
  mac: 'Cmd+K Cmd+P',         // ← Optional platform override
  win: 'Ctrl+K Ctrl+P',
  linux: 'Ctrl+K Ctrl+P',
});

// Later: unregister
disposable.dispose();

// Lookup keybinding for command
const kb = keybindingService.lookupKeybinding('workbench.action.splitRight');
// Returns: { id, commandId, key, when?, ... }

// Get all keybindings
const all = keybindingService.getKeybindings();
```

### ContextKeyService

**File:** `services/context/ContextKeyService.ts`

```typescript
// Set global context key
contextKeyService.setValue('myKey', true);

// Create scoped context
const scoped = contextKeyService.createScoped(element);
const contextKey = scoped.createKey('editorFocus', false);

// Set value
contextKey.set(true);

// Get value
const value = contextKey.get(); // true

// Get all context (flattened)
const context = contextKeyService.getContext();
// { myKey: true, editorFocus: true, isMac: true, ... }

// Subscribe to changes
const unsubscribe = contextKeyService.onDidChangeContext((event) => {
  console.log('Context changed:', event.key, event.value);
});
```

### ContextKeyExpression

**File:** `services/context/ContextKeyExpression.ts`

```typescript
// Parse when clause
const expr = ContextKeyExpression.parse('editorFocus && !inputFocus');

// Evaluate against context
const context = { editorFocus: true, inputFocus: false };
const matches = expr.evaluate(context); // true

// Supported operators
'key'                    // Has key and truthy
'!key'                   // Not (negation)
'key == value'           // Equality
'key != value'           // Inequality
'key > 5'                // Greater than
'key >= 5'               // Greater or equal
'key < 5'                // Less than
'key <= 5'               // Less or equal
'key =~ /regex/'         // Regex match
'key in [1, 2, 3]'       // Membership
'a && b'                 // Logical AND
'a || b'                 // Logical OR
'(a || b) && c'          // Grouping with parentheses
```

### CommandRegistry

**File:** `services/CommandRegistry.ts`

```typescript
// Register command
commandRegistry.register({
  id: 'my.command',
  handler: async (ctx) => {
    // Use ctx.activeGroup, ctx.editorAreaOps, etc.
  },
  when: (ctx) => !!ctx.activeGroup,  // Optional predicate
  keybinding: 'Cmd+K Cmd+M',         // Optional keybinding
});

// Check if command can execute
const canExecute = commandRegistry.canExecute('my.command', context);

// Execute command
await commandRegistry.execute('my.command', context);

// Unregister
commandRegistry.unregister('my.command');
```

### React Hooks

**File:** `hooks/useContextKey.ts`

```typescript
function MyComponent() {
  const elementRef = useRef<HTMLDivElement>(null);

  // Create context key bound to this element
  const [value, setValue] = useContextKey('myKey', false, elementRef);

  // Set value
  setValue(true);

  return <div ref={elementRef}>...</div>;
}
```

**File:** `hooks/useHotkeys.ts`

```typescript
function MyComponent() {
  // Register component-level shortcut
  useHotkeys('Cmd+K Cmd+S', () => {
    console.log('Shortcut pressed!');
  });

  // Multi-chord works
  useHotkeys('Cmd+K Cmd+P', handleCommandPalette);
}
```

---

## Testing

### Current Test Coverage

```bash
pnpm -w test

# Results:
✓ ContextKeyExpression: 17/17 tests passing
✓ KeybindingResolver: 19/19 tests passing
✓ All existing tests: 174/174 passing
```

### Testing When Clauses (Once Wired)

```typescript
// Test in Vitest
describe('When clause filtering', () => {
  it('should filter keybindings by context', () => {
    const resolver = new KeybindingResolver();

    resolver.register({
      id: 'kb1',
      commandId: 'test.command',
      key: 'Cmd+W',
      when: 'editorFocus && !inputFocus',
    });

    // Should match when context satisfies when clause
    const result1 = resolver.resolve(['Cmd+W'], {
      editorFocus: true,
      inputFocus: false,
    });
    expect(result1.type).toBe('Found');

    // Should not match when context doesn't satisfy when clause
    const result2 = resolver.resolve(['Cmd+W'], {
      editorFocus: false,
    });
    expect(result2.type).toBe('NoMatch');
  });
});
```

### Manual Testing

```bash
# 1. Start app
pnpm dev

# 2. Test keybindings
# - Press Cmd+\ (should split right when editor focused)
# - Press Cmd+W (should close tab when tab exists)
# - Press Cmd+K then Cmd+Right (should focus next group)

# 3. Test command palette
# - Press Cmd+Shift+P
# - Type "split"
# - See filtered commands
# - Press Enter to execute

# 4. Test context
# - Click in editor group (editorFocus should become true)
# - Check browser console: contextKeyService.getContext()
```

---

## Changelog

### 2025-11-01
- **Added:** Check-before-consume pattern in KeybindingService
- **Fixed:** Keys no longer consumed when command predicate fails
- **Status:** Core system working, when clauses incomplete
- **Next:** Need to wire command whenClause to keybinding registration

---

## References

- Implementation Plan: `docs/implementation/Hotkeys_and_CommandPalette_Implementation_Plan.md`
- VS Code Keybinding Docs: https://code.visualstudio.com/docs/getstarted/keybindings
- Command Registry: `apps/desktop/renderer/services/CommandRegistry.ts`
- Keybinding Service: `apps/desktop/renderer/services/keybindings/KeybindingService.ts`
- Context Service: `apps/desktop/renderer/services/context/ContextKeyService.ts`

---

**Document Maintained By:** Development Team
**Questions?** Check existing tests or run `pnpm dev` to experiment

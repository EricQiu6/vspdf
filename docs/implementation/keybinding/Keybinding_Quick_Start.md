# Keybinding System Quick Start

**TL;DR:** The system works. When clauses exist but aren't wired. Use command predicates for now.

---

## For New Feature Development

### Adding a Command with Keyboard Shortcut

```typescript
// services/commands/myCommands.ts
import { commandRegistry } from '../CommandRegistry';

commandRegistry.register({
  id: 'my.awesome.command',
  handler: (ctx) => {
    // Your code here
    ctx.editorAreaOps.doSomething();
  },
  when: (ctx) => {
    // When can this command execute?
    return !!ctx.activeTab && !!ctx.editorAreaOps;
  },
  keybinding: 'Cmd+K Cmd+M',  // Optional
});
```

**That's it!** The keybinding will be registered automatically by `registerDefaultKeybindings()`.

### Current Limitations

| What You Want | Works? | How |
|---------------|--------|-----|
| Basic shortcut (Cmd+S) | ✅ Yes | Add `keybinding` field |
| Multi-chord (Cmd+K Cmd+P) | ✅ Yes | Space-separated chords |
| Only work when editor focused | ⚠️ Partial | Command predicate prevents execution, but key still consumed |
| Different commands same key | ❌ No | When clauses not wired |
| User customization | ❌ No | Requires when clause completion |

### Workaround: Need Context-Specific Binding RIGHT NOW?

```typescript
// In Workbench.tsx or component
useEffect(() => {
  // Manually register with when clause (this works!)
  const disposable = keybindingService.registerKeybinding({
    id: 'my-custom-binding',
    commandId: 'my.command',
    key: 'Cmd+M',
    when: 'editorFocus && !inputFocus',  // ← Works!
  });

  return () => disposable.dispose();
}, []);
```

---

## Understanding Check-Before-Consume

**Key behavior change (2025-11-01):**

```typescript
// OLD: Keys consumed even when command can't execute
Press Cmd+W with no tab open
→ Keybinding matches
→ Key consumed (preventDefault)
→ Command predicate fails
→ Nothing happens, key gone forever

// NEW: Keys only consumed if command executes
Press Cmd+W with no tab open
→ Keybinding matches
→ Check: Can command execute? No
→ Key NOT consumed
→ Other handlers can use it
```

**Result:** Better UX, keys work more predictably.

---

## Common Patterns

### Pattern 1: Command That Needs Active Tab

```typescript
commandRegistry.register({
  id: 'closeTab',
  handler: (ctx) => {
    ctx.editorAreaOps.closeTab(ctx.activeGroup, ctx.activeTabIndex);
  },
  when: (ctx) => !!ctx.activeTab,  // Prevents execution when no tab
  keybinding: 'Cmd+W',
});
```

### Pattern 2: Command That Needs Active Group

```typescript
commandRegistry.register({
  id: 'splitRight',
  handler: (ctx) => {
    ctx.editorAreaOps.splitRight(ctx.activeGroup);
  },
  when: (ctx) => !!ctx.activeGroup,  // Prevents execution when no group
  keybinding: 'Cmd+\\',
});
```

### Pattern 3: Multi-Chord Sequence

```typescript
commandRegistry.register({
  id: 'focusNextGroup',
  handler: (ctx) => { /* ... */ },
  when: (ctx) => !!ctx.activeGroup,
  keybinding: 'Cmd+K Cmd+Right',  // User has 5 seconds between chords
});
```

### Pattern 4: Platform-Specific Shortcuts

```typescript
commandRegistry.register({
  id: 'save',
  handler: (ctx) => { /* ... */ },
  keybinding: 'Cmd+S',  // Default (Mac)
  // Platform overrides not yet supported in Command interface
  // Use KeybindingService directly if needed
});
```

---

## Context Keys (Future-Proofing)

If you want your feature to support when clauses when they're wired:

```typescript
// In your component
function MyFeaturePanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [, setPanelFocus] = useContextKey('myPanelFocus', false, panelRef);

  useEffect(() => {
    if (isActive) {
      setPanelFocus(true);
    } else {
      setPanelFocus(false);
    }
  }, [isActive]);

  return <div ref={panelRef}>...</div>;
}
```

**Available context keys today:**
- `editorFocus` - Set by EditorGroup
- `activeGroupId` - Set by EditorGroup
- `viewerType` - Set by viewers (StubViewer)
- `viewerUri` - Set by viewers
- `isMac`, `isWindows`, `isLinux` - Set on init
- `isDevelopment`, `isProduction` - Set on init

---

## Testing Your Changes

```bash
# 1. Run tests
pnpm -w test

# 2. Start dev server
pnpm dev

# 3. Try your keybinding
# Press your shortcut and verify:
# - Command executes when appropriate ✓
# - Command doesn't execute when predicate fails ✓
# - Key isn't consumed when command can't execute ✓

# 4. Check command palette
# Press Cmd+Shift+P
# Search for your command
# Verify it appears and executes
```

---

## Don't Do These Things

❌ **Don't try to add `whenClause` to commands** - type doesn't exist yet

```typescript
// DON'T:
commandRegistry.register({
  id: 'my.command',
  whenClause: 'editorFocus',  // ← Type error!
});
```

❌ **Don't expect multiple commands on same key to work**

```typescript
// DON'T expect both to work:
keybindingService.registerKeybinding({ key: 'Cmd+W', commandId: 'cmd1' });
keybindingService.registerKeybinding({ key: 'Cmd+W', commandId: 'cmd2' });
// Only first one will ever execute
```

❌ **Don't start implementing user keybindings** - requires when clause completion first

---

## When You Hit Issues

### "My shortcut doesn't work"

1. Check command predicate returns true:
   ```typescript
   // Add console.log
   when: (ctx) => {
     console.log('Can execute?', !!ctx.activeTab);
     return !!ctx.activeTab;
   }
   ```

2. Check CommandContextProvider is updated:
   ```typescript
   // In browser console
   commandContextProvider.getContext()
   // Should show activeGroup, activeTab, editorAreaOps
   ```

### "My shortcut works everywhere, not just in context"

Expected behavior. When clauses aren't wired yet. Your command predicate still prevents execution though.

### "Key consumed but nothing happens"

Should be fixed by check-before-consume. If still happening:
1. Check command predicate is working
2. File a bug - this should be impossible now

### "Multi-chord doesn't work"

- Timeout is 5 seconds between chords
- Both chords must be registered as single string: `'Cmd+K Cmd+P'`
- Check for typos in chord names

---

## Next Steps (For Someone)

To complete the when clause system, someone needs to:

1. **Quick fix (30 min):** Manually register keybindings with when clauses in `defaultKeybindings.ts`

2. **Proper fix (2-3 hours):** Add `whenClause?: string` to Command type and update all command definitions

3. **Advanced (1-2 days):** Build ContextKeyBuilder for generating both predicate + string

See `Keybinding_System_Architecture.md` for full details.

---

## Resources

- **Full architecture doc:** `docs/implementation/Keybinding_System_Architecture.md`
- **Implementation plan:** `docs/implementation/Hotkeys_and_CommandPalette_Implementation_Plan.md`
- **Code:**
  - Commands: `apps/desktop/renderer/services/commands/`
  - Keybindings: `apps/desktop/renderer/services/keybindings/`
  - Context: `apps/desktop/renderer/services/context/`
  - Hooks: `apps/desktop/renderer/hooks/`
- **Tests:**
  - `services/context/__tests__/ContextKeyExpression.test.ts` (17 tests)
  - `services/keybindings/__tests__/KeybindingResolver.test.ts` (19 tests)

---

**Last Updated:** 2025-11-01
**Status:** Core working, when clauses incomplete
**Questions?** Check architecture doc or experiment with `pnpm dev`

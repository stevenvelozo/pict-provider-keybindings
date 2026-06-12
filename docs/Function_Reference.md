# Function Reference

A copy-pasteable code snippet for **every public function** the provider exposes — the practical companion to the [Implementation Reference](Implementation_Reference.md). Each example assumes you have already registered the provider and grabbed a handle:

```javascript
const libKeybindings = require('pict-provider-keybindings');
pict.addProvider('Pict-Keybindings', libKeybindings.default_configuration, libKeybindings);

let tmpKeys = pict.providers['Pict-Keybindings'];
```

**Contents**

- Registration — [registerBinding](#registerbinding) · [registerBindings](#registerbindings) · [registerOwnerBindings](#registerownerbindings) · [registerViewBindings](#registerviewbindings) · [clearOwner](#clearowner) · [removeBinding](#removebinding) · [clearAll](#clearall) · [setBindingEnabled](#setbindingenabled)
- Scopes — [pushScope](#pushscope) · [popScope](#popscope) · [getActiveScopes](#getactivescopes)
- Suspend / Resume — [suspend](#suspend) · [resume](#resume) · [isSuspended](#issuspended)
- Introspection — [getActiveBindings](#getactivebindings) · [getBindings](#getbindings) · [getOwners](#getowners) · [formatCombo](#formatcombo)
- Cheatsheet — [showCheatsheet](#showcheatsheet) · [hideCheatsheet](#hidecheatsheet) · [toggleCheatsheet](#togglecheatsheet) · [isCheatsheetVisible](#ischeatsheetvisible)
- Engine — [KeybindingRegistry](#keybindingregistry)

---

## Registration

### registerBinding

`registerBinding(binding) → hash` — Register one app-global shortcut. Returns the binding's hash.

```javascript
let tmpHash = tmpKeys.registerBinding(
	{
		Keys: 'Mod+k',
		Name: 'Quick find',
		Description: 'Open the command palette',
		Group: 'Navigation',
		Handler: (pEvent, pEntry) => myApp.openPalette()
	});
```

### registerBindings

`registerBindings(bindings) → hash[]` — Register many app-global shortcuts at once. Returns an array of hashes.

```javascript
tmpKeys.registerBindings(
	[
		{ Keys: 'g b', Name: 'Go to board',  Group: 'Navigation', Route: '/board' },
		{ Keys: 'g i', Name: 'Go to issues', Group: 'Navigation', Route: '/issues' },
		{ Keys: 'Mod+s', Name: 'Save',       Group: 'Editing',    Handler: () => save() }
	]);
```

### registerOwnerBindings

`registerOwnerBindings(ownerKey, bindings, options) → hash[]` — **Replace** the entire binding set for a named owner. Pass `destinationSelector` to have the owner auto-pruned once that element leaves the DOM.

```javascript
tmpKeys.registerOwnerBindings('editor-panel',
	[
		{ Keys: 'Mod+b', Name: 'Bold',   Handler: () => toggleBold() },
		{ Keys: 'Mod+i', Name: 'Italic', Handler: () => toggleItalic() }
	],
	{
		destinationSelector: '#EditorPanel',  // pruned when #EditorPanel is gone
		group: 'Editor'                       // default group for these bindings
	});
```

### registerViewBindings

`registerViewBindings(view, bindings) → hash[]` — The view-lifecycle helper. Call it from a view's `onAfterRender`; the owner is the view's `Hash` and the destination selector is taken from the view's render target, so the bindings evict automatically when the view unmounts.

```javascript
class BoardView extends libPictView
{
	onAfterRender(pRenderable)
	{
		this.pict.providers['Pict-Keybindings'].registerViewBindings(this,
			[
				{ Keys: 'n', Name: 'New card', Description: 'Add a card to this column', Handler: () => this.newCard() }
			]);

		return super.onAfterRender(pRenderable);
	}
}
```

### clearOwner

`clearOwner(ownerKey) → count` — Remove every binding belonging to an owner. Returns how many were removed.

```javascript
let tmpRemoved = tmpKeys.clearOwner('editor-panel');
```

### removeBinding

`removeBinding(ownerKey, hash) → boolean` — Remove a single binding by owner + hash. App-global bindings live under the `__app__` owner.

```javascript
let tmpHash = tmpKeys.registerBinding({ Keys: 'Mod+p', Hash: 'print', Name: 'Print', Handler: () => print() });

// later...
tmpKeys.removeBinding('__app__', 'print');
```

### clearAll

`clearAll()` — Remove every binding from every owner and reset the sequence buffer.

```javascript
tmpKeys.clearAll();
```

### setBindingEnabled

`setBindingEnabled(ownerKey, hash, enabled) → boolean` — Disable or re-enable a single binding without removing it. Useful for accessibility toggles or context-sensitive availability.

```javascript
tmpKeys.registerBinding({ Keys: 'Mod+e', Hash: 'export', Name: 'Export', Handler: () => exportData() });

tmpKeys.setBindingEnabled('__app__', 'export', false);  // temporarily off
tmpKeys.setBindingEnabled('__app__', 'export', true);   // back on
```

---

## Scopes

### pushScope

`pushScope(name)` — Activate a scope so that bindings declaring `Scope: name` become eligible. Ref-counted.

```javascript
tmpKeys.registerBinding({ Keys: 'j', Name: 'Next', Scope: 'gallery', Handler: () => nextImage() });

tmpKeys.pushScope('gallery');   // the gallery is open; j now works
```

### popScope

`popScope(name)` — Deactivate one activation of a scope. The scope only fully deactivates once every `pushScope` has been matched by a `popScope`.

```javascript
tmpKeys.popScope('gallery');    // the gallery closed; j is inert again
```

### getActiveScopes

`getActiveScopes() → string[]` — The list of currently-active scope names.

```javascript
let tmpScopes = tmpKeys.getActiveScopes();   // e.g. ['gallery']
```

---

## Suspend / Resume

### suspend

`suspend(reason) → token` — Pause **all** shortcuts and return a token. Ref-counted, so independent callers can suspend simultaneously.

```javascript
let tmpToken = tmpKeys.suspend('export-dialog-open');
// global shortcuts are now paused while the dialog owns the keyboard
```

### resume

`resume(token) → boolean` — Remove one suspension by its token. Shortcuts resume only when every suspension has been resumed.

```javascript
tmpKeys.resume(tmpToken);
```

### isSuspended

`isSuspended() → boolean` — Whether shortcuts are currently paused (any token outstanding, or `DisableAllShortcuts` is set).

```javascript
if (!tmpKeys.isSuspended())
{
	// safe to assume a shortcut would fire
}
```

---

## Introspection

### getActiveBindings

`getActiveBindings(options) → group[]` — The display-ready, grouped, dead-owner-pruned set of active shortcuts. This is exactly what the cheatsheet renders. Pass `{ flat: true }` for a flat list, or `{ groupOrder: [...] }` to override ordering.

```javascript
let tmpGroups = tmpKeys.getActiveBindings();
tmpGroups.forEach((pGroup) =>
{
	console.log(pGroup.Group);
	pGroup.Bindings.forEach((pBinding) =>
	{
		console.log('  ' + pBinding.Label + '  ' + pBinding.Name);   // e.g. "⌘K  Quick find"
	});
});

// Flat list (no grouping):
let tmpFlat = tmpKeys.getActiveBindings({ flat: true });
```

### getBindings

`getBindings() → entry[]` — Every registered binding entry across all owners (raw, not display-formatted). Handy for debugging.

```javascript
let tmpAll = tmpKeys.getBindings();
console.log('Total bindings registered:', tmpAll.length);
```

### getOwners

`getOwners() → string[]` — Every owner key currently holding bindings (e.g. `'__app__'` plus per-view hashes).

```javascript
let tmpOwners = tmpKeys.getOwners();   // ['__app__', 'V-Board', ...]
```

### formatCombo

`formatCombo(combo) → string` — Format a combo string into a platform-aware display label: `⌘K` on macOS, `Ctrl+K` elsewhere. Useful for rendering a shortcut hint inside your own UI (a button tooltip, a menu item).

```javascript
let tmpLabel = tmpKeys.formatCombo('Mod+k');   // '⌘K' on Mac, 'Ctrl+K' on Windows/Linux
let tmpSeq   = tmpKeys.formatCombo('g i');      // 'G I'
let tmpArrow = tmpKeys.formatCombo('ArrowUp');  // '↑'
```

---

## Cheatsheet

### showCheatsheet

`showCheatsheet()` — Open the cheatsheet overlay (or a `pict-section-modal` dialog when `UseModalForCheatsheet` is set).

```javascript
tmpKeys.showCheatsheet();
```

### hideCheatsheet

`hideCheatsheet()` — Close the cheatsheet.

```javascript
tmpKeys.hideCheatsheet();
```

### toggleCheatsheet

`toggleCheatsheet()` — Toggle the cheatsheet open/closed. This is what the built-in `?` shortcut calls; wire it to a help button too.

```javascript
// e.g. from a help button in the template:
//   <button onclick="_Pict.providers['Pict-Keybindings'].toggleCheatsheet()">Shortcuts</button>
tmpKeys.toggleCheatsheet();
```

### isCheatsheetVisible

`isCheatsheetVisible() → boolean` — Whether the cheatsheet is currently open.

```javascript
if (tmpKeys.isCheatsheetVisible())
{
	tmpKeys.hideCheatsheet();
}
```

---

## Engine

### KeybindingRegistry

`require('pict-provider-keybindings').KeybindingRegistry` — The pure, DOM-free matcher, exported for direct use and unit testing. Feed it plain event-like objects; no browser required.

```javascript
const { KeybindingRegistry } = require('pict-provider-keybindings');

let tmpRegistry = new KeybindingRegistry({ isMac: false });
let tmpFired = false;

tmpRegistry.register({ Keys: 'Mod+s', Name: 'Save', Handler: () => { tmpFired = true; } });

// Dispatch a normalized, DOM-free event:
let tmpResult = tmpRegistry.dispatch(
	{ key: 's', ctrl: true, meta: false, shift: false, alt: false, repeat: false, isComposing: false, keyCode: 0 },
	{ inputFocused: false });

console.log(tmpResult.matched, tmpFired);   // true true
```

See the [Implementation Reference](Implementation_Reference.md#the-pure-engine--keybindingregistry) for the full engine method list and the `dispatch` event/env/return shapes.

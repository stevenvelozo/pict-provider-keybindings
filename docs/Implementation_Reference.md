# Implementation Reference

The complete API surface: module exports, configuration, the binding object, the combo grammar, every provider method, and the pure `KeybindingRegistry` engine.

## Module Exports

```javascript
const libKeybindings = require('pict-provider-keybindings');

libKeybindings                       // the PictProviderKeybindings provider class
libKeybindings.default_configuration // the default provider configuration object
libKeybindings.KeybindingRegistry    // the pure, DOM-free matching engine (for direct use / testing)
```

## Registering the Provider

```javascript
pict.addProvider('Pict-Keybindings', libKeybindings.default_configuration, libKeybindings);
let tmpKeys = pict.providers['Pict-Keybindings'];
```

Pass an options object (merged over the defaults) as the second argument to customize configuration:

```javascript
pict.addProvider('Pict-Keybindings',
	Object.assign({}, libKeybindings.default_configuration,
		{
			CheatsheetTitle: 'Shortcuts',
			SequenceTimeoutMS: 800,
			GroupOrder: [ 'Navigation', 'Editing', 'Help' ]
		}),
	libKeybindings);
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ProviderIdentifier` | string | `'Pict-Keybindings'` | The key the provider registers under in `pict.providers`. |
| `EnableHelpBinding` | boolean | `true` | Register a built-in shortcut that toggles the cheatsheet. |
| `HelpComboString` | string | `'?'` | The combo for the built-in cheatsheet toggle. |
| `CheatsheetTitle` | string | `'Keyboard Shortcuts'` | Title shown at the top of the cheatsheet and as its ARIA label. |
| `SequenceTimeoutMS` | number | `1000` | Milliseconds allowed between steps of a key sequence. |
| `UseModalForCheatsheet` | boolean | `false` | Render the cheatsheet through `pict-section-modal` instead of the built-in overlay (falls back to the overlay if the modal view is absent). |
| `GroupOrder` | string[] | `[]` | Explicit ordering of cheatsheet groups; ungrouped names sort alphabetically after the listed ones. |
| `DisableAllShortcuts` | boolean | `false` | Global off switch (accessibility) — when `true`, nothing ever matches. |
| `GuardInputs` | boolean | `true` | When `true`, bare-key shortcuts are suppressed while an input/textarea/contenteditable is focused. Set `false` to disable input guarding entirely. |

## The Binding Object

A binding is a plain object passed to `registerBinding()`, `registerBindings()`, `registerOwnerBindings()`, or `registerViewBindings()`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `Keys` | string | — | **Required.** The combo string (see grammar below). Aliases `Combo` and `Key` are also accepted. |
| `Name` | string | the combo | Short label shown in the cheatsheet. |
| `Description` | string | `''` | One-line description shown under the name in the cheatsheet. |
| `Group` | string | `'General'` | Cheatsheet group heading. |
| `Handler` | function | — | `(event, entry) => {}` — called when the binding fires. **Either `Handler` or `Route` is required.** |
| `Route` | string | — | A route string navigated through `pict-router` when the binding fires. |
| `HelpTopic` | string | `null` | A `#/route` or `https://` link rendered as a "Learn more" link in the cheatsheet. |
| `AllowInInput` | boolean | `false` | Fire even while an input/textarea/contenteditable is focused. |
| `AllowRepeat` | boolean | `false` | Fire on keyboard auto-repeat (held key) rather than only the initial press. |
| `Priority` | number | `500` | Higher wins on conflict. |
| `PreventDefault` | boolean | `true` | Call `event.preventDefault()` when the binding fires. Set `false` to let the browser default through. |
| `StopPropagation` | boolean | `true` | Call `event.stopPropagation()` when the binding fires. |
| `Enabled` | boolean | `true` | Set `false` to register the binding disabled (toggle later with `setBindingEnabled`). |
| `Scope` | string | `null` | Only eligible while the named scope is active (`pushScope` / `popScope`). |
| `Hash` | string | the combo | Stable identifier within an owner; needed if you register two bindings on the same combo or want to target one with `removeBinding`/`setBindingEnabled`. |

A binding with neither a `Handler` nor a `Route`, or with an unparseable combo, is ignored (and logged).

## Combo Grammar

A combo string is one or more **steps** separated by whitespace. Each step is one key plus zero or more modifiers, joined with `+`.

```
Mod+S            single chord
Ctrl+Shift+P     multiple modifiers
g i              two-step sequence (press g, then i)
Mod+K Mod+S      two-step chord sequence
?                a shifted symbol — Shift is "don't care"
```

### Modifiers

| Token(s) | Meaning |
|----------|---------|
| `Mod` | **⌘ on macOS, Ctrl elsewhere** — the portable primary modifier |
| `Ctrl`, `Control` | Control |
| `Meta`, `Cmd`, `Command`, `Win`, `Windows`, `Super` | the platform meta key |
| `Alt`, `Option`, `Opt` | Alt / Option |
| `Shift` | Shift |

### Keys and Aliases

Single characters match case-insensitively (Shift is matched separately). Function keys `f1`–`f24` normalize to `F1`–`F24`. Named keys and aliases:

| Alias(es) | Key |
|-----------|-----|
| `esc`, `escape` | `Escape` |
| `del`, `delete` / `ins`, `insert` | `Delete` / `Insert` |
| `space`, `spacebar` | Space |
| `up` / `down` / `left` / `right` (and `arrow*`) | `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` |
| `enter`, `return`, `ret` | `Enter` |
| `tab` / `backspace`, `bksp` | `Tab` / `Backspace` |
| `pageup`, `pgup` / `pagedown`, `pgdn` | `PageUp` / `PageDown` |
| `home` / `end` | `Home` / `End` |
| `plus` / `comma` / `period`, `dot` / `slash` / `backslash` | `+` / `,` / `.` / `/` / `\` |

A shifted symbol authored without an explicit `Shift` (e.g. `?`) matches on the resulting character directly, so Shift is treated as a "don't care". To require Shift, write it explicitly (`Shift+/`).

## Provider Methods

### Registration

| Method | Returns | Description |
|--------|---------|-------------|
| `registerBinding(binding)` | `string \| null` | Merge a single app-global binding (under the `__app__` owner). Returns the binding's hash. |
| `registerBindings(bindings)` | `string[]` | Merge an array of app-global bindings. Returns the hashes. |
| `registerOwnerBindings(ownerKey, bindings, options)` | `string[]` | **Replace** an owner's entire binding set. `options.destinationSelector` ties the owner to a DOM selector for auto-pruning; `options.group` sets a default group. |
| `registerViewBindings(view, bindings)` | `string[]` | Sugar for the view case — owner is the view's `Hash`, destination selector is derived from the view's `DefaultDestinationAddress` (or first renderable's `ContentDestinationAddress`). Call it in `onAfterRender`. |
| `clearOwner(ownerKey)` | `number` | Remove all of an owner's bindings. Returns the count removed. |
| `removeBinding(ownerKey, hash)` | `boolean` | Remove one binding by owner + hash. |
| `clearAll()` | — | Remove every binding (and reset the sequence buffer). |
| `setBindingEnabled(ownerKey, hash, enabled)` | `boolean` | Enable/disable a single binding without removing it. |

> App-global bindings live under the reserved owner key `__app__`.

### Scopes

| Method | Returns | Description |
|--------|---------|-------------|
| `pushScope(name)` | — | Activate a scope (ref-counted). Scoped bindings become eligible. |
| `popScope(name)` | — | Deactivate one activation of a scope. |
| `getActiveScopes()` | `string[]` | The currently-active scope names. |

### Suspend / Resume

| Method | Returns | Description |
|--------|---------|-------------|
| `suspend(reason)` | `string` | Pause all shortcuts; returns a token. Ref-counted across callers. |
| `resume(token)` | `boolean` | Remove one suspension by token. Shortcuts resume when the stack is empty. |
| `isSuspended()` | `boolean` | Whether shortcuts are currently paused (any token outstanding, or `DisableAllShortcuts`). |

### Introspection

| Method | Returns | Description |
|--------|---------|-------------|
| `getActiveBindings(options)` | `Group[]` | The display-ready, grouped, dead-owner-pruned set of active bindings. `options.flat` returns a flat array of display records instead; `options.groupOrder` overrides the configured order. |
| `getBindings()` | `Entry[]` | Every registered binding entry (raw, all owners). |
| `getOwners()` | `string[]` | Every owner key currently holding bindings. |
| `formatCombo(combo)` | `string` | Format a combo string (or parsed matchers) to a platform-aware display string (`⌘K` / `Ctrl+K`). |

### Cheatsheet

| Method | Returns | Description |
|--------|---------|-------------|
| `showCheatsheet()` | — | Open the cheatsheet overlay (or modal, if configured). |
| `hideCheatsheet()` | — | Close the cheatsheet. |
| `toggleCheatsheet()` | — | Toggle it. (This is what `?` calls.) |
| `isCheatsheetVisible()` | `boolean` | Whether the cheatsheet is open. |

All cheatsheet methods are safe to call in a non-DOM (server-side) context — they no-op rather than throw.

### Display Record Shape

`getActiveBindings()` returns an array of groups:

```javascript
[
	{
		Group: 'Navigation',
		Bindings:
		[
			{
				Combo: 'Mod+k',                 // the authored combo string
				Label: '⌘K',                    // platform-formatted single string
				Keys: [ ['⌘', 'K'] ],           // tokens per step (array of steps, each an array of chips)
				Name: 'Quick find',
				Description: 'Open the command palette',
				HelpTopic: null
			}
		]
	}
]
```

## The Pure Engine — `KeybindingRegistry`

The matcher behind the provider, exported for direct use and unit testing. It never touches `document` or `window`; environmental facts are passed in.

```javascript
const { KeybindingRegistry } = require('pict-provider-keybindings');

let tmpRegistry = new KeybindingRegistry(
	{
		isMac: false,
		sequenceTimeoutMS: 1000,
		now: () => Date.now(),        // injectable clock (handy for tests)
		log: null,                    // optional logger with .warn
		onRoute: (route, entry) => {} // called when a fired binding has a Route
	});
```

### Engine Methods

| Method | Description |
|--------|-------------|
| `register(binding)` | Merge one binding under the `__app__` owner; returns its hash. |
| `registerOwner(ownerKey, bindings, options)` | Replace an owner's binding set; returns the hashes. |
| `parseCombo(combo)` | Parse a combo string into an array of step matchers; `null` if unparseable. |
| `dispatch(event, env)` | Match a normalized event and fire the winner. See shapes below. |
| `clearOwner(key)` / `removeBinding(key, hash)` / `clearAll()` | Mutate the registry. |
| `setEnabled(key, hash, on)` | Toggle a single binding. |
| `pushScope(name)` / `popScope(name)` / `getActiveScopes()` | Ref-counted scope set. |
| `pruneDeadOwners(ownerAlive)` | Drop owners whose `destinationSelector` fails the `ownerAlive(key, owner)` predicate. |
| `getActive(options, ownerAlive)` | Grouped (or flat) display records, dead owners pruned. |
| `group(list, options)` | Group + sort a list of entries into display groups. |
| `getBindings()` / `getOwners()` | Introspection. |
| `formatCombo(combo)` | Platform-aware formatting. |

### `dispatch(event, env)`

The event is a normalized, DOM-free object; the env carries the two facts the engine cannot compute itself.

```javascript
// event
{ key, ctrl, meta, shift, alt, repeat, isComposing, keyCode, originalEvent }

// env
{ inputFocused: boolean, ownerAlive: (ownerKey, ownerObject) => boolean }

// return
{ matched: boolean, entry?: Entry, sequenceInProgress: boolean }
```

`matched` is `true` when a binding fired (`entry` is the winner). `sequenceInProgress` is `true` when the key advanced an as-yet-incomplete sequence (the shell swallows the key in that case).

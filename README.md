# pict-provider-keybindings

> **[Read the Pict-Provider-Keybindings Documentation](https://fable-retold.github.io/pict-provider-keybindings/)**

[pict-provider-keybindings on npm](https://www.npmjs.com/package/pict-provider-keybindings) | [MIT License](LICENSE)

A centralized keyboard-shortcut registry for [Pict](https://github.com/fable-retold/pict) browser applications. Register a binding once with a name, a description, and a function or a route; views register their own bindings as part of their normal lifecycle; and a built-in cheatsheet overlay — toggled by `?` — shows the user exactly what every active key does.

It is a small, modern dispatcher: one `keydown` listener, `event.key` (never `keyCode`), a `Mod` abstraction that resolves to Cmd on macOS and Ctrl everywhere else, multi-step key sequences, input-field and IME guarding, and a per-binding disable for accessibility. No mousetrap, no global state spread across your views.

## Features

- **One registry, many sources** — app-global shortcuts and per-view shortcuts share a single matcher with a deterministic conflict-resolution order
- **Functions or routes** — a binding fires a `Handler(event, entry)` or navigates a `Route` through [pict-router](https://github.com/fable-retold/pict-router) (a soft dependency)
- **Chords and sequences** — `Mod+S`, `Mod+K Mod+S`, `g i`, with a configurable inter-key timeout
- **Platform-aware `Mod`** — write `Mod+K` once; it matches and renders as `⌘K` on macOS and `Ctrl+K` elsewhere
- **Built-in cheatsheet** — press `?` for a themeable overlay grouping every active shortcut; can optionally render through [pict-section-modal](https://github.com/fable-retold/pict-section-modal)
- **Lifecycle-friendly** — `registerViewBindings(this, [...])` in `onAfterRender`; bindings auto-evict when the view's DOM leaves the document — no teardown hook
- **Safe by default** — guards input/textarea/contenteditable focus, skips IME composition, ignores auto-repeat, and exposes `suspend()` / `resume()` so a modal can pause shortcuts
- **Pure, testable engine** — the matcher is DOM-free and exported as `KeybindingRegistry` for direct use and unit testing

## Installation

```bash
npm install pict-provider-keybindings
```

## Quick Start

```javascript
const libKeybindings = require('pict-provider-keybindings');

// 1. Register the provider once on your Pict app
pict.addProvider('Pict-Keybindings', libKeybindings.default_configuration, libKeybindings);

let tmpKeys = pict.providers['Pict-Keybindings'];

// 2. App-global shortcuts — a route or a function
tmpKeys.registerBinding(
	{
		Keys: 'g b', Name: 'Go to board', Description: 'Open the kanban board',
		Group: 'Navigation', Route: '/board'
	});
tmpKeys.registerBinding(
	{
		Keys: 'Mod+k', Name: 'Quick find', Description: 'Open the command palette',
		Group: 'Navigation', Handler: (pEvent) => myApp.openPalette()
	});

// 3. Per-view shortcuts — in a view's onAfterRender:
//    this.pict.providers['Pict-Keybindings'].registerViewBindings(this,
//        [{ Keys: 'n', Name: 'New card', Handler: () => this.newCard() }]);
```

Press `?` to open the cheatsheet. No deregistration call is required — a per-view binding goes away when the view's DOM does.

## API

### Registration

```javascript
// One app-global binding (merges); returns a hash
tmpKeys.registerBinding({ Keys: 'Mod+s', Name: 'Save', Group: 'Editing', Handler: () => save() });

// Many at once
tmpKeys.registerBindings([ /* ...bindings... */ ]);

// Replace a named owner's whole set, tied to a DOM selector for auto-pruning
tmpKeys.registerOwnerBindings('editor', [ /* ... */ ], { destinationSelector: '#Editor' });

// View-lifecycle sugar — call in onAfterRender; auto-evicts on unmount
tmpKeys.registerViewBindings(this, [ { Keys: 'n', Name: 'New', Handler: () => this.add() } ]);

// Mutation
tmpKeys.clearOwner('editor');
tmpKeys.removeBinding('__app__', 'Mod+s');
tmpKeys.setBindingEnabled('__app__', 'Mod+s', false);
tmpKeys.clearAll();
```

### Scopes, Suspend, Cheatsheet

```javascript
// Scopes — a binding with Scope: 'gallery' is only eligible while the scope is active
tmpKeys.pushScope('gallery');
tmpKeys.popScope('gallery');

// Suspend all shortcuts (ref-counted) while a modal owns the keyboard
let tmpToken = tmpKeys.suspend('modal-open');
tmpKeys.resume(tmpToken);

// Cheatsheet
tmpKeys.toggleCheatsheet();
tmpKeys.showCheatsheet();
tmpKeys.hideCheatsheet();

// Introspection
let tmpGroups = tmpKeys.getActiveBindings();          // grouped display records
let tmpLabel  = tmpKeys.formatCombo('Mod+k');          // '⌘K' / 'Ctrl+K'
```

## Binding Fields

| Field | Meaning |
|-------|---------|
| `Keys` | The combo string. Modifiers: `Mod`, `Ctrl`, `Meta`/`Cmd`, `Alt`/`Option`, `Shift`. Sequences are space-separated (`g i`). Named keys + aliases: `Escape`/`esc`, `Space`, `ArrowUp`/`up`, `Enter`, `F5`, … |
| `Name` | Short label for the cheatsheet. |
| `Description` | One-line description. |
| `Handler` *or* `Route` | A `(event, entry)` function, or a route string navigated via `pict-router`. |
| `Group` | Cheatsheet grouping (default `General`). |
| `HelpTopic` | Optional `#/route` or `https://` link shown in the cheatsheet. |
| `AllowInInput` | Fire even while an input is focused (default false). |
| `AllowRepeat` | Fire on key auto-repeat (default false). |
| `Priority` | Higher wins on conflict (default 500). |
| `Scope` | Only eligible while the named scope is active. |
| `Enabled` | Set false to disable (also `setBindingEnabled`). |
| `Hash` | Stable id within an owner (defaults to the combo). |

## Configuration

`addProvider('Pict-Keybindings', { ... }, libKeybindings)` accepts: `EnableHelpBinding` (default true), `HelpComboString` (default `?`), `CheatsheetTitle`, `SequenceTimeoutMS` (default 1000), `UseModalForCheatsheet` (default false), `GroupOrder` (array), `DisableAllShortcuts` (global off switch for accessibility), and `GuardInputs` (default true).

## Documentation

Full documentation is available at [https://fable-retold.github.io/pict-provider-keybindings/](https://fable-retold.github.io/pict-provider-keybindings/)

- [Overview](https://fable-retold.github.io/pict-provider-keybindings/#/) — What it does and the key concepts
- [Quick Start](https://fable-retold.github.io/pict-provider-keybindings/#/Quick_Start) — Your first shortcut and cheatsheet in five minutes
- [Architecture](https://fable-retold.github.io/pict-provider-keybindings/#/Architecture) — The engine/shell split, dispatch pipeline, and conflict resolution
- [Implementation Reference](https://fable-retold.github.io/pict-provider-keybindings/#/Implementation_Reference) — Every option, field, method, and the pure-engine API
- [Function Reference](https://fable-retold.github.io/pict-provider-keybindings/#/Function_Reference) — A code snippet for every public function

### Function Reference

Per-function documentation with code snippets lives in [docs/Function_Reference.md](docs/Function_Reference.md):

| Group | Functions |
|-------|-----------|
| Registration | `registerBinding` · `registerBindings` · `registerOwnerBindings` · `registerViewBindings` · `clearOwner` · `removeBinding` · `clearAll` · `setBindingEnabled` |
| Scopes | `pushScope` · `popScope` · `getActiveScopes` |
| Suspend / Resume | `suspend` · `resume` · `isSuspended` |
| Introspection | `getActiveBindings` · `getBindings` · `getOwners` · `formatCombo` |
| Cheatsheet | `showCheatsheet` · `hideCheatsheet` · `toggleCheatsheet` · `isCheatsheetVisible` |

The pure engine is exported as `require('pict-provider-keybindings').KeybindingRegistry` for direct use and testing.

## Example Applications

Live, runnable demos (see [`example_applications/`](example_applications/)):

- **Shortcuts Playground** — an interactive catalog of every primitive: app-global bindings, chords, sequences, the cheatsheet, suspend/resume, scopes, per-binding disable, and a live active-bindings list.
- **Kanban Shortcuts** — a multi-view router app showing per-view binding lifecycle (auto-evict on navigation), `Route` shortcuts, and scope-gated keys.

## Related Packages

- [pict](https://github.com/fable-retold/pict) — MVC application framework
- [pict-provider](https://github.com/fable-retold/pict-provider) — Provider base class
- [pict-router](https://github.com/fable-retold/pict-router) — Hash routing (soft dependency, for `Route` bindings)
- [pict-section-modal](https://github.com/fable-retold/pict-section-modal) — Optional cheatsheet renderer
- [fable](https://github.com/fable-retold/fable) — Service infrastructure and dependency injection

## License

MIT

## Contributing

Pull requests are welcome. For details on our code of conduct, contribution process, and testing requirements, see the [Retold Contributing Guide](https://github.com/stevenvelozo/retold/blob/main/docs/contributing.md).

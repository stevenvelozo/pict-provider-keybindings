# Quick Start

This guide walks you through adding keyboard shortcuts to a Pict application — installing the package, registering the provider, adding app-global and per-view bindings, and showing the built-in cheatsheet.

## Prerequisites

- Node.js 16+
- A Pict application (or willingness to create one)

## Installation

```bash
npm install pict-provider-keybindings
```

If you are building for the browser, also install the build tool:

```bash
npm install --save-dev quackage
```

For `Route` bindings (shortcuts that navigate), install [pict-router](https://fable-retold.github.io/pict-router/) — it is a soft dependency, only needed if you use routes.

## Step 1: Create a Pict Application

If you do not already have a Pict application, create a minimal one:

```javascript
const libPict = require('pict');

let _Pict = new libPict(
	{
		Product: 'KeybindingsDemo',
		ProductVersion: '1.0.0'
	});
```

## Step 2: Register the Keybindings Provider

Pict-Provider-Keybindings exports a provider class plus its default configuration. Register it with your Pict instance:

```javascript
const libKeybindings = require('pict-provider-keybindings');

_Pict.addProvider('Pict-Keybindings', libKeybindings.default_configuration, libKeybindings);
```

`'Pict-Keybindings'` is the provider identifier you will use to reach it later, and matches the default `ProviderIdentifier`.

## Step 3: Initialize

The provider attaches its single `document` keydown listener and registers the `?` cheatsheet shortcut during initialization, so make sure your app initializes:

```javascript
_Pict.initialize();

// The provider is now accessible:
let tmpKeys = _Pict.providers['Pict-Keybindings'];
```

## Step 4: Register an App-Global Shortcut

Use `registerBinding()` for shortcuts that should work everywhere in the app. A binding needs a `Keys` combo and either a `Handler` function or a `Route`:

```javascript
tmpKeys.registerBinding(
	{
		Keys: 'Mod+k',
		Name: 'Quick find',
		Description: 'Open the command palette',
		Group: 'Navigation',
		Handler: (pEvent, pEntry) => openCommandPalette()
	});
```

`Mod` resolves to **⌘** on macOS and **Ctrl** everywhere else — so a single declaration is correct on every platform. `Name`, `Description`, and `Group` are what the cheatsheet shows.

## Step 5: Register a Route Shortcut

A binding with a `Route` navigates through [pict-router](https://fable-retold.github.io/pict-router/) instead of calling a function:

```javascript
tmpKeys.registerBinding(
	{
		Keys: 'g b',
		Name: 'Go to board',
		Description: 'Open the kanban board',
		Group: 'Navigation',
		Route: '/board'
	});
```

`g b` is a **sequence** — press `g`, then `b` within the timeout window. If no router is wired, the provider falls back to setting `window.location.hash`.

## Step 6: Add Per-View Shortcuts

Views register their own shortcuts in `onAfterRender` with `registerViewBindings(this, [...])`. The provider keys them to the view, replaces the set on every render (so re-renders never duplicate), and **automatically removes them once the view's DOM leaves the document** — no teardown call needed:

```javascript
class BoardView extends libPictView
{
	onAfterRender(pRenderable)
	{
		this.pict.providers['Pict-Keybindings'].registerViewBindings(this,
			[
				{ Keys: 'n', Name: 'New card', Description: 'Create a card in this column', Handler: () => this.newCard() },
				{ Keys: 'r', Name: 'Refresh', Description: 'Reload the board', Handler: () => this.reload() }
			]);

		return super.onAfterRender(pRenderable);
	}
}
```

Bare-key shortcuts like `n` are automatically suppressed while the user is typing in an input, textarea, or contenteditable element — so they will not fire mid-sentence.

## Step 7: Show the Cheatsheet

By default the provider registers `?` to toggle a built-in cheatsheet overlay that lists every active shortcut, grouped, with platform-correct key glyphs. **Just press `?`** — no code required.

You can also drive it programmatically:

```javascript
tmpKeys.toggleCheatsheet();   // open if closed, close if open
tmpKeys.showCheatsheet();
tmpKeys.hideCheatsheet();
```

To render the cheatsheet through [pict-section-modal](https://fable-retold.github.io/pict-section-modal/) instead of the built-in overlay, set `UseModalForCheatsheet: true` in the provider configuration.

## Step 8: Chords, Sequences, and Aliases

The `Keys` grammar is flexible:

```javascript
tmpKeys.registerBinding({ Keys: 'Mod+s',      Name: 'Save',          Handler: () => save() });
tmpKeys.registerBinding({ Keys: 'Mod+k Mod+s', Name: 'Save all',      Handler: () => saveAll() });   // two-step chord sequence
tmpKeys.registerBinding({ Keys: 'g i',        Name: 'Go to issues',  Route: '/issues' });            // press g, then i
tmpKeys.registerBinding({ Keys: 'Shift+?',    Name: 'Help',          Handler: () => help() });
tmpKeys.registerBinding({ Keys: 'esc',        Name: 'Close',         Handler: () => closePanel() }); // aliases: esc, up, space, enter, f5...
```

Modifiers: `Mod`, `Ctrl`, `Meta`/`Cmd`, `Alt`/`Option`, `Shift`. Named keys and aliases include `Escape`/`esc`, `Space`, `ArrowUp`/`up`, `Enter`, `Tab`, `F1`–`F24`, and more.

## Step 9: Suspend Shortcuts While a Modal Owns the Keyboard

When a modal or other transient UI takes over the keyboard, suspend shortcuts. `suspend()` returns a token and is ref-counted, so several independent owners can suspend at once:

```javascript
let tmpToken = tmpKeys.suspend('export-dialog');
// ... the dialog is open; global shortcuts are paused ...
tmpKeys.resume(tmpToken);   // shortcuts resume once every suspender has resumed
```

## Complete Working Example

```javascript
const libPict = require('pict');
const libKeybindings = require('pict-provider-keybindings');

let _Pict = new libPict({ Product: 'KeybindingsDemo' });

_Pict.addProvider('Pict-Keybindings', libKeybindings.default_configuration, libKeybindings);
_Pict.initialize();

let tmpKeys = _Pict.providers['Pict-Keybindings'];

// Navigation group
tmpKeys.registerBinding({ Keys: 'g b', Name: 'Go to board',  Group: 'Navigation', Route: '/board' });
tmpKeys.registerBinding({ Keys: 'g i', Name: 'Go to issues', Group: 'Navigation', Route: '/issues' });
tmpKeys.registerBinding(
	{
		Keys: 'Mod+k', Name: 'Quick find', Description: 'Open the command palette',
		Group: 'Navigation', Handler: () => console.log('palette!')
	});

// Editing group — Mod+S fires even while an input is focused
tmpKeys.registerBinding(
	{
		Keys: 'Mod+s', Name: 'Save', Description: 'Save the current document',
		Group: 'Editing', Handler: (pEvent) => { console.log('saved'); }
	});

// Press ? to open the cheatsheet and see all of the above.
```

## Next Steps

- **[Architecture](Architecture.md)** — Understand the engine/shell split, the dispatch pipeline, and conflict resolution
- **[Implementation Reference](Implementation_Reference.md)** — Every configuration option, binding field, and method
- **[Function Reference](Function_Reference.md)** — A copy-pasteable snippet for each public function

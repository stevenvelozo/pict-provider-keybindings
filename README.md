# pict-provider-keybindings

A centralized keyboard-shortcut registry for [Pict](https://github.com/fable-retold/pict) browser apps. Register a binding once with a name, a description, and a function or a route; views register their own bindings in their lifecycle; a built-in cheatsheet overlay (toggled by `?`) shows what every active key does.

It is a small, modern dispatcher: one `keydown` listener, `event.key` + a `Mod` (Cmd on macOS, Ctrl elsewhere) abstraction, key sequences, input-field and IME guarding, and a per-binding disable for accessibility. No mousetrap, no `keyCode`.

## What it does

- **One registry, many sources.** App-global bindings and per-view bindings live in one place. The matching engine is pure and DOM-free; the provider is a thin shell over a single `document` keydown listener.
- **Functions or routes.** A binding fires a `Handler(event, entry)` or navigates a `Route` through `pict-router` (a soft dependency).
- **Lifecycle-friendly, no teardown hook needed.** A view calls `registerViewBindings(this, [...])` in `onAfterRender`; the provider replaces that view's set on every render (so re-renders never duplicate) and drops the bindings automatically once the view's DOM leaves the document.
- **Sequences and chords.** `Mod+S`, `Mod+K Mod+S`, `g i` — all supported, with a configurable timeout.
- **Built-in cheatsheet.** `?` opens a themeable overlay grouping the active bindings with platform-correct key glyphs (`⌘K` on Mac, `Ctrl+K` elsewhere) and optional help links. Zero hard UI dependency; can optionally render through `pict-section-modal`.
- **Plays well with others.** Guards input/textarea/contenteditable focus (bare keys are suppressed while typing; `Mod+`-chords still fire), skips IME composition, and exposes `suspend()/resume()` so a modal can pause shortcuts while it owns input.

## Quick example

```javascript
const libKeybindings = require('pict-provider-keybindings');

// 1. register the provider once on your Pict app
pict.addProvider('Pict-Keybindings', libKeybindings.default_configuration, libKeybindings);

// 2. app-global shortcuts (function or route)
let tmpKeys = pict.providers['Pict-Keybindings'];
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

// 3. per-view shortcuts — in a view's onAfterRender:
onAfterRender(pRenderable)
{
    this.pict.providers['Pict-Keybindings'].registerViewBindings(this,
        [
            { Keys: 'n', Name: 'New card', Description: 'Create a card in this column', Handler: () => this.newCard() }
        ]);
    return super.onAfterRender(pRenderable);
}
```

Press `?` to see the cheatsheet. That is it — no deregistration call is required; the binding goes away when the view's DOM does.

## Binding fields

| Field | Meaning |
|-------|---------|
| `Keys` | The combo string. Modifiers: `Mod`, `Ctrl`, `Meta`/`Cmd`, `Alt`/`Option`, `Shift`. Sequences are space-separated (`g i`). Named keys + aliases: `Escape`/`esc`, `Space`, `ArrowUp`/`up`, `Enter`, `F5`, etc. |
| `Name` | Short label for the cheatsheet. |
| `Description` | One-line description. |
| `Handler` *or* `Route` | A `(event, entry)` function, or a route string navigated via `pict-router`. |
| `Group` | Cheatsheet grouping (default `General`). |
| `HelpTopic` | Optional `#/route` or `https://` link shown in the cheatsheet. |
| `AllowInInput` | Fire even while an input is focused (default false). |
| `AllowRepeat` | Fire on key auto-repeat (default false). |
| `Priority` | Higher wins on conflict (default 500). |
| `Scope` | Only eligible while the named scope is active (`pushScope`/`popScope`). |
| `Enabled` | Set false to disable (also `setBindingEnabled`). |

## Configuration

`addProvider('Pict-Keybindings', { ... }, libKeybindings)` accepts: `EnableHelpBinding` (default true), `HelpComboString` (default `?`), `CheatsheetTitle`, `SequenceTimeoutMS` (default 1000), `UseModalForCheatsheet` (default false), `GroupOrder` (array), `DisableAllShortcuts` (global off switch for accessibility), `GuardInputs` (default true).

## API

`registerBinding` / `registerBindings` / `registerOwnerBindings` / `registerViewBindings` / `clearOwner` / `removeBinding` / `clearAll` / `setBindingEnabled` / `pushScope` / `popScope` / `getActiveScopes` / `suspend` / `resume` / `isSuspended` / `getActiveBindings` / `getBindings` / `getOwners` / `formatCombo` / `showCheatsheet` / `hideCheatsheet` / `toggleCheatsheet` / `isCheatsheetVisible`.

The pure engine is exported as `require('pict-provider-keybindings').KeybindingRegistry` for direct use and testing.

## Related modules

- [`pict-provider`](https://github.com/fable-retold/pict-provider) — the provider base class.
- [`pict-router`](https://github.com/fable-retold/pict-router) — route navigation (soft dependency, for `Route` bindings).
- [`pict-section-modal`](https://github.com/fable-retold/pict-section-modal) — optional cheatsheet renderer (`UseModalForCheatsheet`).
- [`pict`](https://github.com/fable-retold/pict) — the framework.

## License

MIT

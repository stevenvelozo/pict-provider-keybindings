# Shortcuts Playground

<!-- docuserve:example-launch:start -->
> **[Launch the live app](examples/shortcuts%5Fplayground/index.html)** - runs in your browser, opens in a new tab.
<!-- docuserve:example-launch:end -->


Interactive catalog of every pict-provider-keybindings primitive: app-global bindings, chords, key sequences, the cheatsheet, input guarding, suspend/resume, scopes, per-binding disable, and a live active-bindings list.

## What to try

| Shortcut | What it does |
|---|---|
| `?` | Open the built-in cheatsheet overlay |
| `⌘K` / `Ctrl+K` | A modifier chord — fires even while typing |
| `g` then `b` / `i` / `h` | Key sequences (press the two keys in turn) |
| `⌘K` then `⌘S` | A two-step chord sequence |
| `⌘S` | Save — fires even with the input field focused |
| `j` / `k` | Bare keys, only live while Gallery scope is active |

Type into the **input field**, then compare a bare `g b` (suppressed) against `⌘S` (still fires). Toggle **suspend**, **Gallery mode**, and the **Save binding**, and watch the live status pills and the *Active shortcuts* panel update.

## What it demonstrates

- App-global registration with `registerBindings()`
- Chords, sequences, and the platform-aware `Mod` (⌘ / Ctrl) abstraction
- The built-in `?` cheatsheet overlay
- Input / IME guarding — bare keys suppressed while typing, modifier chords still fire
- `suspend()` / `resume()`, `pushScope()` / `popScope()`, and `setBindingEnabled()`
- `getActiveBindings()` driving a live, auto-updating shortcut list
- `formatCombo()` rendering platform-correct key glyphs

See the [Quick Start](../../Quick_Start.md) and the [Function Reference](../../Function_Reference.md) for the full API.

# Kanban Shortcuts

<!-- docuserve:example-launch:start -->
> **[Launch the live app](examples/kanban%5Fshortcuts/index.html)** - runs in your browser, opens in a new tab.
<!-- docuserve:example-launch:end -->


A routed multi-view app showing per-view binding lifecycle (shortcuts auto-evict when you navigate away), Route shortcuts (g b / g l) that drive pict-router, and a view-local scope. The live cheatsheet changes as you move between views.

## What to try

| Shortcut | What it does |
|---|---|
| `g` then `b` | Route shortcut → navigate to the Board view |
| `g` then `l` | Route shortcut → navigate to the List view |
| `?` | Open the cheatsheet — note it changes per view |
| Board: `n` `r` `x` then `⌫` | New card, refresh, select first card, delete (scoped) |
| List: `n` `f` `s` | New row, focus filter, cycle sort |

Navigate between Board and List and watch the **Active shortcuts** panel on the right: each view's bindings appear when you arrive and evict when you leave — no teardown code. The same key, `n`, does something different on each view, and only the visible view's `n` is ever live.

## What it demonstrates

- Per-view registration tied to the view's own DOM element, with **automatic eviction** on navigation
- `Route` bindings handing off to `pict-router`
- Per-view key isolation — one key, different actions, only one live at a time
- A view-local `Scope` — Backspace deletes a card only while one is selected (`pushScope` / `popScope`)
- Input guarding — press `f` on the List to focus the filter, then bare keys are suppressed while you type

See the [Architecture](../../Architecture.md) page for how owner pruning and the dispatch pipeline work.

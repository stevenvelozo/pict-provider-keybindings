'use strict';

/**
 * CSS for the keybindings cheatsheet overlay. Registered via CSSMap.addCSS().
 * Every color is a theme token with a hand-picked fallback, so it follows the
 * host app's theme but still looks right with no theme provider. z-index sits
 * below pict-section-modal (10001) so a modal can cover the cheatsheet.
 */

module.exports = /*css*/`
.pict-keybindings-overlay
{
	display: none;
	position: fixed;
	inset: 0;
	z-index: 9000;
	align-items: flex-start;
	justify-content: center;
	padding: 8vh 16px 16px;
	box-sizing: border-box;
	background: var(--theme-color-backdrop, rgba(15, 18, 24, 0.45));
	overflow: auto;
}
.pict-keybindings-overlay.open { display: flex; }
.pict-keybindings-overlay:focus { outline: none; }

.pict-keybindings-panel
{
	width: 100%;
	max-width: 640px;
	background: var(--theme-color-background-panel, #ffffff);
	color: var(--theme-color-text-primary, #1d2230);
	border: 1px solid var(--theme-color-border, #d8dde6);
	border-radius: 14px;
	box-shadow: 0 18px 48px rgba(15, 18, 24, 0.28);
	overflow: hidden;
	font-size: 14px;
}

.pict-keybindings-head
{
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 18px;
	border-bottom: 1px solid var(--theme-color-border, #e3e6ec);
}
.pict-keybindings-title
{
	font-size: 1.05em;
	font-weight: 600;
	color: var(--theme-color-text-primary, #1d2230);
}
.pict-keybindings-close
{
	border: none;
	background: transparent;
	color: var(--theme-color-text-secondary, #5b6376);
	font-size: 1.5em;
	line-height: 1;
	cursor: pointer;
	padding: 0 4px;
	border-radius: 6px;
}
.pict-keybindings-close:hover
{
	background: var(--theme-color-background-hover, rgba(0, 0, 0, 0.06));
	color: var(--theme-color-text-primary, #1d2230);
}

.pict-keybindings-bodyscroll
{
	padding: 8px 18px 18px;
	max-height: 70vh;
	overflow: auto;
}

.pict-keybindings-group { margin-top: 14px; }
.pict-keybindings-group-title
{
	font-size: 0.78em;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--theme-color-text-secondary, #5b6376);
	margin-bottom: 6px;
}

.pict-keybindings-row
{
	display: flex;
	align-items: baseline;
	gap: 14px;
	padding: 7px 0;
	border-bottom: 1px solid var(--theme-color-border-subtle, #f0f2f5);
}
.pict-keybindings-row:last-child { border-bottom: none; }

.pict-keybindings-keys
{
	flex: 0 0 auto;
	min-width: 92px;
	display: flex;
	align-items: center;
	gap: 6px;
	flex-wrap: wrap;
}
.pict-keybindings-chord { display: inline-flex; gap: 3px; }
.pict-keybindings-keys kbd
{
	display: inline-block;
	min-width: 1.4em;
	text-align: center;
	padding: 2px 6px;
	font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	font-size: 0.82em;
	line-height: 1.4;
	color: var(--theme-color-text-primary, #1d2230);
	background: var(--theme-color-background-subtle, #f3f5f9);
	border: 1px solid var(--theme-color-border, #d8dde6);
	border-bottom-width: 2px;
	border-radius: 6px;
}
.pict-keybindings-then
{
	font-size: 0.72em;
	color: var(--theme-color-text-secondary, #8a93a6);
	margin: 0 2px;
}

.pict-keybindings-meta
{
	flex: 1 1 auto;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 1px;
}
.pict-keybindings-name { font-weight: 600; color: var(--theme-color-text-primary, #1d2230); }
.pict-keybindings-desc { font-size: 0.88em; color: var(--theme-color-text-secondary, #5b6376); }
.pict-keybindings-help
{
	font-size: 0.82em;
	margin-top: 2px;
	color: var(--theme-color-accent, #3b6fd4);
	text-decoration: none;
	align-self: flex-start;
}
.pict-keybindings-help:hover { text-decoration: underline; }

.pict-keybindings-empty
{
	padding: 24px 8px;
	text-align: center;
	color: var(--theme-color-text-secondary, #5b6376);
}
`;

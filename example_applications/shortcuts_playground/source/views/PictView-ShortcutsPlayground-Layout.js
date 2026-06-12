const libPictView = require('pict-view');

/**
 * Shortcuts Playground — layout view
 *
 * Registers a catalog of demo shortcuts against the keybindings provider and
 * renders interactive cards that explain each feature. Live regions (the fired
 * log, the active-bindings list, the status line) are updated through
 * ContentAssignment as shortcuts fire and as the user toggles state.
 */
class PictViewShortcutsPlaygroundLayout extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this._fireLog = [];
		this._bindingsRegistered = false;
		this._suspendToken = null;
		this._galleryOn = false;
		this._saveEnabled = true;
	}

	get keybindings()
	{
		return this.pict.providers['Pict-Keybindings'];
	}

	onAfterRender(pRenderable)
	{
		this.pict.CSSMap.injectCSS();

		if (!this._bindingsRegistered)
		{
			this._bindingsRegistered = true;
			this._registerDemoBindings();
			this._renderFormatDemo();
		}

		this.refreshActiveList();
		this.refreshState();
		this._renderLog();

		return super.onAfterRender(pRenderable);
	}

	_registerDemoBindings()
	{
		this.keybindings.registerBindings(
			[
				{ Keys: 'Mod+k', Name: 'Quick find', Description: 'Modifier chord — fires even while typing', Group: 'Navigation', Handler: () => this.logFire('Quick find', 'Mod+K') },
				{ Keys: 'g b', Name: 'Go to board', Description: 'Sequence: press g, then b', Group: 'Navigation', Handler: () => this.logFire('Go to board', 'g b') },
				{ Keys: 'g i', Name: 'Go to issues', Description: 'Sequence: press g, then i', Group: 'Navigation', Handler: () => this.logFire('Go to issues', 'g i') },
				{ Keys: 'g h', Name: 'Go home', Description: 'Sequence: press g, then h', Group: 'Navigation', Handler: () => this.logFire('Go home', 'g h') },
				{ Keys: 'Mod+s', Hash: 'save', Name: 'Save', Description: 'Fires even while an input is focused (it has a modifier)', Group: 'Editing', Handler: () => this.logFire('Save', 'Mod+S') },
				{ Keys: 'Mod+k Mod+s', Name: 'Save all', Description: 'Two-step chord sequence', Group: 'Editing', Handler: () => this.logFire('Save all', 'Mod+K Mod+S') },
				{ Keys: 'j', Hash: 'gnext', Name: 'Next item', Description: 'Bare key — only eligible while the Gallery scope is active', Group: 'Gallery', Scope: 'gallery', Handler: () => this.logFire('Next item', 'j') },
				{ Keys: 'k', Hash: 'gprev', Name: 'Previous item', Description: 'Bare key — only eligible while the Gallery scope is active', Group: 'Gallery', Scope: 'gallery', Handler: () => this.logFire('Previous item', 'k') }
			]);
	}

	// ── live regions ─────────────────────────────────────────────────────────

	logFire(pName, pCombo)
	{
		this._fireLog.unshift({ Name: pName, Combo: pCombo, Time: new Date().toLocaleTimeString() });
		this._fireLog = this._fireLog.slice(0, 10);
		this._renderLog();
	}

	_renderLog()
	{
		let tmpHTML;
		if (!this._fireLog.length)
		{
			tmpHTML = '<div class="log-empty">No shortcuts fired yet — try one of the keys above, or press <kbd>?</kbd>.</div>';
		}
		else
		{
			tmpHTML = this._fireLog.map((pEntry) =>
				'<div class="log-row">' +
					'<span class="log-combo">' + this._esc(pEntry.Combo) + '</span>' +
					'<span class="log-name">' + this._esc(pEntry.Name) + '</span>' +
					'<span class="log-time">' + this._esc(pEntry.Time) + '</span>' +
				'</div>').join('');
		}
		this.pict.ContentAssignment.assignContent('#playground-log', tmpHTML);
	}

	refreshActiveList()
	{
		let tmpGroups = this.keybindings.getActiveBindings();
		let tmpHTML = '';
		for (let i = 0; i < tmpGroups.length; i++)
		{
			let tmpGroup = tmpGroups[i];
			let tmpRows = '';
			for (let j = 0; j < tmpGroup.Bindings.length; j++)
			{
				let tmpBinding = tmpGroup.Bindings[j];
				tmpRows +=
					'<div class="kb-row">' +
						'<span class="kb-keys">' + this._keysHTML(tmpBinding.Keys) + '</span>' +
						'<span class="kb-meta"><span class="kb-name">' + this._esc(tmpBinding.Name) + '</span>' +
							(tmpBinding.Description ? '<span class="kb-desc">' + this._esc(tmpBinding.Description) + '</span>' : '') +
						'</span>' +
					'</div>';
			}
			tmpHTML +=
				'<div class="kb-group">' +
					'<div class="kb-group-title">' + this._esc(tmpGroup.Group) + '</div>' +
					tmpRows +
				'</div>';
		}
		if (!tmpHTML)
		{
			tmpHTML = '<div class="log-empty">No shortcuts are active right now.</div>';
		}
		this.pict.ContentAssignment.assignContent('#active-bindings', tmpHTML);
	}

	refreshState()
	{
		let tmpHTML =
			this._statePill('Shortcuts', this._suspendToken ? 'suspended' : 'active', !this._suspendToken) +
			this._statePill('Gallery scope', this._galleryOn ? 'active' : 'inactive', this._galleryOn) +
			this._statePill('Save (Mod+S)', this._saveEnabled ? 'enabled' : 'disabled', this._saveEnabled);
		this.pict.ContentAssignment.assignContent('#playground-state', tmpHTML);
	}

	_renderFormatDemo()
	{
		let tmpCombos = [ 'Mod+K', 'Ctrl+Shift+P', 'Alt+Enter', 'g i', 'ArrowUp', 'Mod+K Mod+S' ];
		let tmpHTML = tmpCombos.map((pCombo) =>
			'<div class="fmt-row">' +
				'<code>' + this._esc(pCombo) + '</code>' +
				'<span class="fmt-arrow">&rarr;</span>' +
				'<span class="fmt-out">' + this._keysHTML(this._tokenize(pCombo)) + '</span>' +
			'</div>').join('');
		this.pict.ContentAssignment.assignContent('#format-output', tmpHTML);
	}

	// ── interactions (wired from inline onclick handlers) ──────────────────────

	openCheatsheet()
	{
		this.keybindings.toggleCheatsheet();
	}

	toggleSuspend()
	{
		if (this._suspendToken)
		{
			this.keybindings.resume(this._suspendToken);
			this._suspendToken = null;
		}
		else
		{
			this._suspendToken = this.keybindings.suspend('playground-demo');
		}
		this.refreshState();
	}

	toggleGallery()
	{
		if (this._galleryOn)
		{
			this.keybindings.popScope('gallery');
			this._galleryOn = false;
		}
		else
		{
			this.keybindings.pushScope('gallery');
			this._galleryOn = true;
		}
		this.refreshState();
		this.refreshActiveList();
	}

	toggleSaveBinding()
	{
		this._saveEnabled = !this._saveEnabled;
		this.keybindings.setBindingEnabled('__app__', 'save', this._saveEnabled);
		this.refreshState();
		this.refreshActiveList();
	}

	// ── helpers ────────────────────────────────────────────────────────────────

	// Render a Keys token matrix ([[ '⌘','K' ], ['I']]) as <kbd> chips with
	// "then" separators between sequence steps.
	_keysHTML(pSteps)
	{
		let tmpSteps = pSteps || [];
		let tmpParts = [];
		for (let i = 0; i < tmpSteps.length; i++)
		{
			let tmpChips = tmpSteps[i].map((pToken) => '<kbd>' + this._esc(pToken) + '</kbd>').join('');
			tmpParts.push('<span class="kb-chord">' + tmpChips + '</span>');
		}
		return tmpParts.join('<span class="kb-then">then</span>');
	}

	// Format a combo string into the same token matrix getActiveBindings emits,
	// so the format demo renders chips identically to the live list.
	_tokenize(pCombo)
	{
		let tmpRegistry = this.keybindings._Registry;
		let tmpMatchers = tmpRegistry.parseCombo(pCombo);
		return tmpMatchers ? tmpMatchers.map((pMatcher) => tmpRegistry._stepKeyTokens(pMatcher)) : [];
	}

	_statePill(pLabel, pValue, pOn)
	{
		return '<span class="state-pill ' + (pOn ? 'on' : 'off') + '">' +
			'<span class="state-label">' + this._esc(pLabel) + '</span>' +
			'<span class="state-value">' + this._esc(pValue) + '</span>' +
		'</span>';
	}

	_esc(pStr)
	{
		return String(pStr == null ? '' : pStr)
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
	}
}

PictViewShortcutsPlaygroundLayout.default_configuration =
{
	ViewIdentifier: 'ShortcutsPlaygroundLayout',

	DefaultRenderable: 'ShortcutsPlayground-Content',
	DefaultDestinationAddress: '#ShortcutsPlayground-Application-Container',

	AutoRender: false,

	CSS: /*css*/`
		.kbp-header
		{
			text-align: center;
			padding: 44px 24px 28px;
			border-bottom: 1px solid var(--theme-color-border, #e5e7eb);
		}
		.kbp-header h1 { font-size: 34px; font-weight: 700; color: #111827; margin: 0 0 8px; letter-spacing: -0.5px; }
		.kbp-header p { font-size: 16px; color: #6b7280; margin: 0; }
		.kbp-header .kbp-hint { margin-top: 14px; font-size: 14px; color: #4f46e5; }
		.kbp-header kbd, .log-empty kbd { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85em; padding: 1px 6px; border: 1px solid #c7c9d6; border-bottom-width: 2px; border-radius: 5px; background: #f3f4f6; }

		.kbp-sections { max-width: 920px; margin: 0 auto; padding: 28px 24px 64px; }

		/* sticky "try it" dashboard */
		.kbp-dash
		{
			position: sticky; top: 0; z-index: 5;
			display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
			background: rgba(249,250,251,0.92); backdrop-filter: blur(4px);
			border: 1px solid #e5e7eb; border-radius: 12px;
			padding: 18px 20px; margin-bottom: 28px;
			box-shadow: 0 1px 3px rgba(0,0,0,0.06);
		}
		.kbp-dash h3 { margin: 0 0 10px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
		#playground-state { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; grid-column: 1 / -1; }
		.state-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 12px; border: 1px solid; }
		.state-pill.on  { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
		.state-pill.off { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
		.state-label { font-weight: 600; }
		.log-row { display: flex; align-items: baseline; gap: 10px; padding: 5px 0; border-bottom: 1px solid #f0f2f5; font-size: 13px; }
		.log-row:last-child { border-bottom: none; }
		.log-combo { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 600; color: #4f46e5; min-width: 110px; }
		.log-name { flex: 1 1 auto; color: #111827; }
		.log-time { color: #9ca3af; font-size: 12px; }
		.log-empty { color: #6b7280; font-size: 13px; padding: 8px 0; }

		.kb-group { margin-bottom: 12px; }
		.kb-group-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 6px; }
		.kb-row { display: flex; align-items: baseline; gap: 12px; padding: 4px 0; }
		.kb-keys { flex: 0 0 auto; min-width: 96px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
		.kb-chord { display: inline-flex; gap: 3px; }
		.kb-keys kbd { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.78em; min-width: 1.4em; text-align: center; padding: 2px 6px; border: 1px solid #d8dde6; border-bottom-width: 2px; border-radius: 6px; background: #f3f5f9; color: #1d2230; }
		.kb-then { font-size: 0.7em; color: #9ca3af; margin: 0 1px; }
		.kb-meta { display: flex; flex-direction: column; }
		.kb-name { font-weight: 600; color: #111827; font-size: 13px; }
		.kb-desc { font-size: 12px; color: #6b7280; }

		.kbp-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px 28px; margin-bottom: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
		.kbp-card h2 { font-size: 19px; font-weight: 600; color: #111827; margin: 0 0 6px; }
		.kbp-card .card-desc { color: #6b7280; font-size: 14px; margin: 0 0 16px; line-height: 1.55; }
		.kbp-card code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; padding: 2px 5px; background: #f3f4f6; border-radius: 3px; }
		.kbp-btn { padding: 9px 16px; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; background: #4f46e5; color: #fff; transition: background 150ms ease; font-family: system-ui, -apple-system, sans-serif; }
		.kbp-btn:hover { background: #4338ca; }
		.kbp-btn.secondary { background: #e5e7eb; color: #374151; }
		.kbp-btn.secondary:hover { background: #d1d5db; }
		.kbp-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
		.kbp-input { padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; width: 260px; max-width: 100%; }
		.fmt-row { display: flex; align-items: center; gap: 12px; padding: 5px 0; font-size: 14px; }
		.fmt-row code { min-width: 150px; }
		.fmt-arrow { color: #9ca3af; }
		.fmt-out { display: inline-flex; gap: 5px; }
		.fmt-out kbd { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.82em; min-width: 1.4em; text-align: center; padding: 2px 6px; border: 1px solid #d8dde6; border-bottom-width: 2px; border-radius: 6px; background: #f3f5f9; }
		.kbp-keyhint { display: inline-flex; gap: 4px; margin-left: 4px; }
		.kbp-keyhint kbd { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8em; padding: 2px 6px; border: 1px solid #d8dde6; border-bottom-width: 2px; border-radius: 6px; background: #f3f5f9; }
		@media (max-width: 720px) { .kbp-dash { grid-template-columns: 1fr; } }
	`,

	Templates:
	[
		{
			Hash: 'ShortcutsPlayground-Content',
			Template: /*html*/`
<div class="kbp-header">
	<h1>Shortcuts Playground</h1>
	<p>Every pict-provider-keybindings primitive, live and interactive.</p>
	<div class="kbp-hint">Press <kbd>?</kbd> any time to open the built-in cheatsheet.</div>
</div>

<div class="kbp-sections">

	<!-- Sticky dashboard: live state + fired log -->
	<div class="kbp-dash">
		<div id="playground-state"></div>
		<div>
			<h3>Fired shortcuts</h3>
			<div id="playground-log"></div>
		</div>
		<div>
			<h3>Active shortcuts (live)</h3>
			<div id="active-bindings"></div>
		</div>
	</div>

	<!-- App-global -->
	<div class="kbp-card">
		<h2>App-global shortcuts</h2>
		<p class="card-desc">Registered once with <code>registerBindings()</code>, these work anywhere in the app. Try <span class="kbp-keyhint"><kbd>⌘</kbd><kbd>K</kbd></span> (or <span class="kbp-keyhint"><kbd>Ctrl</kbd><kbd>K</kbd></span>) for Quick find — the <code>Mod</code> modifier resolves to ⌘ on macOS and Ctrl elsewhere.</p>
		<div class="kbp-row">
			<button class="kbp-btn" onclick="_Pict.views.ShortcutsPlaygroundLayout.openCheatsheet()">Open the cheatsheet</button>
		</div>
	</div>

	<!-- Sequences -->
	<div class="kbp-card">
		<h2>Chords &amp; sequences</h2>
		<p class="card-desc">A combo is space-separated steps. <code>g b</code> is a sequence — press <code>g</code>, then <code>b</code> within the timeout. <code>Mod+K Mod+S</code> is a two-step chord sequence. Try <code>g</code> then <code>i</code>, or <code>g</code> then <code>h</code>. A stray key or a pause resets the sequence.</p>
	</div>

	<!-- Input guarding -->
	<div class="kbp-card">
		<h2>Input guarding</h2>
		<p class="card-desc">Click into the field below and type. Bare-key shortcuts like the <code>g</code> sequences are <strong>suppressed while you type</strong> — but modifier chords like <span class="kbp-keyhint"><kbd>⌘</kbd><kbd>S</kbd></span> still fire. Watch the fired log up top.</p>
		<div class="kbp-row">
			<input class="kbp-input" type="text" placeholder="Type here, then try g b vs ⌘S…" />
		</div>
	</div>

	<!-- Suspend -->
	<div class="kbp-card">
		<h2>Suspend &amp; resume</h2>
		<p class="card-desc"><code>suspend()</code> pauses every shortcut and returns a token; <code>resume(token)</code> lifts it. It is ref-counted, so several owners (a modal, a drag) can suspend independently. Toggle it and watch the <em>Shortcuts</em> pill — while suspended, nothing fires.</p>
		<div class="kbp-row">
			<button class="kbp-btn" onclick="_Pict.views.ShortcutsPlaygroundLayout.toggleSuspend()">Toggle suspend</button>
		</div>
	</div>

	<!-- Scopes -->
	<div class="kbp-card">
		<h2>Scopes</h2>
		<p class="card-desc">The <code>j</code> and <code>k</code> shortcuts declare <code>Scope: 'gallery'</code>, so they are only <em>eligible</em> while that scope is active. Toggle Gallery mode below, then press <code>j</code> / <code>k</code> — they only fire while the scope is on. (They stay listed in the cheatsheet the whole time; the scope gates firing, not visibility.)</p>
		<div class="kbp-row">
			<button class="kbp-btn" onclick="_Pict.views.ShortcutsPlaygroundLayout.toggleGallery()">Toggle Gallery mode</button>
		</div>
	</div>

	<!-- Enable / disable -->
	<div class="kbp-card">
		<h2>Per-binding disable</h2>
		<p class="card-desc"><code>setBindingEnabled()</code> turns a single shortcut off without removing it — useful for accessibility or context-sensitive availability. Toggle the Save binding, then try <span class="kbp-keyhint"><kbd>⌘</kbd><kbd>S</kbd></span>: while disabled it stops firing and leaves the active list.</p>
		<div class="kbp-row">
			<button class="kbp-btn" onclick="_Pict.views.ShortcutsPlaygroundLayout.toggleSaveBinding()">Toggle the Save binding</button>
		</div>
	</div>

	<!-- Platform formatting -->
	<div class="kbp-card">
		<h2>Platform-aware formatting</h2>
		<p class="card-desc"><code>formatCombo()</code> renders a combo the way <em>this</em> machine's keyboard reads it — ⌘ glyphs on macOS, words on Windows/Linux. The cheatsheet uses the same formatter, so users always see their own keys.</p>
		<div id="format-output"></div>
	</div>

</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'ShortcutsPlayground-Content',
			TemplateHash: 'ShortcutsPlayground-Content',
			ContentDestinationAddress: '#ShortcutsPlayground-Application-Container',
			RenderMethod: 'replace'
		}
	]
};

module.exports = PictViewShortcutsPlaygroundLayout;

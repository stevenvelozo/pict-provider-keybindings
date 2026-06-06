'use strict';

/**
 * Pict Provider: Keybindings
 *
 * A centralized keyboard-shortcut registry for Pict browser apps. Register the
 * provider once, then register bindings (keystroke -> function or route, each
 * with a name, description, and optional help link). Views register their own
 * bindings in onAfterRender via registerViewBindings(this, [...]); the provider
 * replaces a view's set on each render (idempotent) and prunes a view's bindings
 * once its DOM leaves the document, so no destroy hook is needed. A built-in
 * cheatsheet overlay (toggled by "?") shows what the active keys do.
 *
 * The matching engine (Keybinding-Registry) is pure and DOM-free; this shell
 * owns the single document keydown listener, the input/owner-liveness facts, the
 * suspend stack, and the overlay. The single document-level listener is a
 * deliberate, documented exception to the "no addEventListener" rule (it is a
 * browser-level global event, not a per-element view listener).
 *
 * @author Steven Velozo <steven@velozo.com>
 * @license MIT
 */

const libPictProvider = require('pict-provider');
const libRegistry = require('./Keybinding-Registry.js');
const libCSS = require('./Pict-Provider-Keybindings-CSS.js');

const _DefaultProviderConfiguration =
{
	ProviderIdentifier: 'Pict-Keybindings',
	EnableHelpBinding: true,
	HelpComboString: '?',
	CheatsheetTitle: 'Keyboard Shortcuts',
	SequenceTimeoutMS: 1000,
	UseModalForCheatsheet: false,
	GroupOrder: [],
	DisableAllShortcuts: false,
	GuardInputs: true
};

class PictProviderKeybindings extends libPictProvider
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, _DefaultProviderConfiguration, pOptions || {});
		super(pFable, tmpOptions, pServiceHash);
		this.serviceType = 'PictProviderKeybindings';

		this.isMac = this._detectIsMac();
		this._suspendStack = [];
		this._suspendSeq = 0;
		this._listenerBound = false;
		this._cheatsheetVisible = false;
		this._overlayEl = null;
		this._boundOwnerAlive = this._ownerAlive.bind(this);

		this._Registry = new libRegistry(
			{
				isMac: this.isMac,
				sequenceTimeoutMS: this.options.SequenceTimeoutMS,
				log: this.log,
				onRoute: this._navigateRoute.bind(this)
			});

		if (this.pict && this.pict.CSSMap && typeof this.pict.CSSMap.addCSS === 'function')
		{
			this.pict.CSSMap.addCSS('Pict-Provider-Keybindings', libCSS, 500);
		}
	}

	onAfterInitialize()
	{
		this._attachListener();
		if (this.options.EnableHelpBinding !== false)
		{
			this._Registry.register(
				{
					Keys: this.options.HelpComboString || '?',
					Name: 'Keyboard shortcuts',
					Description: 'Show or hide this list of shortcuts',
					Group: 'Help',
					Handler: () => this.toggleCheatsheet()
				});
		}
		return true;
	}

	// ── environment / platform ─────────────────────────────────────────────────

	_detectIsMac()
	{
		if (typeof navigator === 'undefined') { return false; }
		let tmpPlatform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
		return /mac|iphone|ipad|ipod/i.test(tmpPlatform);
	}

	_attachListener()
	{
		if (this._listenerBound || typeof document === 'undefined') { return; }
		this._boundKeyDown = this._onKeyDown.bind(this);
		document.addEventListener('keydown', this._boundKeyDown);
		this._listenerBound = true;
	}

	_isInputFocused()
	{
		if (typeof document === 'undefined' || !document.activeElement) { return false; }
		let tmpEl = document.activeElement;
		let tmpTag = (tmpEl.tagName || '').toUpperCase();
		if (tmpTag === 'TEXTAREA' || tmpTag === 'SELECT') { return true; }
		if (tmpTag === 'INPUT')
		{
			let tmpType = (tmpEl.getAttribute('type') || 'text').toLowerCase();
			// Non-text inputs don't capture typing, so shortcuts are fine over them.
			if (['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'range', 'color', 'image'].indexOf(tmpType) >= 0) { return false; }
			return true;
		}
		if (tmpEl.isContentEditable) { return true; }
		return false;
	}

	_ownerAlive(pKey, pOwner)
	{
		if (!pOwner.destinationSelector) { return true; }
		if (typeof document === 'undefined') { return true; }
		return !!document.querySelector(pOwner.destinationSelector);
	}

	_normalizeDomEvent(pEvent)
	{
		return {
			key: pEvent.key,
			ctrl: pEvent.ctrlKey,
			meta: pEvent.metaKey,
			shift: pEvent.shiftKey,
			alt: pEvent.altKey,
			repeat: pEvent.repeat,
			isComposing: pEvent.isComposing,
			keyCode: pEvent.keyCode,
			originalEvent: pEvent
		};
	}

	_onKeyDown(pEvent)
	{
		if (this.isSuspended()) { return; }
		let tmpInputFocused = (this.options.GuardInputs === false) ? false : this._isInputFocused();
		let tmpResult = this._Registry.dispatch(this._normalizeDomEvent(pEvent), { inputFocused: tmpInputFocused, ownerAlive: this._boundOwnerAlive });
		if (tmpResult && tmpResult.matched && tmpResult.entry)
		{
			if (tmpResult.entry.PreventDefault && typeof pEvent.preventDefault === 'function') { pEvent.preventDefault(); }
			if (tmpResult.entry.StopPropagation && typeof pEvent.stopPropagation === 'function') { pEvent.stopPropagation(); }
		}
		else if (tmpResult && tmpResult.sequenceInProgress)
		{
			// Swallow the in-progress sequence key so it does not leak to the page.
			if (typeof pEvent.preventDefault === 'function') { pEvent.preventDefault(); }
		}
	}

	_navigateRoute(pRoute)
	{
		let tmpRouter = this.pict && this.pict.providers && this.pict.providers['Pict-Router'];
		if (tmpRouter && typeof tmpRouter.navigate === 'function') { tmpRouter.navigate(pRoute); }
		else if (typeof window !== 'undefined' && window.location) { window.location.hash = pRoute; }
		else if (this.log) { this.log.warn('pict-provider-keybindings: no router available to navigate "' + pRoute + '"'); }
	}

	// ── registration (pass-throughs to the engine) ──────────────────────────────

	registerBinding(pBinding) { return this._Registry.register(pBinding); }

	registerBindings(pBindings)
	{
		let tmpHashes = [];
		let tmpList = Array.isArray(pBindings) ? pBindings : [];
		for (let i = 0; i < tmpList.length; i++)
		{
			let tmpHash = this._Registry.register(tmpList[i]);
			if (tmpHash) { tmpHashes.push(tmpHash); }
		}
		return tmpHashes;
	}

	registerOwnerBindings(pOwnerKey, pBindings, pOptions) { return this._Registry.registerOwner(pOwnerKey, pBindings, pOptions); }

	/**
	 * Sugar for the common view case — call this from a view's onAfterRender. The
	 * owner is the view's Hash and the destination selector is its render target,
	 * so the bindings auto-evict once the view's DOM is gone.
	 */
	registerViewBindings(pView, pBindings)
	{
		let tmpOwnerKey = (pView && (pView.Hash || pView.UUID)) || '__anonymous__';
		let tmpSelector = null;
		if (pView && pView.options)
		{
			tmpSelector = pView.options.DefaultDestinationAddress || null;
			if (!tmpSelector && Array.isArray(pView.options.Renderables) && pView.options.Renderables.length)
			{
				tmpSelector = pView.options.Renderables[0].ContentDestinationAddress || null;
			}
		}
		return this._Registry.registerOwner(tmpOwnerKey, pBindings, { destinationSelector: tmpSelector });
	}

	clearOwner(pOwnerKey) { return this._Registry.clearOwner(pOwnerKey); }
	removeBinding(pOwnerKey, pHash) { return this._Registry.removeBinding(pOwnerKey, pHash); }
	clearAll() { return this._Registry.clearAll(); }
	setBindingEnabled(pOwnerKey, pHash, pEnabled) { return this._Registry.setEnabled(pOwnerKey, pHash, pEnabled); }

	// ── scopes ───────────────────────────────────────────────────────────────

	pushScope(pName) { this._Registry.pushScope(pName); }
	popScope(pName) { this._Registry.popScope(pName); }
	getActiveScopes() { return this._Registry.getActiveScopes(); }

	// ── suspend / resume (ref-counted token stack) ───────────────────────────

	suspend(pReason)
	{
		let tmpToken = 'kb-suspend-' + (++this._suspendSeq);
		this._suspendStack.push({ token: tmpToken, reason: pReason || '' });
		return tmpToken;
	}

	resume(pToken)
	{
		for (let i = 0; i < this._suspendStack.length; i++)
		{
			if (this._suspendStack[i].token === pToken) { this._suspendStack.splice(i, 1); return true; }
		}
		return false;
	}

	isSuspended() { return this._suspendStack.length > 0 || !!this.options.DisableAllShortcuts; }

	// ── introspection ────────────────────────────────────────────────────────

	getActiveBindings(pOptions)
	{
		let tmpOptions = Object.assign({ groupOrder: this.options.GroupOrder || [] }, pOptions || {});
		return this._Registry.getActive(tmpOptions, this._boundOwnerAlive);
	}

	getBindings() { return this._Registry.getBindings(); }
	getOwners() { return this._Registry.getOwners(); }
	formatCombo(pCombo) { return this._Registry.formatCombo(pCombo); }

	// ── cheatsheet overlay ────────────────────────────────────────────────────

	showCheatsheet()
	{
		this._cheatsheetVisible = true;
		if (typeof document === 'undefined') { return; }

		if (this.options.UseModalForCheatsheet && this.pict && this.pict.views && this.pict.views['Pict-Section-Modal'])
		{
			this.pict.views['Pict-Section-Modal'].show(
				{
					title: this.options.CheatsheetTitle || 'Keyboard Shortcuts',
					content: this._renderCheatsheetHTML(),
					closeable: true
				});
			return;
		}

		let tmpOverlay = this._ensureOverlay();
		if (!tmpOverlay) { return; }
		tmpOverlay.innerHTML = this._renderCheatsheetHTML();
		tmpOverlay.classList.add('open');
		tmpOverlay.setAttribute('tabindex', '-1');
		if (typeof tmpOverlay.focus === 'function') { tmpOverlay.focus(); }
	}

	hideCheatsheet()
	{
		this._cheatsheetVisible = false;
		if (this._overlayEl)
		{
			this._overlayEl.classList.remove('open');
			this._overlayEl.innerHTML = '';
		}
	}

	toggleCheatsheet() { if (this._cheatsheetVisible) { this.hideCheatsheet(); } else { this.showCheatsheet(); } }
	isCheatsheetVisible() { return !!this._cheatsheetVisible; }

	_ensureOverlay()
	{
		if (this._overlayEl || typeof document === 'undefined') { return this._overlayEl; }
		let tmpSelf = this;
		let tmpOverlay = document.createElement('div');
		tmpOverlay.className = 'pict-keybindings-overlay';
		tmpOverlay.setAttribute('role', 'dialog');
		tmpOverlay.setAttribute('aria-label', this.options.CheatsheetTitle || 'Keyboard Shortcuts');

		// Clicks: background dismiss, close button, or a help-route link. These are
		// listeners on provider-owned createElement DOM (not a re-rendered view
		// template), so addEventListener here is safe and persists.
		tmpOverlay.addEventListener('click', function (pEvent)
		{
			let tmpTarget = pEvent.target;
			if (tmpTarget === tmpOverlay) { tmpSelf.hideCheatsheet(); return; }
			if (tmpTarget.classList && tmpTarget.classList.contains('pict-keybindings-close')) { tmpSelf.hideCheatsheet(); return; }
			let tmpRoute = tmpTarget.getAttribute && tmpTarget.getAttribute('data-kb-route');
			if (tmpRoute) { pEvent.preventDefault(); tmpSelf.hideCheatsheet(); tmpSelf._navigateRoute(tmpRoute); }
		});
		// Capture-phase Escape: close and stop it propagating to other handlers
		// (e.g. so it doesn't also trip a modal underneath).
		tmpOverlay.addEventListener('keydown', function (pEvent)
		{
			if (pEvent.key === 'Escape') { pEvent.stopPropagation(); tmpSelf.hideCheatsheet(); }
		}, true);

		document.body.appendChild(tmpOverlay);
		this._overlayEl = tmpOverlay;
		return tmpOverlay;
	}

	_renderCheatsheetHTML()
	{
		let tmpGroups = this.getActiveBindings();
		let tmpTitle = this._escape(this.options.CheatsheetTitle || 'Keyboard Shortcuts');
		let tmpBody = '';
		if (!tmpGroups.length)
		{
			tmpBody = '<div class="pict-keybindings-empty">No shortcuts are active right now.</div>';
		}
		for (let i = 0; i < tmpGroups.length; i++)
		{
			let tmpGroup = tmpGroups[i];
			let tmpRows = '';
			for (let j = 0; j < tmpGroup.Bindings.length; j++)
			{
				let tmpBinding = tmpGroup.Bindings[j];
				tmpRows +=
					'<div class="pict-keybindings-row">' +
						'<div class="pict-keybindings-keys">' + this._keysHTML(tmpBinding.Keys) + '</div>' +
						'<div class="pict-keybindings-meta">' +
							'<span class="pict-keybindings-name">' + this._escape(tmpBinding.Name) + '</span>' +
							(tmpBinding.Description ? '<span class="pict-keybindings-desc">' + this._escape(tmpBinding.Description) + '</span>' : '') +
							(tmpBinding.HelpTopic ? this._helpLinkHTML(tmpBinding.HelpTopic) : '') +
						'</div>' +
					'</div>';
			}
			tmpBody +=
				'<div class="pict-keybindings-group">' +
					'<div class="pict-keybindings-group-title">' + this._escape(tmpGroup.Group) + '</div>' +
					tmpRows +
				'</div>';
		}
		return '<div class="pict-keybindings-panel">' +
			'<div class="pict-keybindings-head">' +
				'<span class="pict-keybindings-title">' + tmpTitle + '</span>' +
				'<button class="pict-keybindings-close" type="button" aria-label="Close">&times;</button>' +
			'</div>' +
			'<div class="pict-keybindings-bodyscroll">' + tmpBody + '</div>' +
		'</div>';
	}

	_keysHTML(pStepsTokens)
	{
		let tmpSteps = pStepsTokens || [];
		let tmpParts = [];
		for (let i = 0; i < tmpSteps.length; i++)
		{
			let tmpChips = tmpSteps[i].map((pToken) => '<kbd>' + this._escape(pToken) + '</kbd>').join('');
			tmpParts.push('<span class="pict-keybindings-chord">' + tmpChips + '</span>');
		}
		return tmpParts.join('<span class="pict-keybindings-then">then</span>');
	}

	_helpLinkHTML(pTopic)
	{
		if (/^https?:\/\//.test(pTopic))
		{
			return '<a class="pict-keybindings-help" href="' + this._escape(pTopic) + '" target="_blank" rel="noopener">Learn more</a>';
		}
		return '<a class="pict-keybindings-help" href="#" data-kb-route="' + this._escape(pTopic) + '">Learn more</a>';
	}

	_escape(pStr)
	{
		return String(pStr == null ? '' : pStr)
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
	}
}

module.exports = PictProviderKeybindings;
module.exports.default_configuration = _DefaultProviderConfiguration;

// The pure engine, exported for direct use and unit testing.
module.exports.KeybindingRegistry = libRegistry;

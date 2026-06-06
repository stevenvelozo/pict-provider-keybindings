'use strict';

/**
 * Keybinding-Registry
 *
 * The pure, DOM-free engine behind pict-provider-keybindings. It owns the
 * owner -> bindings map and does parse / normalize / match / eligibility /
 * conflict / sequence buffering / grouping / platform formatting. It never
 * touches `document` or `window`: environmental facts (is an input focused? is
 * an owner's view still in the DOM?) are passed in by the provider shell, and
 * firing a Route is delegated to an injected `onRoute` callback. This split
 * keeps ~all behavior unit-testable by feeding plain `{ key, ctrl, ... }`
 * objects, with no jsdom.
 *
 * @author Steven Velozo <steven@velozo.com>
 * @license MIT
 */

// Canonical key aliases (lowercased input -> canonical key matching event.key).
// Canonical names are themselves included (lowercased) so authored "Escape",
// "ArrowUp", etc. round-trip cleanly.
const _KEY_ALIASES =
{
	esc: 'Escape', escape: 'Escape',
	del: 'Delete', delete: 'Delete', ins: 'Insert', insert: 'Insert',
	space: ' ', spacebar: ' ',
	up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
	arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight',
	enter: 'Enter', return: 'Enter', ret: 'Enter',
	tab: 'Tab', backspace: 'Backspace', bksp: 'Backspace',
	pageup: 'PageUp', pgup: 'PageUp', pagedown: 'PageDown', pgdn: 'PageDown',
	home: 'Home', end: 'End',
	plus: '+', comma: ',', period: '.', dot: '.', slash: '/', backslash: '\\'
};

const _DISPLAY_KEYS =
{
	' ': 'Space', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
	Enter: '↵', Escape: 'Esc', Backspace: '⌫', Tab: 'Tab'
};

class KeybindingRegistry
{
	/**
	 * @param {object} [pOptions] - { isMac, sequenceTimeoutMS, now, log, onRoute }
	 */
	constructor(pOptions)
	{
		let tmpOptions = pOptions || {};
		this.isMac = !!tmpOptions.isMac;
		this.sequenceTimeoutMS = (typeof tmpOptions.sequenceTimeoutMS === 'number') ? tmpOptions.sequenceTimeoutMS : 1000;
		this.now = (typeof tmpOptions.now === 'function') ? tmpOptions.now : function () { return Date.now(); };
		this.log = tmpOptions.log || null;
		// Called for a fired binding that has a Route (rather than a Handler).
		this.onRoute = (typeof tmpOptions.onRoute === 'function') ? tmpOptions.onRoute : null;

		// owner key -> { destinationSelector, group, bindings: { hash -> entry } }
		this._owners = {};
		// monotonic registration counter for the recency tie-break
		this._seq = 0;
		// ref-counted active scope set: name -> count
		this._activeScopes = {};
		// in-progress key sequence: array of normalized events
		this._buffer = [];
		this._bufferExpires = 0;
	}

	// ── parsing ────────────────────────────────────────────────────────────────

	/**
	 * Parse a combo string into an array of step matchers (a sequence). One step
	 * for a plain chord. Returns null on an unparseable combo.
	 */
	parseCombo(pCombo)
	{
		if (typeof pCombo !== 'string') { return null; }
		let tmpTrimmed = pCombo.trim();
		if (!tmpTrimmed) { return null; }
		let tmpSteps = tmpTrimmed.split(/\s+/);
		let tmpMatchers = [];
		for (let i = 0; i < tmpSteps.length; i++)
		{
			let tmpMatcher = this._parseStep(tmpSteps[i]);
			if (!tmpMatcher) { return null; }
			tmpMatchers.push(tmpMatcher);
		}
		return tmpMatchers;
	}

	_parseStep(pStep)
	{
		// Tokens are '+'-separated. Empty tokens (from a literal trailing '+') are
		// ignored; author a literal plus as the alias "plus".
		let tmpTokens = pStep.split('+');
		let tmpMatcher = { key: null, mod: false, ctrl: false, meta: false, alt: false, shift: null };
		let tmpShiftExplicit = false;
		for (let i = 0; i < tmpTokens.length; i++)
		{
			let tmpToken = tmpTokens[i];
			if (tmpToken === '') { continue; }
			let tmpModifier = this._modifierFor(tmpToken.toLowerCase());
			if (tmpModifier)
			{
				if (tmpModifier === 'shift') { tmpMatcher.shift = true; tmpShiftExplicit = true; }
				else { tmpMatcher[tmpModifier] = true; }
			}
			else
			{
				// The (single) non-modifier token is the key.
				tmpMatcher.key = this._normalizeKey(tmpToken);
			}
		}
		if (!tmpMatcher.key) { return null; }
		// A shifted symbol authored without an explicit Shift (e.g. "?") is matched
		// on the resulting character directly, so Shift is a don't-care.
		if (!tmpShiftExplicit) { tmpMatcher.shift = null; }
		return tmpMatcher;
	}

	_modifierFor(pToken)
	{
		switch (pToken)
		{
			case 'mod': return 'mod';
			case 'ctrl': case 'control': return 'ctrl';
			case 'meta': case 'cmd': case 'command': case 'win': case 'windows': case 'super': return 'meta';
			case 'alt': case 'option': case 'opt': return 'alt';
			case 'shift': return 'shift';
			default: return null;
		}
	}

	_normalizeKey(pToken)
	{
		let tmpLower = pToken.toLowerCase();
		if (Object.prototype.hasOwnProperty.call(_KEY_ALIASES, tmpLower)) { return _KEY_ALIASES[tmpLower]; }
		// Function keys: f1..f24 -> F1..F24
		if (/^f([1-9]|1[0-9]|2[0-4])$/.test(tmpLower)) { return 'F' + tmpLower.slice(1); }
		// Single characters compare case-insensitively (Shift is matched separately).
		if (pToken.length === 1) { return tmpLower; }
		return pToken;
	}

	// ── matching ─────────────────────────────────────────────────────────────

	_eventKeyCanonical(pKey)
	{
		if (typeof pKey !== 'string') { return ''; }
		if (pKey.length === 1) { return pKey.toLowerCase(); }
		return pKey;
	}

	_stepMatches(pMatcher, pEvent)
	{
		let tmpNeedCtrl = pMatcher.ctrl || (pMatcher.mod && !this.isMac);
		let tmpNeedMeta = pMatcher.meta || (pMatcher.mod && this.isMac);
		if (!!pEvent.ctrl !== !!tmpNeedCtrl) { return false; }
		if (!!pEvent.meta !== !!tmpNeedMeta) { return false; }
		if (!!pEvent.alt !== !!pMatcher.alt) { return false; }
		if (pMatcher.shift !== null && (!!pEvent.shift !== !!pMatcher.shift)) { return false; }
		return this._eventKeyCanonical(pEvent.key) === pMatcher.key;
	}

	// ── registration ───────────────────────────────────────────────────────────

	/** Replace ALL bindings for an owner (the view-lifecycle API). */
	registerOwner(pOwnerKey, pBindings, pOptions)
	{
		let tmpOptions = pOptions || {};
		let tmpOwner = { destinationSelector: tmpOptions.destinationSelector || null, group: tmpOptions.group || null, bindings: {} };
		let tmpHashes = [];
		let tmpList = Array.isArray(pBindings) ? pBindings : [];
		for (let i = 0; i < tmpList.length; i++)
		{
			let tmpEntry = this._normalizeEntry(pOwnerKey, tmpList[i], tmpOwner.group);
			if (tmpEntry)
			{
				tmpOwner.bindings[tmpEntry.Hash] = tmpEntry;
				tmpHashes.push(tmpEntry.Hash);
			}
		}
		this._owners[pOwnerKey] = tmpOwner;
		return tmpHashes;
	}

	/** Add (merge) a single binding under the reserved app owner. */
	register(pBinding)
	{
		let tmpOwner = this._owners['__app__'] || { destinationSelector: null, group: null, bindings: {} };
		let tmpEntry = this._normalizeEntry('__app__', pBinding, tmpOwner.group);
		if (!tmpEntry) { return null; }
		tmpOwner.bindings[tmpEntry.Hash] = tmpEntry;
		this._owners['__app__'] = tmpOwner;
		return tmpEntry.Hash;
	}

	_normalizeEntry(pOwnerKey, pInput, pDefaultGroup)
	{
		if (!pInput || typeof pInput !== 'object') { return null; }
		let tmpCombo = pInput.Keys || pInput.Combo || pInput.Key;
		let tmpMatchers = this.parseCombo(tmpCombo);
		if (!tmpMatchers)
		{
			if (this.log) { this.log.warn('pict-provider-keybindings: ignoring binding with invalid combo "' + tmpCombo + '"'); }
			return null;
		}
		let tmpHasHandler = (typeof pInput.Handler === 'function');
		let tmpHasRoute = (typeof pInput.Route === 'string' && pInput.Route.length > 0);
		if (!tmpHasHandler && !tmpHasRoute)
		{
			if (this.log) { this.log.warn('pict-provider-keybindings: binding "' + tmpCombo + '" has neither a Handler nor a Route; ignoring'); }
			return null;
		}
		return {
			Hash: pInput.Hash || tmpCombo,
			Owner: pOwnerKey,
			Combo: tmpCombo,
			Matchers: tmpMatchers,
			Name: pInput.Name || tmpCombo,
			Description: pInput.Description || '',
			Group: pInput.Group || pDefaultGroup || 'General',
			HelpTopic: pInput.HelpTopic || null,
			Handler: tmpHasHandler ? pInput.Handler : null,
			Route: tmpHasRoute ? pInput.Route : null,
			AllowInInput: !!pInput.AllowInInput,
			AllowRepeat: !!pInput.AllowRepeat,
			Priority: (typeof pInput.Priority === 'number') ? pInput.Priority : 500,
			PreventDefault: (pInput.PreventDefault !== false),
			StopPropagation: (pInput.StopPropagation !== false),
			Enabled: (pInput.Enabled !== false),
			Scope: pInput.Scope || null,
			_seq: this._seq++
		};
	}

	clearOwner(pOwnerKey)
	{
		let tmpOwner = this._owners[pOwnerKey];
		let tmpCount = tmpOwner ? Object.keys(tmpOwner.bindings).length : 0;
		delete this._owners[pOwnerKey];
		return tmpCount;
	}

	removeBinding(pOwnerKey, pHash)
	{
		let tmpOwner = this._owners[pOwnerKey];
		if (tmpOwner && tmpOwner.bindings[pHash]) { delete tmpOwner.bindings[pHash]; return true; }
		return false;
	}

	clearAll()
	{
		this._owners = {};
		this._buffer = [];
	}

	setEnabled(pOwnerKey, pHash, pEnabled)
	{
		let tmpOwner = this._owners[pOwnerKey];
		if (tmpOwner && tmpOwner.bindings[pHash]) { tmpOwner.bindings[pHash].Enabled = !!pEnabled; return true; }
		return false;
	}

	// ── scopes (ref-counted) ─────────────────────────────────────────────────

	pushScope(pName) { this._activeScopes[pName] = (this._activeScopes[pName] || 0) + 1; }
	popScope(pName)
	{
		if (this._activeScopes[pName])
		{
			this._activeScopes[pName]--;
			if (this._activeScopes[pName] <= 0) { delete this._activeScopes[pName]; }
		}
	}
	getActiveScopes() { return Object.keys(this._activeScopes); }

	// ── dead-owner pruning ───────────────────────────────────────────────────

	/**
	 * Drop owners whose declared destination is no longer alive. pOwnerAlive is a
	 * predicate (ownerKey, ownerObject) -> boolean supplied by the shell (it does
	 * the document.querySelector). Owners with no destinationSelector (app-global,
	 * or programmatic owners that manage their own lifetime) are never pruned.
	 */
	pruneDeadOwners(pOwnerAlive)
	{
		if (typeof pOwnerAlive !== 'function') { return; }
		let tmpKeys = Object.keys(this._owners);
		for (let i = 0; i < tmpKeys.length; i++)
		{
			let tmpKey = tmpKeys[i];
			if (tmpKey === '__app__') { continue; }
			let tmpOwner = this._owners[tmpKey];
			if (!tmpOwner.destinationSelector) { continue; }
			if (!pOwnerAlive(tmpKey, tmpOwner)) { delete this._owners[tmpKey]; }
		}
	}

	// ── dispatch ───────────────────────────────────────────────────────────────

	/**
	 * Match a normalized keydown event against the registry and fire the winner.
	 * @param {object} pEvent - { key, ctrl, meta, shift, alt, repeat, isComposing, keyCode, originalEvent }
	 * @param {object} [pEnv] - { inputFocused:boolean, ownerAlive:function }
	 * @returns {object} { matched, entry, sequenceInProgress }
	 */
	dispatch(pEvent, pEnv)
	{
		let tmpEnv = pEnv || {};

		// IME composition — never match (CJK / dead keys).
		if (pEvent.isComposing || pEvent.keyCode === 229) { return { matched: false, sequenceInProgress: false }; }
		// A bare modifier press is never a binding by itself.
		if (pEvent.key === 'Shift' || pEvent.key === 'Control' || pEvent.key === 'Alt' || pEvent.key === 'Meta')
		{
			return { matched: false, sequenceInProgress: false };
		}

		this.pruneDeadOwners(tmpEnv.ownerAlive);

		// Expire a stale in-progress sequence.
		let tmpNow = this.now();
		if (this._buffer.length && tmpNow > this._bufferExpires) { this._buffer = []; }

		let tmpStepIndex = this._buffer.length;
		let tmpCandidates = this._eligibleBindings(pEvent, !!tmpEnv.inputFocused);
		let tmpCompleted = [];
		let tmpInProgress = false;

		for (let i = 0; i < tmpCandidates.length; i++)
		{
			let tmpEntry = tmpCandidates[i];
			if (tmpStepIndex >= tmpEntry.Matchers.length) { continue; }
			if (!this._bufferMatchesPrefix(tmpEntry, tmpStepIndex)) { continue; }
			if (!this._stepMatches(tmpEntry.Matchers[tmpStepIndex], pEvent)) { continue; }
			if (tmpStepIndex + 1 === tmpEntry.Matchers.length) { tmpCompleted.push(tmpEntry); }
			else { tmpInProgress = true; }
		}

		if (tmpCompleted.length)
		{
			this._buffer = [];
			let tmpWinner = this._resolveConflict(tmpCompleted);
			this._fire(tmpWinner, pEvent);
			return { matched: true, entry: tmpWinner, sequenceInProgress: false };
		}

		if (tmpInProgress)
		{
			// Record this step and keep waiting for the rest of the sequence.
			this._buffer.push({ key: pEvent.key, ctrl: !!pEvent.ctrl, meta: !!pEvent.meta, shift: !!pEvent.shift, alt: !!pEvent.alt });
			this._bufferExpires = tmpNow + this.sequenceTimeoutMS;
			return { matched: false, sequenceInProgress: true };
		}

		// A stray key breaks any in-progress sequence.
		this._buffer = [];
		return { matched: false, sequenceInProgress: false };
	}

	_bufferMatchesPrefix(pEntry, pStepIndex)
	{
		for (let j = 0; j < pStepIndex; j++)
		{
			if (!this._stepMatches(pEntry.Matchers[j], this._buffer[j])) { return false; }
		}
		return true;
	}

	_eligibleBindings(pEvent, pInputFocused)
	{
		let tmpList = [];
		let tmpOwnerKeys = Object.keys(this._owners);
		for (let i = 0; i < tmpOwnerKeys.length; i++)
		{
			let tmpBindings = this._owners[tmpOwnerKeys[i]].bindings;
			let tmpHashes = Object.keys(tmpBindings);
			for (let j = 0; j < tmpHashes.length; j++)
			{
				let tmpEntry = tmpBindings[tmpHashes[j]];
				if (!tmpEntry.Enabled) { continue; }
				if (tmpEntry.Scope && !this._activeScopes[tmpEntry.Scope]) { continue; }
				if (pEvent.repeat && !tmpEntry.AllowRepeat) { continue; }
				if (pInputFocused && !this._inputAllowed(tmpEntry)) { continue; }
				tmpList.push(tmpEntry);
			}
		}
		return tmpList;
	}

	_inputAllowed(pEntry)
	{
		if (pEntry.AllowInInput) { return true; }
		// Conventionally, chords with a real (non-Shift) modifier still fire while
		// typing (e.g. Mod+S). Bare-key / Shift-only bindings are suppressed.
		let tmpFirst = pEntry.Matchers[0];
		return !!(tmpFirst && (tmpFirst.mod || tmpFirst.ctrl || tmpFirst.meta || tmpFirst.alt));
	}

	_resolveConflict(pList)
	{
		let tmpSorted = pList.slice().sort((a, b) =>
		{
			if (b.Priority !== a.Priority) { return b.Priority - a.Priority; }
			let tmpAApp = (a.Owner === '__app__') ? 0 : 1;
			let tmpBApp = (b.Owner === '__app__') ? 0 : 1;
			if (tmpBApp !== tmpAApp) { return tmpBApp - tmpAApp; }
			return b._seq - a._seq;
		});
		return tmpSorted[0];
	}

	_fire(pEntry, pEvent)
	{
		try
		{
			if (pEntry.Route)
			{
				if (this.onRoute) { this.onRoute(pEntry.Route, pEntry); }
				else if (this.log) { this.log.warn('pict-provider-keybindings: binding "' + pEntry.Combo + '" has a Route but no router is wired'); }
			}
			else if (pEntry.Handler)
			{
				pEntry.Handler((pEvent && pEvent.originalEvent) || pEvent, pEntry);
			}
		}
		catch (pError)
		{
			if (this.log) { this.log.warn('pict-provider-keybindings: handler for "' + pEntry.Combo + '" threw: ' + (pError.message || pError)); }
		}
	}

	// ── introspection / cheatsheet data ──────────────────────────────────────

	getBindings()
	{
		let tmpList = [];
		let tmpOwnerKeys = Object.keys(this._owners);
		for (let i = 0; i < tmpOwnerKeys.length; i++)
		{
			let tmpBindings = this._owners[tmpOwnerKeys[i]].bindings;
			let tmpHashes = Object.keys(tmpBindings);
			for (let j = 0; j < tmpHashes.length; j++) { tmpList.push(tmpBindings[tmpHashes[j]]); }
		}
		return tmpList;
	}

	getOwners() { return Object.keys(this._owners); }

	/**
	 * The display-ready set of currently-active bindings, dead owners pruned.
	 * @param {object} [pOptions] - { flat, groupOrder }
	 * @param {function} [pOwnerAlive] - liveness predicate from the shell
	 */
	getActive(pOptions, pOwnerAlive)
	{
		this.pruneDeadOwners(pOwnerAlive);
		let tmpList = this.getBindings().filter((pEntry) => pEntry.Enabled);
		if (pOptions && pOptions.flat) { return tmpList.map((pEntry) => this._displayRecord(pEntry)); }
		return this.group(tmpList, pOptions);
	}

	group(pList, pOptions)
	{
		let tmpOptions = pOptions || {};
		let tmpGroupOrder = tmpOptions.groupOrder || [];
		let tmpByGroup = {};
		for (let i = 0; i < pList.length; i++)
		{
			let tmpEntry = pList[i];
			let tmpGroup = tmpEntry.Group || 'General';
			if (!tmpByGroup[tmpGroup]) { tmpByGroup[tmpGroup] = []; }
			tmpByGroup[tmpGroup].push(this._displayRecord(tmpEntry));
		}
		let tmpGroupNames = Object.keys(tmpByGroup).sort((a, b) =>
		{
			let tmpIA = tmpGroupOrder.indexOf(a);
			let tmpIB = tmpGroupOrder.indexOf(b);
			if (tmpIA >= 0 && tmpIB >= 0) { return tmpIA - tmpIB; }
			if (tmpIA >= 0) { return -1; }
			if (tmpIB >= 0) { return 1; }
			return a.localeCompare(b);
		});
		return tmpGroupNames.map((pGroup) => (
			{
				Group: pGroup,
				Bindings: tmpByGroup[pGroup].sort((x, y) => x.Name.localeCompare(y.Name))
			}));
	}

	_displayRecord(pEntry)
	{
		return {
			Combo: pEntry.Combo,
			Label: this.formatCombo(pEntry.Matchers),
			Keys: this._comboKeyTokens(pEntry.Matchers),
			Name: pEntry.Name,
			Description: pEntry.Description,
			HelpTopic: pEntry.HelpTopic
		};
	}

	// ── platform-aware formatting ────────────────────────────────────────────

	formatCombo(pCombo)
	{
		let tmpMatchers = (typeof pCombo === 'string') ? this.parseCombo(pCombo) : pCombo;
		if (!tmpMatchers) { return ''; }
		return tmpMatchers.map((pMatcher) => this._stepKeyTokens(pMatcher).join(this.isMac ? '' : '+')).join(' ');
	}

	_comboKeyTokens(pMatchers)
	{
		if (!pMatchers) { return []; }
		return pMatchers.map((pMatcher) => this._stepKeyTokens(pMatcher));
	}

	_stepKeyTokens(pMatcher)
	{
		let tmpTokens = [];
		let tmpWantMeta = pMatcher.meta || (pMatcher.mod && this.isMac);
		let tmpWantCtrl = pMatcher.ctrl || (pMatcher.mod && !this.isMac);
		if (this.isMac)
		{
			if (tmpWantCtrl) { tmpTokens.push('⌃'); }
			if (pMatcher.alt) { tmpTokens.push('⌥'); }
			if (pMatcher.shift === true) { tmpTokens.push('⇧'); }
			if (tmpWantMeta) { tmpTokens.push('⌘'); }
		}
		else
		{
			if (tmpWantCtrl) { tmpTokens.push('Ctrl'); }
			if (pMatcher.alt) { tmpTokens.push('Alt'); }
			if (pMatcher.shift === true) { tmpTokens.push('Shift'); }
			if (tmpWantMeta) { tmpTokens.push('Win'); }
		}
		tmpTokens.push(this._formatKey(pMatcher.key));
		return tmpTokens;
	}

	_formatKey(pKey)
	{
		if (Object.prototype.hasOwnProperty.call(_DISPLAY_KEYS, pKey)) { return _DISPLAY_KEYS[pKey]; }
		if (typeof pKey === 'string' && pKey.length === 1) { return pKey.toUpperCase(); }
		return pKey;
	}
}

module.exports = KeybindingRegistry;

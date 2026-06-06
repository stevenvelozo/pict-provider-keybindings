/**
 * pict-provider-keybindings — Unit Tests
 *
 * The pure engine (Keybinding-Registry) is exercised directly with plain
 * event-like objects (no jsdom). A few provider-level tests cover suspend/resume
 * and the no-DOM safety of the overlay methods.
 */
const libAssert = require('assert');
const libFable = require('fable');

const libKeybindings = require('../source/Pict-Provider-Keybindings.js');
const libRegistry = libKeybindings.KeybindingRegistry;

suite
(
	'pict-provider-keybindings',
	() =>
	{
		function makeRegistry(pOptions)
		{
			return new libRegistry(Object.assign({ isMac: false }, pOptions || {}));
		}

		function ev(pOverrides)
		{
			return Object.assign(
				{ key: '', ctrl: false, meta: false, shift: false, alt: false, repeat: false, isComposing: false, keyCode: 0 },
				pOverrides || {});
		}

		function createProvider()
		{
			let tmpFable = new libFable(
				{
					Product: 'KeybindTest',
					LogStreams: [{ streamtype: 'console', level: 'fatal' }]
				});
			let tmpProvider = new libKeybindings(tmpFable, {}, 'TestKeybindings');
			tmpProvider.pict = { AppData: {}, CSSMap: {}, providers: {}, views: {} };
			tmpProvider.log = tmpFable.log;
			return tmpProvider;
		}

		suite
		(
			'Module exports',
			() =>
			{
				test('exports the provider class + default_configuration + engine', (fDone) =>
				{
					libAssert.strictEqual(typeof libKeybindings, 'function');
					libAssert.ok(libKeybindings.default_configuration);
					libAssert.strictEqual(typeof libKeybindings.KeybindingRegistry, 'function');
					fDone();
				});
			}
		);

		suite
		(
			'parseCombo',
			() =>
			{
				test('parses a single chord', (fDone) =>
				{
					let tmpR = makeRegistry();
					let tmpMatchers = tmpR.parseCombo('Mod+K');
					libAssert.strictEqual(tmpMatchers.length, 1);
					libAssert.strictEqual(tmpMatchers[0].mod, true);
					libAssert.strictEqual(tmpMatchers[0].key, 'k');
					fDone();
				});

				test('parses multiple modifiers + explicit shift', (fDone) =>
				{
					let tmpM = makeRegistry().parseCombo('Ctrl+Shift+P')[0];
					libAssert.strictEqual(tmpM.ctrl, true);
					libAssert.strictEqual(tmpM.shift, true);
					libAssert.strictEqual(tmpM.key, 'p');
					fDone();
				});

				test('shifted symbol "?" has don\'t-care shift', (fDone) =>
				{
					let tmpM = makeRegistry().parseCombo('?')[0];
					libAssert.strictEqual(tmpM.key, '?');
					libAssert.strictEqual(tmpM.shift, null);
					fDone();
				});

				test('parses a two-step sequence', (fDone) =>
				{
					libAssert.strictEqual(makeRegistry().parseCombo('g i').length, 2);
					let tmpSeq = makeRegistry().parseCombo('Mod+K Mod+S');
					libAssert.strictEqual(tmpSeq.length, 2);
					libAssert.ok(tmpSeq[0].mod && tmpSeq[1].mod);
					fDone();
				});

				test('resolves key aliases', (fDone) =>
				{
					let tmpR = makeRegistry();
					libAssert.strictEqual(tmpR.parseCombo('esc')[0].key, 'Escape');
					libAssert.strictEqual(tmpR.parseCombo('space')[0].key, ' ');
					libAssert.strictEqual(tmpR.parseCombo('up')[0].key, 'ArrowUp');
					libAssert.strictEqual(tmpR.parseCombo('f5')[0].key, 'F5');
					fDone();
				});

				test('cmd / meta / super / command are equivalent', (fDone) =>
				{
					let tmpR = makeRegistry();
					libAssert.strictEqual(tmpR.parseCombo('cmd+s')[0].meta, true);
					libAssert.strictEqual(tmpR.parseCombo('meta+s')[0].meta, true);
					libAssert.strictEqual(tmpR.parseCombo('super+s')[0].meta, true);
					libAssert.strictEqual(tmpR.parseCombo('command+s')[0].meta, true);
					fDone();
				});

				test('rejects garbage', (fDone) =>
				{
					let tmpR = makeRegistry();
					libAssert.strictEqual(tmpR.parseCombo(''), null);
					libAssert.strictEqual(tmpR.parseCombo('   '), null);
					libAssert.strictEqual(tmpR.parseCombo(123), null);
					libAssert.strictEqual(tmpR.parseCombo('Ctrl+'), null);
					fDone();
				});
			}
		);

		suite
		(
			'Mod resolution by platform',
			() =>
			{
				test('Mod = Cmd on mac', (fDone) =>
				{
					let tmpR = makeRegistry({ isMac: true });
					let tmpFired = false;
					tmpR.register({ Keys: 'Mod+s', Handler: () => { tmpFired = true; } });
					tmpR.dispatch(ev({ key: 's', meta: true }), {});
					libAssert.strictEqual(tmpFired, true);
					fDone();
				});

				test('Mod is NOT Ctrl on mac', (fDone) =>
				{
					let tmpR = makeRegistry({ isMac: true });
					let tmpFired = false;
					tmpR.register({ Keys: 'Mod+s', Handler: () => { tmpFired = true; } });
					tmpR.dispatch(ev({ key: 's', ctrl: true }), {});
					libAssert.strictEqual(tmpFired, false);
					fDone();
				});

				test('Mod = Ctrl off mac', (fDone) =>
				{
					let tmpR = makeRegistry({ isMac: false });
					let tmpFired = false;
					tmpR.register({ Keys: 'Mod+s', Handler: () => { tmpFired = true; } });
					tmpR.dispatch(ev({ key: 's', ctrl: true }), {});
					libAssert.strictEqual(tmpFired, true);
					fDone();
				});
			}
		);

		suite
		(
			'Single-step matching',
			() =>
			{
				test('exact match fires; wrong modifier does not; case-insensitive', (fDone) =>
				{
					let tmpR = makeRegistry();
					let tmpHits = 0;
					tmpR.register({ Keys: 'Ctrl+k', Handler: () => { tmpHits++; } });
					tmpR.dispatch(ev({ key: 'K', ctrl: true }), {}); // uppercase K still matches
					tmpR.dispatch(ev({ key: 'k' }), {});             // no ctrl, no match
					tmpR.dispatch(ev({ key: 'k', ctrl: true, alt: true }), {}); // extra alt, no match
					libAssert.strictEqual(tmpHits, 1);
					fDone();
				});
			}
		);

		suite
		(
			'Input-focus guarding',
			() =>
			{
				test('bare keys suppressed in inputs; AllowInInput + modifier chords fire', (fDone) =>
				{
					let tmpR = makeRegistry();
					let tmpHits = {};
					tmpR.register({ Keys: '?', Hash: 'help', Handler: () => { tmpHits.help = true; } });
					tmpR.register({ Keys: 'a', Hash: 'allowed', AllowInInput: true, Handler: () => { tmpHits.allowed = true; } });
					tmpR.register({ Keys: 'Mod+s', Hash: 'save', Handler: () => { tmpHits.save = true; } });
					tmpR.register({ Keys: 'Shift+b', Hash: 'shifted', Handler: () => { tmpHits.shifted = true; } });

					tmpR.dispatch(ev({ key: '?' }), { inputFocused: true });
					tmpR.dispatch(ev({ key: 'a' }), { inputFocused: true });
					tmpR.dispatch(ev({ key: 's', ctrl: true }), { inputFocused: true });
					tmpR.dispatch(ev({ key: 'b', shift: true }), { inputFocused: true });

					libAssert.strictEqual(!!tmpHits.help, false);
					libAssert.strictEqual(!!tmpHits.allowed, true);
					libAssert.strictEqual(!!tmpHits.save, true);
					libAssert.strictEqual(!!tmpHits.shifted, false);
					fDone();
				});
			}
		);

		suite
		(
			'IME + auto-repeat guards',
			() =>
			{
				test('IME composition never matches', (fDone) =>
				{
					let tmpR = makeRegistry();
					let tmpN = 0;
					tmpR.register({ Keys: 'a', Handler: () => { tmpN++; } });
					tmpR.dispatch(ev({ key: 'a', isComposing: true }), {});
					tmpR.dispatch(ev({ key: 'a', keyCode: 229 }), {});
					libAssert.strictEqual(tmpN, 0);
					tmpR.dispatch(ev({ key: 'a' }), {});
					libAssert.strictEqual(tmpN, 1);
					fDone();
				});

				test('auto-repeat only fires AllowRepeat bindings', (fDone) =>
				{
					let tmpR = makeRegistry();
					let tmpN = 0; let tmpM = 0;
					tmpR.register({ Keys: 'a', Hash: 'a', Handler: () => { tmpN++; } });
					tmpR.register({ Keys: 'b', Hash: 'b', AllowRepeat: true, Handler: () => { tmpM++; } });
					tmpR.dispatch(ev({ key: 'a', repeat: true }), {});
					tmpR.dispatch(ev({ key: 'b', repeat: true }), {});
					libAssert.strictEqual(tmpN, 0);
					libAssert.strictEqual(tmpM, 1);
					fDone();
				});
			}
		);

		suite
		(
			'Route vs Handler dispatch',
			() =>
			{
				test('Route calls onRoute; Handler invoked with (event, entry)', (fDone) =>
				{
					let tmpRouted = null;
					let tmpR = makeRegistry({ onRoute: (pRoute) => { tmpRouted = pRoute; } });
					tmpR.register({ Keys: 'g', Route: '/board' });
					tmpR.dispatch(ev({ key: 'g' }), {});
					libAssert.strictEqual(tmpRouted, '/board');

					let tmpEntrySeen = null; let tmpEventSeen = null;
					let tmpOriginal = { tag: 'original' };
					tmpR.register({ Keys: 'h', Handler: (pEvent, pEntry) => { tmpEventSeen = pEvent; tmpEntrySeen = pEntry; } });
					tmpR.dispatch(ev({ key: 'h', originalEvent: tmpOriginal }), {});
					libAssert.strictEqual(tmpEntrySeen.Combo, 'h');
					libAssert.strictEqual(tmpEventSeen, tmpOriginal);
					fDone();
				});

				test('binding with neither Handler nor Route is rejected', (fDone) =>
				{
					let tmpR = makeRegistry();
					libAssert.strictEqual(tmpR.register({ Keys: 'a' }), null);
					libAssert.strictEqual(tmpR.register({ Handler: () => {} }), null);
					fDone();
				});
			}
		);

		suite
		(
			'Conflict resolution',
			() =>
			{
				test('higher Priority wins', (fDone) =>
				{
					let tmpR = makeRegistry();
					let tmpWin = null;
					tmpR.register({ Keys: 'x', Hash: 'low', Priority: 100, Handler: () => { tmpWin = 'low'; } });
					tmpR.register({ Keys: 'x', Hash: 'high', Priority: 900, Handler: () => { tmpWin = 'high'; } });
					tmpR.dispatch(ev({ key: 'x' }), {});
					libAssert.strictEqual(tmpWin, 'high');
					fDone();
				});

				test('view owner beats app owner at equal priority', (fDone) =>
				{
					let tmpR = makeRegistry();
					let tmpWin = null;
					tmpR.register({ Keys: 'y', Hash: 'app-y', Handler: () => { tmpWin = 'app'; } });
					tmpR.registerOwner('view1', [{ Keys: 'y', Hash: 'view-y', Handler: () => { tmpWin = 'view'; } }], {});
					tmpR.dispatch(ev({ key: 'y' }), {});
					libAssert.strictEqual(tmpWin, 'view');
					fDone();
				});
			}
		);

		suite
		(
			'Owner registration lifecycle',
			() =>
			{
				test('registerOwner replaces (idempotent across re-renders)', (fDone) =>
				{
					let tmpR = makeRegistry();
					tmpR.registerOwner('v', [{ Keys: 'a', Handler: () => {} }, { Keys: 'b', Handler: () => {} }], {});
					tmpR.registerOwner('v', [{ Keys: 'a', Handler: () => {} }, { Keys: 'b', Handler: () => {} }], {});
					libAssert.strictEqual(tmpR.getBindings().length, 2);
					fDone();
				});

				test('clearOwner / removeBinding / clearAll', (fDone) =>
				{
					let tmpR = makeRegistry();
					tmpR.registerOwner('v', [{ Keys: 'a', Hash: 'a', Handler: () => {} }, { Keys: 'b', Hash: 'b', Handler: () => {} }], {});
					libAssert.strictEqual(tmpR.removeBinding('v', 'a'), true);
					libAssert.strictEqual(tmpR.getBindings().length, 1);
					libAssert.strictEqual(tmpR.clearOwner('v'), 1);
					libAssert.strictEqual(tmpR.getBindings().length, 0);
					tmpR.register({ Keys: 'z', Handler: () => {} });
					tmpR.clearAll();
					libAssert.strictEqual(tmpR.getBindings().length, 0);
					fDone();
				});
			}
		);

		suite
		(
			'Dead-owner pruning',
			() =>
			{
				test('owner with a dead destination is pruned and does not fire', (fDone) =>
				{
					let tmpR = makeRegistry();
					let tmpFired = false;
					tmpR.registerOwner('deadview', [{ Keys: 'z', Handler: () => { tmpFired = true; } }], { destinationSelector: '#gone' });
					let tmpOwnerAlive = (pKey) => pKey !== 'deadview';
					tmpR.dispatch(ev({ key: 'z' }), { ownerAlive: tmpOwnerAlive });
					libAssert.strictEqual(tmpFired, false);
					libAssert.strictEqual(tmpR.getOwners().indexOf('deadview'), -1);
					fDone();
				});

				test('app owner (no selector) is never pruned', (fDone) =>
				{
					let tmpR = makeRegistry();
					let tmpFired = false;
					tmpR.register({ Keys: 'q', Handler: () => { tmpFired = true; } });
					tmpR.dispatch(ev({ key: 'q' }), { ownerAlive: () => false });
					libAssert.strictEqual(tmpFired, true);
					fDone();
				});
			}
		);

		suite
		(
			'Scopes',
			() =>
			{
				test('scoped binding fires only while its scope is active', (fDone) =>
				{
					let tmpR = makeRegistry();
					let tmpN = 0;
					tmpR.register({ Keys: 'a', Scope: 'editor', Handler: () => { tmpN++; } });
					tmpR.dispatch(ev({ key: 'a' }), {});
					libAssert.strictEqual(tmpN, 0);
					tmpR.pushScope('editor');
					tmpR.dispatch(ev({ key: 'a' }), {});
					libAssert.strictEqual(tmpN, 1);
					tmpR.popScope('editor');
					tmpR.dispatch(ev({ key: 'a' }), {});
					libAssert.strictEqual(tmpN, 1);
					fDone();
				});
			}
		);

		suite
		(
			'Sequences',
			() =>
			{
				test('a sequence fires within the timeout window', (fDone) =>
				{
					let tmpClock = { t: 1000 };
					let tmpR = makeRegistry({ now: () => tmpClock.t, sequenceTimeoutMS: 1000 });
					let tmpFired = null;
					tmpR.register({ Keys: 'g i', Handler: () => { tmpFired = 'gi'; } });
					let tmpStep1 = tmpR.dispatch(ev({ key: 'g' }), {});
					libAssert.strictEqual(tmpStep1.sequenceInProgress, true);
					tmpClock.t += 200;
					tmpR.dispatch(ev({ key: 'i' }), {});
					libAssert.strictEqual(tmpFired, 'gi');
					fDone();
				});

				test('a sequence expires past the timeout', (fDone) =>
				{
					let tmpClock = { t: 1000 };
					let tmpR = makeRegistry({ now: () => tmpClock.t, sequenceTimeoutMS: 1000 });
					let tmpFired = null;
					tmpR.register({ Keys: 'g i', Handler: () => { tmpFired = 'gi'; } });
					tmpR.dispatch(ev({ key: 'g' }), {});
					tmpClock.t += 5000;
					tmpR.dispatch(ev({ key: 'i' }), {});
					libAssert.strictEqual(tmpFired, null);
					fDone();
				});

				test('a stray key resets the sequence', (fDone) =>
				{
					let tmpClock = { t: 1000 };
					let tmpR = makeRegistry({ now: () => tmpClock.t, sequenceTimeoutMS: 1000 });
					let tmpFired = null;
					tmpR.register({ Keys: 'g i', Handler: () => { tmpFired = 'gi'; } });
					tmpR.dispatch(ev({ key: 'g' }), {});
					tmpR.dispatch(ev({ key: 'x' }), {});
					tmpR.dispatch(ev({ key: 'i' }), {});
					libAssert.strictEqual(tmpFired, null);
					fDone();
				});

				test('disambiguates g-i from g-g', (fDone) =>
				{
					let tmpR = makeRegistry({ now: () => 1000, sequenceTimeoutMS: 1000 });
					let tmpHit = null;
					tmpR.register({ Keys: 'g i', Hash: 'gi', Handler: () => { tmpHit = 'gi'; } });
					tmpR.register({ Keys: 'g g', Hash: 'gg', Handler: () => { tmpHit = 'gg'; } });
					tmpR.dispatch(ev({ key: 'g' }), {});
					tmpR.dispatch(ev({ key: 'i' }), {});
					libAssert.strictEqual(tmpHit, 'gi');
					tmpHit = null;
					tmpR.dispatch(ev({ key: 'g' }), {});
					tmpR.dispatch(ev({ key: 'g' }), {});
					libAssert.strictEqual(tmpHit, 'gg');
					fDone();
				});
			}
		);

		suite
		(
			'getActive grouping + formatCombo',
			() =>
			{
				test('groups, honors groupOrder, and supports flat', (fDone) =>
				{
					let tmpR = makeRegistry();
					tmpR.register({ Keys: 'a', Hash: 'a', Name: 'Apple', Group: 'Zebra', Handler: () => {} });
					tmpR.register({ Keys: 'b', Hash: 'b', Name: 'Banana', Group: 'Alpha', Handler: () => {} });
					let tmpGrouped = tmpR.getActive({ groupOrder: ['Zebra', 'Alpha'] });
					libAssert.strictEqual(tmpGrouped[0].Group, 'Zebra');
					libAssert.strictEqual(tmpGrouped[1].Group, 'Alpha');
					let tmpFlat = tmpR.getActive({ flat: true });
					libAssert.strictEqual(tmpFlat.length, 2);
					libAssert.ok(tmpFlat[0].Label);
					libAssert.ok(Array.isArray(tmpFlat[0].Keys));
					fDone();
				});

				test('formatCombo is platform-aware', (fDone) =>
				{
					let tmpMac = makeRegistry({ isMac: true });
					libAssert.strictEqual(tmpMac.formatCombo('Mod+K'), '⌘K');
					let tmpPC = makeRegistry({ isMac: false });
					libAssert.strictEqual(tmpPC.formatCombo('Mod+K'), 'Ctrl+K');
					libAssert.strictEqual(tmpPC.formatCombo('ArrowUp'), '↑');
					libAssert.strictEqual(tmpPC.formatCombo('g i'), 'G I');
					fDone();
				});
			}
		);

		suite
		(
			'Provider shell',
			() =>
			{
				test('suspend/resume is ref-counted', (fDone) =>
				{
					let tmpProvider = createProvider();
					libAssert.strictEqual(tmpProvider.isSuspended(), false);
					let tmpT1 = tmpProvider.suspend('modal-a');
					let tmpT2 = tmpProvider.suspend('modal-b');
					libAssert.strictEqual(tmpProvider.isSuspended(), true);
					tmpProvider.resume(tmpT1);
					libAssert.strictEqual(tmpProvider.isSuspended(), true);
					tmpProvider.resume(tmpT2);
					libAssert.strictEqual(tmpProvider.isSuspended(), false);
					fDone();
				});

				test('cheatsheet toggle is no-DOM safe', (fDone) =>
				{
					let tmpProvider = createProvider();
					libAssert.strictEqual(tmpProvider.isCheatsheetVisible(), false);
					tmpProvider.toggleCheatsheet();
					libAssert.strictEqual(tmpProvider.isCheatsheetVisible(), true);
					tmpProvider.toggleCheatsheet();
					libAssert.strictEqual(tmpProvider.isCheatsheetVisible(), false);
					fDone();
				});

				test('getActiveBindings returns grouped display records', (fDone) =>
				{
					let tmpProvider = createProvider();
					tmpProvider.registerBinding({ Keys: 'Mod+k', Name: 'Search', Description: 'Find things', Group: 'Navigation', Handler: () => {} });
					let tmpGroups = tmpProvider.getActiveBindings();
					let tmpNav = tmpGroups.find((pGroup) => pGroup.Group === 'Navigation');
					libAssert.ok(tmpNav);
					libAssert.strictEqual(tmpNav.Bindings[0].Name, 'Search');
					libAssert.ok(tmpNav.Bindings[0].Label);
					fDone();
				});

				test('registerViewBindings keys on the view Hash + destination selector', (fDone) =>
				{
					let tmpProvider = createProvider();
					let tmpFakeView = { Hash: 'V-Board', options: { DefaultDestinationAddress: '#Board' } };
					tmpProvider.registerViewBindings(tmpFakeView, [{ Keys: 'n', Name: 'New', Handler: () => {} }]);
					libAssert.ok(tmpProvider.getOwners().indexOf('V-Board') >= 0);
					fDone();
				});
			}
		);
	}
);

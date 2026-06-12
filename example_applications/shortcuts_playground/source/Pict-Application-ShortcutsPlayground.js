const libPictApplication = require('pict-application');

const libKeybindings = require('pict-provider-keybindings');
const libPictViewShortcutsPlaygroundLayout = require('./views/PictView-ShortcutsPlayground-Layout.js');

/**
 * Shortcuts Playground
 *
 * A pure-browser tour of pict-provider-keybindings. The application registers
 * the keybindings provider, then a single layout view registers a catalog of
 * demo shortcuts and renders interactive cards that explain each feature.
 */
class PictApplicationShortcutsPlayground extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		// Register the keybindings provider once. Its default configuration
		// wires the built-in "?" cheatsheet toggle and the single document
		// keydown listener during initialization.
		this.pict.addProvider('Pict-Keybindings', libKeybindings.default_configuration, libKeybindings);

		this.pict.addView('ShortcutsPlaygroundLayout', libPictViewShortcutsPlaygroundLayout.default_configuration, libPictViewShortcutsPlaygroundLayout);
	}

	onAfterInitializeAsync(fCallback)
	{
		this.pict.views.ShortcutsPlaygroundLayout.render();

		return super.onAfterInitializeAsync(fCallback);
	}
}

module.exports = PictApplicationShortcutsPlayground;

module.exports.default_configuration =
{
	Name: 'ShortcutsPlayground',
	Hash: 'ShortcutsPlayground'
};

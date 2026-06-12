const libPictApplication = require('pict-application');
const libPictRouter = require('pict-router');
const libKeybindings = require('pict-provider-keybindings');

const libViewLayout = require('./views/PictView-KanbanShortcuts-Layout.js');
const libViewBoard = require('./views/PictView-KanbanShortcuts-Board.js');
const libViewList = require('./views/PictView-KanbanShortcuts-List.js');

/**
 * Kanban Shortcuts
 *
 * A routed two-view app that shows the per-view binding lifecycle. Each content
 * view registers its own shortcuts when it renders and the provider evicts them
 * automatically when the view's DOM leaves the document on navigation — so the
 * live cheatsheet always reflects the view you are actually looking at.
 *
 * The "g b" / "g l" Route shortcuts drive pict-router directly: the keybindings
 * provider hands the Route to pict.providers['Pict-Router'].navigate().
 */
const _RouterConfiguration =
{
	ProviderIdentifier: 'Pict-Router',
	AutoInitialize: true,
	AutoInitializeOrdinal: 0,
	Routes:
	[
		{ path: '/board', template: '{~LV:Pict.PictApplication.showView(`KanbanShortcuts-Board`)~}' },
		{ path: '/list',  template: '{~LV:Pict.PictApplication.showView(`KanbanShortcuts-List`)~}' }
	]
};

class PictApplicationKanbanShortcuts extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.pict.addProvider('Pict-Keybindings', libKeybindings.default_configuration, libKeybindings);
		this.pict.addProvider('Pict-Router', _RouterConfiguration, libPictRouter);

		this.pict.addView('KanbanShortcuts-Layout', libViewLayout.default_configuration, libViewLayout);
		this.pict.addView('KanbanShortcuts-Board', libViewBoard.default_configuration, libViewBoard);
		this.pict.addView('KanbanShortcuts-List', libViewList.default_configuration, libViewList);
	}

	onAfterInitializeAsync(fCallback)
	{
		this.pict.AppData.Kanban = { CurrentView: 'KanbanShortcuts-Board' };

		// App-global Route shortcuts — these drive pict-router. They live for the
		// life of the app, unlike the per-view bindings each content view registers.
		let tmpKeys = this.pict.providers['Pict-Keybindings'];
		tmpKeys.registerBindings(
			[
				{ Keys: 'g b', Name: 'Go to Board', Description: 'Route shortcut → /board', Group: 'Navigation', Route: '/board' },
				{ Keys: 'g l', Name: 'Go to List',  Description: 'Route shortcut → /list',  Group: 'Navigation', Route: '/list' }
			]);

		this.pict.views['KanbanShortcuts-Layout'].render();

		return super.onAfterInitializeAsync(fCallback);
	}

	navigateTo(pRoute)
	{
		this.pict.providers['Pict-Router'].navigate(pRoute);
	}

	// Called by the router's route templates when a path matches.
	showView(pViewIdentifier)
	{
		if (pViewIdentifier in this.pict.views)
		{
			this.pict.AppData.Kanban.CurrentView = pViewIdentifier;
			this.pict.views[pViewIdentifier].render();
		}
	}
}

module.exports = PictApplicationKanbanShortcuts;

module.exports.default_configuration =
{
	Name: 'KanbanShortcuts',
	Hash: 'KanbanShortcuts'
};

const libPictView = require('pict-view');

/**
 * Board view — one of two routed content views.
 *
 * Registers its shortcuts under the owner key "board", tied to its own root
 * element selector ("#Kanban-Board-View"). When the user navigates to the List
 * view, that element leaves the DOM and the provider evicts these bindings
 * automatically — no teardown call. The "n" key here does something different
 * from "n" on the List view, and only the visible view's "n" is ever live.
 */
class PictViewKanbanShortcutsBoard extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._cards = [ 'Design the login screen', 'Write the API docs', 'Fix the flaky test' ];
		this._selected = -1;
		this._scopePushed = false;
	}

	get keybindings() { return this.pict.providers['Pict-Keybindings']; }
	get layout() { return this.pict.views['KanbanShortcuts-Layout']; }

	onAfterRender(pRenderable)
	{
		this.pict.CSSMap.injectCSS();

		// Per-view bindings. The explicit destinationSelector ties this owner to
		// the view's own root element, so the provider prunes them when the view
		// navigates away. (registerViewBindings(this, ...) is the one-line sugar
		// for the same thing when a view renders into its own destination.)
		this.keybindings.registerOwnerBindings('board',
			[
				{ Keys: 'n', Hash: 'board-new',     Name: 'New card',        Description: 'Add a card to the board', Group: 'Board', Handler: () => this.newCard() },
				{ Keys: 'r', Hash: 'board-refresh', Name: 'Refresh board',   Group: 'Board', Handler: () => this.refresh() },
				{ Keys: 'x', Hash: 'board-select',  Name: 'Select first card', Group: 'Board', Handler: () => this.selectFirst() },
				{ Keys: 'Backspace', Hash: 'board-delete', Name: 'Delete selected card', Description: 'Scoped — only live while a card is selected', Group: 'Board', Scope: 'card-selected', Handler: () => this.deleteSelected() }
			],
			{ destinationSelector: '#Kanban-Board-View' });

		this._renderCards();
		this.layout.logActivity('Board mounted — its shortcuts are now active.');
		this.layout.refreshActiveShortcuts();

		return super.onAfterRender(pRenderable);
	}

	_renderCards()
	{
		let tmpHTML;
		if (!this._cards.length)
		{
			tmpHTML = '<div class="kb-empty">No cards. Press <kbd>n</kbd> to add one.</div>';
		}
		else
		{
			tmpHTML = this._cards.map((pCard, pIndex) =>
				'<div class="kb-card' + (pIndex === this._selected ? ' selected' : '') + '">' + this._esc(pCard) + '</div>').join('');
		}
		this.pict.ContentAssignment.assignContent('#Kanban-Board-Cards', tmpHTML);
	}

	newCard()
	{
		this._cards.push('New task ' + (this._cards.length + 1));
		this.layout.logActivity('Board: added a card (n).');
		this._renderCards();
	}

	refresh()
	{
		this.layout.logActivity('Board: refreshed (r).');
		this._renderCards();
	}

	selectFirst()
	{
		if (!this._cards.length) { this.layout.logActivity('Board: nothing to select.'); return; }
		this._selected = 0;
		if (!this._scopePushed)
		{
			// Activating the scope makes the Backspace ("delete selected") binding eligible.
			this.keybindings.pushScope('card-selected');
			this._scopePushed = true;
		}
		this.layout.logActivity('Board: selected "' + this._cards[0] + '" — press Backspace to delete.');
		this._renderCards();
	}

	deleteSelected()
	{
		if (this._selected < 0) { return; }
		let tmpRemoved = this._cards.splice(this._selected, 1)[0];
		this._selected = -1;
		if (this._scopePushed)
		{
			this.keybindings.popScope('card-selected');
			this._scopePushed = false;
		}
		this.layout.logActivity('Board: deleted "' + tmpRemoved + '" (Backspace).');
		this._renderCards();
	}

	_esc(pStr)
	{
		return String(pStr == null ? '' : pStr)
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
	}
}

PictViewKanbanShortcutsBoard.default_configuration =
{
	ViewIdentifier: 'KanbanShortcuts-Board',

	DefaultRenderable: 'KanbanShortcuts-Board-Content',
	DefaultDestinationAddress: '#Kanban-Content',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'KanbanShortcuts-Board-Template',
			Template: /*html*/`
<section id="Kanban-Board-View" class="kb-view">
	<div class="kb-view-head"><h2>Board</h2><span class="kb-badge">/board</span></div>
	<p class="kb-view-desc">Shortcuts registered by <em>this</em> view: <kbd>n</kbd> new card, <kbd>r</kbd> refresh, <kbd>x</kbd> select first card, then <kbd>⌫</kbd> to delete (a <strong>scoped</strong> key — only live while a card is selected). Press <kbd>g</kbd> <kbd>l</kbd> to jump to the List view and watch these evict from the panel on the right.</p>
	<div id="Kanban-Board-Cards" class="kb-cards"></div>
</section>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'KanbanShortcuts-Board-Content',
			TemplateHash: 'KanbanShortcuts-Board-Template',
			ContentDestinationAddress: '#Kanban-Content',
			RenderMethod: 'replace'
		}
	]
};

module.exports = PictViewKanbanShortcutsBoard;

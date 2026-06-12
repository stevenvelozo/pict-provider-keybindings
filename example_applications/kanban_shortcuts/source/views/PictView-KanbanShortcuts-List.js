const libPictView = require('pict-view');

/**
 * List view — the second routed content view.
 *
 * Registers its own shortcuts under the owner key "list", tied to its root
 * element ("#Kanban-List-View"). Note "n" here adds a row (it does something
 * different from "n" on the Board view), and "f" focuses the filter input —
 * a nice demonstration of input guarding: once the filter is focused, bare-key
 * shortcuts are suppressed so you can type freely.
 */
class PictViewKanbanShortcutsList extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._rows = [ 'Q3 roadmap', 'Hiring plan', 'Budget review' ];
		this._sortAsc = true;
	}

	get keybindings() { return this.pict.providers['Pict-Keybindings']; }
	get layout() { return this.pict.views['KanbanShortcuts-Layout']; }

	onAfterRender(pRenderable)
	{
		this.pict.CSSMap.injectCSS();

		this.keybindings.registerOwnerBindings('list',
			[
				{ Keys: 'n', Hash: 'list-new',    Name: 'New row',     Description: 'Same key as Board, but only this view is live here', Group: 'List', Handler: () => this.newRow() },
				{ Keys: 'f', Hash: 'list-filter', Name: 'Focus filter', Description: 'Focus the filter — bare keys are then suppressed while typing', Group: 'List', Handler: () => this.focusFilter() },
				{ Keys: 's', Hash: 'list-sort',   Name: 'Cycle sort',  Group: 'List', Handler: () => this.cycleSort() }
			],
			{ destinationSelector: '#Kanban-List-View' });

		this._renderRows();
		this.layout.logActivity('List mounted — Board shortcuts evicted, List shortcuts active.');
		this.layout.refreshActiveShortcuts();

		return super.onAfterRender(pRenderable);
	}

	_renderRows()
	{
		let tmpHTML;
		if (!this._rows.length)
		{
			tmpHTML = '<div class="kb-empty">No rows. Press <kbd>n</kbd> to add one.</div>';
		}
		else
		{
			tmpHTML = this._rows.map((pRow) =>
				'<div class="kb-listrow"><span>' + this._esc(pRow) + '</span></div>').join('');
		}
		this.pict.ContentAssignment.assignContent('#Kanban-List-Rows', tmpHTML);
	}

	newRow()
	{
		this._rows.push('New item ' + (this._rows.length + 1));
		this.layout.logActivity('List: added a row (n) — a different action than the Board n.');
		this._renderRows();
	}

	focusFilter()
	{
		let tmpInput = document.getElementById('Kanban-List-Filter');
		if (tmpInput) { tmpInput.focus(); }
		this.layout.logActivity('List: filter focused (f) — bare-key shortcuts are now suppressed while you type.');
	}

	cycleSort()
	{
		this._sortAsc = !this._sortAsc;
		this._rows.sort((a, b) => this._sortAsc ? a.localeCompare(b) : b.localeCompare(a));
		this.layout.logActivity('List: sorted ' + (this._sortAsc ? 'A→Z' : 'Z→A') + ' (s).');
		this._renderRows();
	}

	filter(pValue)
	{
		let tmpTerm = String(pValue || '').toLowerCase();
		let tmpRows = document.querySelectorAll('#Kanban-List-Rows .kb-listrow');
		for (let i = 0; i < tmpRows.length; i++)
		{
			let tmpText = (tmpRows[i].textContent || '').toLowerCase();
			tmpRows[i].style.display = tmpText.indexOf(tmpTerm) >= 0 ? '' : 'none';
		}
	}

	_esc(pStr)
	{
		return String(pStr == null ? '' : pStr)
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
	}
}

PictViewKanbanShortcutsList.default_configuration =
{
	ViewIdentifier: 'KanbanShortcuts-List',

	DefaultRenderable: 'KanbanShortcuts-List-Content',
	DefaultDestinationAddress: '#Kanban-Content',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'KanbanShortcuts-List-Template',
			Template: /*html*/`
<section id="Kanban-List-View" class="kb-view">
	<div class="kb-view-head"><h2>List</h2><span class="kb-badge">/list</span></div>
	<p class="kb-view-desc">A different view with a different set of shortcuts: <kbd>n</kbd> new row, <kbd>f</kbd> focus filter, <kbd>s</kbd> cycle sort. The Board's <kbd>n</kbd>, <kbd>r</kbd>, <kbd>x</kbd> are gone — they evicted when you navigated here. Press <kbd>g</kbd> <kbd>b</kbd> to go back.</p>
	<input id="Kanban-List-Filter" class="kb-input" type="text" placeholder="Filter rows… (press f to focus)" oninput="_Pict.views['KanbanShortcuts-List'].filter(this.value)" />
	<div id="Kanban-List-Rows"></div>
</section>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'KanbanShortcuts-List-Content',
			TemplateHash: 'KanbanShortcuts-List-Template',
			ContentDestinationAddress: '#Kanban-Content',
			RenderMethod: 'replace'
		}
	]
};

module.exports = PictViewKanbanShortcutsList;

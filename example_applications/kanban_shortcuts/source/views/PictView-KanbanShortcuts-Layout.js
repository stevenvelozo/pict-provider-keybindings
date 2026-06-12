const libPictView = require('pict-view');

/**
 * Kanban Shortcuts — layout view
 *
 * Renders the nav bar, the content container the router swaps views into, and
 * the two live side panels (active shortcuts + activity log). Content views call
 * back into this view to log activity and to refresh the active-shortcuts panel
 * after they (re)register their bindings.
 */
class PictViewKanbanShortcutsLayout extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._activity = [];
	}

	get keybindings()
	{
		return this.pict.providers['Pict-Keybindings'];
	}

	onAfterRender(pRenderable)
	{
		this.pict.CSSMap.injectCSS();

		// Render the default view, then let the router apply the current hash
		// (so a deep link like #/list wins over the default).
		this.pict.views['KanbanShortcuts-Board'].render();
		if (this.pict.providers['Pict-Router'])
		{
			this.pict.providers['Pict-Router'].resolve();
		}

		this.logActivity('App ready — try g b / g l, or press ? for the cheatsheet.');

		return super.onAfterRender(pRenderable);
	}

	logActivity(pMessage)
	{
		this._activity.unshift({ Message: pMessage, Time: new Date().toLocaleTimeString() });
		this._activity = this._activity.slice(0, 10);
		let tmpHTML = this._activity.map((pEntry) =>
			'<div class="kb-log-row"><span class="kb-log-msg">' + this._esc(pEntry.Message) + '</span>' +
			'<span class="kb-log-time">' + this._esc(pEntry.Time) + '</span></div>').join('');
		this.pict.ContentAssignment.assignContent('#Kanban-Activity', tmpHTML);
	}

	// Rebuild the "active shortcuts" panel from the provider's live view of the
	// registry. Dead owners (views that have navigated away) are pruned by
	// getActiveBindings, so this always reflects the current view + globals.
	refreshActiveShortcuts()
	{
		let tmpGroups = this.keybindings.getActiveBindings({ groupOrder: [ 'Navigation', 'Board', 'List', 'Help' ] });
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
						'<span class="kb-name">' + this._esc(tmpBinding.Name) + '</span>' +
					'</div>';
			}
			tmpHTML += '<div class="kb-group"><div class="kb-group-title">' + this._esc(tmpGroup.Group) + '</div>' + tmpRows + '</div>';
		}
		this.pict.ContentAssignment.assignContent('#Kanban-Active', tmpHTML);
	}

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

	_esc(pStr)
	{
		return String(pStr == null ? '' : pStr)
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
	}
}

PictViewKanbanShortcutsLayout.default_configuration =
{
	ViewIdentifier: 'KanbanShortcuts-Layout',

	DefaultRenderable: 'KanbanShortcuts-Layout-Shell',
	DefaultDestinationAddress: '#KanbanShortcuts-Application-Container',

	AutoRender: false,

	CSS: /*css*/`
		.kb-app { max-width: 1080px; margin: 0 auto; padding: 0 20px; }
		.kb-nav { display: flex; align-items: center; gap: 8px; padding: 16px 4px 14px; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; }
		.kb-brand { font-weight: 700; font-size: 16px; color: #111827; margin-right: 10px; }
		.kb-navlink { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 8px; color: #374151; text-decoration: none; cursor: pointer; font-weight: 500; font-size: 14px; border: 1px solid transparent; }
		.kb-navlink:hover { background: #f3f4f6; }
		.kb-navlink.active { background: #eef2ff; color: #4338ca; border-color: #c7d2fe; }
		.kb-navlink kbd, .kb-nav-hint kbd { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.72em; padding: 1px 5px; border: 1px solid #d8dde6; border-bottom-width: 2px; border-radius: 5px; background: #f3f5f9; color: #475569; }
		.kb-nav-hint { margin-left: auto; color: #6b7280; font-size: 13px; }

		.kb-body { display: grid; grid-template-columns: 1fr 300px; gap: 22px; padding: 22px 4px 50px; align-items: start; }
		.kb-content { min-height: 320px; }
		.kb-aside { display: flex; flex-direction: column; gap: 16px; position: sticky; top: 14px; }
		.kb-aside-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
		.kb-aside-card h3 { margin: 0 0 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }

		.kb-group { margin-bottom: 12px; }
		.kb-group:last-child { margin-bottom: 0; }
		.kb-group-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 5px; }
		.kb-row { display: flex; align-items: baseline; gap: 10px; padding: 3px 0; }
		.kb-keys { flex: 0 0 auto; min-width: 78px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
		.kb-chord { display: inline-flex; gap: 3px; }
		.kb-keys kbd { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.76em; min-width: 1.4em; text-align: center; padding: 2px 6px; border: 1px solid #d8dde6; border-bottom-width: 2px; border-radius: 6px; background: #f3f5f9; color: #1d2230; }
		.kb-then { font-size: 0.68em; color: #9ca3af; }
		.kb-name { font-size: 13px; color: #111827; }

		.kb-log-row { display: flex; justify-content: space-between; gap: 8px; padding: 4px 0; border-bottom: 1px solid #f0f2f5; font-size: 12.5px; }
		.kb-log-row:last-child { border-bottom: none; }
		.kb-log-msg { color: #374151; }
		.kb-log-time { color: #9ca3af; flex: 0 0 auto; font-size: 11px; }

		/* content views (board / list) */
		.kb-view { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 22px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
		.kb-view-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; }
		.kb-view-head h2 { font-size: 19px; margin: 0; color: #111827; }
		.kb-view-head .kb-badge { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #4338ca; background: #eef2ff; padding: 2px 8px; border-radius: 999px; }
		.kb-view-desc { color: #6b7280; font-size: 13.5px; margin: 0 0 16px; line-height: 1.5; }
		.kb-view-desc kbd, .kb-card kbd, .kb-listrow kbd { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.78em; padding: 1px 6px; border: 1px solid #d8dde6; border-bottom-width: 2px; border-radius: 5px; background: #f3f5f9; }
		.kb-cards { display: flex; flex-direction: column; gap: 8px; }
		.kb-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #1f2937; background: #fafafa; transition: box-shadow .12s, border-color .12s; }
		.kb-card.selected { border-color: #6366f1; box-shadow: 0 0 0 3px #e0e7ff; background: #eef2ff; }
		.kb-listrow { display: flex; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid #f0f2f5; font-size: 14px; }
		.kb-listrow:last-child { border-bottom: none; }
		.kb-empty { color: #9ca3af; font-size: 13px; padding: 8px 0; }
		.kb-input { padding: 8px 11px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; width: 220px; max-width: 100%; margin-bottom: 12px; }
		@media (max-width: 820px) { .kb-body { grid-template-columns: 1fr; } .kb-aside { position: static; } }
	`,

	Templates:
	[
		{
			Hash: 'KanbanShortcuts-Layout-Shell-Template',
			Template: /*html*/`
<div class="kb-app">
	<nav class="kb-nav">
		<span class="kb-brand">Kanban Shortcuts</span>
		<a class="kb-navlink" onclick="_Pict.PictApplication.navigateTo('/board')">Board <kbd>g</kbd> <kbd>b</kbd></a>
		<a class="kb-navlink" onclick="_Pict.PictApplication.navigateTo('/list')">List <kbd>g</kbd> <kbd>l</kbd></a>
		<span class="kb-nav-hint">press <kbd>?</kbd> for the cheatsheet</span>
	</nav>
	<div class="kb-body">
		<main id="Kanban-Content" class="kb-content"></main>
		<aside class="kb-aside">
			<div class="kb-aside-card">
				<h3>Active shortcuts (this view)</h3>
				<div id="Kanban-Active"></div>
			</div>
			<div class="kb-aside-card">
				<h3>Activity</h3>
				<div id="Kanban-Activity"></div>
			</div>
		</aside>
	</div>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'KanbanShortcuts-Layout-Shell',
			TemplateHash: 'KanbanShortcuts-Layout-Shell-Template',
			ContentDestinationAddress: '#KanbanShortcuts-Application-Container',
			RenderMethod: 'replace'
		}
	]
};

module.exports = PictViewKanbanShortcutsLayout;

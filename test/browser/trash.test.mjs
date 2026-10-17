// Delete moves to the trash without asking; restore, delete for good, empty, expiry
export const expect = {
    confirmAsked: false, rowsAfterDelete: 'gamma text|alpha text|trash…', status: 'moved "beta text" to trash · 30 days', keysKept: 3,
    trashRows: 'beta text [restore,delete]|empty trash []', menuTrash: 'trash… [1 document, gone after 30 days]',
    afterRestore: 'beta text / gamma text,beta text,alpha text', destroyed: 'gamma text,alpha text / keys 2', emptied: 'gamma text / trash emptied',
    expired: '- / keys 1', emptyDocGoesAtOnce: '- / rows Untitled',
};

export default async (t) => {
    await t.open('/');
    const index = () => t.ev(`JSON.parse(localStorage['zen.docs']).map(d => (d.auto || '-') + (d.deleted ? '*' : '')).join(',')`);
    const keys = () => t.ev(`Object.keys(localStorage).filter(k => k.startsWith('zen.doc.')).length`);
    const rowWith = (word) => `[...document.querySelectorAll('.picker-item')].find(r => r.textContent.includes(${JSON.stringify(word)}))`;
    const out = {};

    await t.focus(); await t.insert('alpha text');
    await t.click('.new-doc'); await t.insert('beta text');
    await t.click('.new-doc'); await t.insert('gamma text');
    await t.ev(`document.querySelector('article').blur()`); await t.sleep(400);

    await t.ev(`window.confirm = () => { window.__confirmed = true; return false; }`);
    await t.click('.documents');
    await t.ev(`${rowWith('beta')}.querySelector('[data-act=delete]').click()`); await t.sleep(300);
    out.confirmAsked = await t.ev(`!!window.__confirmed`);
    out.rowsAfterDelete = await t.ev(`[...document.querySelectorAll('.picker-item .label')].map(e => e.textContent).join('|')`);
    out.status = await t.status();
    out.keysKept = await keys();

    await t.ev(`${rowWith('trash')}.click()`); await t.sleep(300);
    out.trashRows = await t.ev(`[...document.querySelectorAll('.picker-item')].map(e => e.querySelector('.label').textContent + ' [' + [...e.querySelectorAll('.act')].map(a => a.textContent).join(',') + ']').join('|')`);
    await t.click('.palette'); out.menuTrash = await t.ev(`[...document.querySelectorAll('.picker-item')].filter(e => e.textContent.includes('trash')).map(e => e.querySelector('.label').textContent + ' [' + e.querySelector('.hint').textContent + ']').join('|')`);
    await t.click('.palette', 100);

    await t.click('.documents'); await t.ev(`${rowWith('trash')}.click()`); await t.sleep(300);
    await t.key('Enter'); await t.sleep(400);
    out.afterRestore = await t.text() + ' / ' + await index();

    await t.click('.documents'); await t.ev(`${rowWith('beta')}.querySelector('[data-act=delete]').click()`); await t.sleep(300);
    await t.ev(`${rowWith('trash')}.click()`); await t.sleep(300);
    await t.ev(`window.confirm = () => true`);
    await t.ev(`${rowWith('beta')}.querySelector('[data-act=delete]').click()`); await t.sleep(300);
    out.destroyed = await index() + ' / keys ' + await keys();

    await t.ev(`${rowWith('alpha')}.querySelector('[data-act=delete]').click()`); await t.sleep(300);
    await t.ev(`${rowWith('trash')}.click()`); await t.sleep(300);
    await t.ev(`${rowWith('empty trash')}.click()`); await t.sleep(300);
    out.emptied = await index() + ' / ' + await t.status();

    await t.click('.documents'); await t.ev(`${rowWith('gamma')}.querySelector('[data-act=delete]').click()`); await t.sleep(300);
    await t.ev(`{ const d = JSON.parse(localStorage['zen.docs']); d.find(x => x.deleted).deleted = Date.now() - 31 * 86400000; localStorage['zen.docs'] = JSON.stringify(d) }`);
    await t.reload();
    out.expired = await index() + ' / keys ' + await keys();

    await t.click('.documents');
    await t.ev(`document.querySelector('.picker-item [data-act=delete]').click()`); await t.sleep(300);
    out.emptyDocGoesAtOnce = await index() + ' / rows ' + await t.ev(`[...document.querySelectorAll('.picker-item .label')].map(e => e.textContent).join('|')`);

    return out;
};

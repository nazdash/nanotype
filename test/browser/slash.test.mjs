// "/" at a line start opens the list; letters filter; Enter inserts; the caret lands
// where typing continues; Esc, a space, a path or and/or never leave a box open
export const expect = {
    openOnSlash: 'true:slash', rows: 11, filtered: '/table | /task', afterTable: '| | | |\n|---|---|---|\n| | | |\n| | | |', firstCell: '| x| | |',
    undoTwice: '/ta', escKeeps: '/ti:false', spaceKeeps: false, path: 'false /usr', andOr: false, afterSpace: 'true:slash',
    code: '```js\nlet\n```', linkSelected: 'text', link: '[Nano](url)', imageSelected: 'address', image: '![caption](https://x.test/a.png)', h2: '## My title !', fm: 'intro \n---\ntitle: Hi\n---\n', placed: 'above',
};

export default async (t) => {
    await t.open('/');
    await t.focus();
    const out = {};
    const clear = async () => { await t.ev(`document.querySelector('article').innerHTML = ''; document.querySelector('article').focus()`); };
    const text = async () => (await t.lines()).join('\n');

    await t.type('/'); out.openOnSlash = await t.pickerOpen(); out.rows = await t.ev(`document.querySelectorAll('.picker-item').length`);
    await t.type('ta'); out.filtered = await t.ev(`[...document.querySelectorAll('.picker-item .label')].map(e => e.textContent).join(' | ')`);
    await t.key('Enter'); await t.sleep(200); out.afterTable = await text();
    await t.type('x'); out.firstCell = (await t.lines())[0];
    await t.key('z', 'KeyZ', 4, { commands: ['undo'] }); await t.key('z', 'KeyZ', 4, { commands: ['undo'] }); await t.sleep(200); out.undoTwice = await text();

    await clear(); await t.type('/ti'); await t.key('Escape', 'Escape'); out.escKeeps = await text() + ':' + (await t.pickerOpen()).split(':')[0];
    await t.type(' and'); out.spaceKeeps = (await t.pickerOpen()).startsWith('true');
    await clear(); await t.type('/usr'); out.path = (await t.pickerOpen()).split(':')[0] + ' ' + await text();
    await clear(); await t.type('and/or'); out.andOr = (await t.pickerOpen()).startsWith('true');
    await clear(); await t.type('see /da'); out.afterSpace = await t.pickerOpen(); await t.key('Escape', 'Escape');

    await clear(); await t.type('/code js'); await t.key('Enter'); await t.sleep(200); await t.type('let'); out.code = await text();
    await clear(); await t.type('/li'); await t.key('Enter'); await t.sleep(200); out.linkSelected = await t.ev(`window.getSelection().toString()`); await t.type('Nano'); out.link = await text();
    await clear(); await t.type('/im'); await t.key('Enter'); await t.sleep(200); out.imageSelected = await t.ev(`window.getSelection().toString()`); await t.insert('https://x.test/a.png'); out.image = await text();
    await clear(); await t.type('My title /h2'); await t.key('Enter'); await t.sleep(200); await t.type('!'); out.h2 = await text();
    await clear(); await t.type('intro /fm'); await t.key('Enter'); await t.sleep(200); await t.type('Hi'); out.fm = await text();

    // no room below: the list opens above the caret
    await clear(); await t.insert('line\n'.repeat(30)); await t.ev(`document.body.scrollTop = 1e6`); await t.type('/'); await t.sleep(200);
    out.placed = await t.ev(`(() => { const p = document.querySelector('.picker').getBoundingClientRect(); const c = window.getSelection().getRangeAt(0).getBoundingClientRect(); return p.bottom <= c.top ? 'above' : p.top >= c.bottom ? 'below' : 'over' })()`);
    await t.key('Escape', 'Escape');

    return out;
};

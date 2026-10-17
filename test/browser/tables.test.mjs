// Markdown tables by hand: Tab between cells, a row added after the last, ⇧Tab
// back; the columns lined up when the caret leaves the table (one undo step);
// `today` opens or starts the day's document
export const expect = {
    afterTabs: '| name | price |', newRow: '|  |  |', rows: 4,
    linedUp: '| name   | price |\n| ------ | ----- |\n| milk   | 2     |\n| coffee | 12.50 |\n', backLine: true,
    undone: '| name | price |\n|---|---|\n| milk | 2 |\n| coffee| 12.50|\n', redone: '| name   | price |\n| ------ | ----- |\n| milk   | 2     |\n| coffee | 12.50 |\n',
    todayStarted: true, todayOpened: true, todayCount: 1,
};

export default async (t) => {
    await t.open('/');
    await t.focus(); await t.insert('| name | price |\n|---|---|\n| milk | 2 |', 300);
    const out = {};
    const caretLine = () => t.ev(`(() => { let n = window.getSelection().anchorNode; while (n && n.parentNode !== document.querySelector('article')) n = n.parentNode; return n ? n.textContent.replace(/\\u00a0/g, ' ') : '' })()`);
    const caretOffset = () => t.ev(`window.getSelection().anchorOffset`);

    await t.caretTo('name', 2);
    await t.key('Tab', 'Tab'); out.tab1 = await caretOffset();           // into "price"
    await t.key('Tab', 'Tab'); await t.key('Tab', 'Tab'); await t.key('Tab', 'Tab'); await t.key('Tab', 'Tab');   // across the separator and milk's row
    out.afterTabs = (await t.lines())[0];
    await t.key('Tab', 'Tab'); await t.sleep(100); out.newRow = await caretLine(); out.rows = (await t.lines()).length;
    await t.type('coffee'); await t.key('Tab', 'Tab'); await t.type('12.50');
    await t.key('Tab', 'Tab', 8);   // ⇧Tab: back into "coffee"
    out.backLine = (await caretLine()).startsWith('| coffee');

    // leave the table: the columns line up
    await t.caretTo('coffee', 0); await t.ev(`window.getSelection().modify('move', 'forward', 'lineboundary')`);
    await t.key('Enter', 'Enter', 0, { text: '\r' }); await t.sleep(300);
    out.linedUp = (await t.lines()).join('\n');
    await t.key('z', 'KeyZ', 4, { commands: ['undo'] }); await t.sleep(300); out.undone = (await t.lines()).join('\n');
    await t.key('z', 'KeyZ', 12, { commands: ['redo'] }); await t.sleep(300); out.redone = (await t.lines()).join('\n');

    // today
    await t.click('.palette'); await t.filter('today'); await t.key('Enter'); await t.sleep(400);
    const iso = new Date().toISOString().slice(0, 10);
    out.todayStarted = (await t.lines())[0] === `# ${iso}`;
    await t.type('journal'); await t.sleep(400);
    await t.click('.new-doc'); await t.insert('other'); await t.sleep(400);
    await t.click('.palette'); await t.filter('today'); await t.key('Enter'); await t.sleep(400);
    out.todayOpened = (await t.text()).startsWith(`# ${iso}`);
    out.todayCount = await t.ev(`JSON.parse(localStorage['zen.docs']).filter(d => d.auto === '${iso}').length`);

    return out;
};

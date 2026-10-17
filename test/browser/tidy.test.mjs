// tidy from the menu: the whole text (with its own undo step) or the selection
// (through the browser's undo); the status line says what was done
export const expect = {
    whole: 'The fox jumps over the lazy dog. Then it sleeps.||- milk|- eggs', status: 'tidied: 1 blank line removed, tabs gone, 2 bullets made markdown · ⌘Z undoes',
    undone: 'The fox jumps over the\tlazy dog. Then it sleeps.|||• milk|· eggs', redone: 'The fox jumps over the lazy dog. Then it sleeps.||- milk|- eggs',
    nothing: 'nothing to tidy', selection: 'keep this\tline|a b c|and this\tline', selectionUndone: 'keep this\tline|a   b  c|and this\tline',
};

export default async (t) => {
    await t.open('/');
    const out = {};
    const all = async () => (await t.lines()).join('|');
    const menu = async (word) => { await t.click('.palette'); await t.filter(word); await t.key('Enter'); await t.sleep(300); };

    await t.focus(); await t.insert('The fox jumps over the\tlazy dog. Then it sleeps.\n\n\n• milk\n· eggs', 400);
    await menu('tidy'); out.whole = await all(); out.status = await t.status();
    await t.key('z', 'KeyZ', 4); await t.sleep(200); out.undone = await all();
    await t.key('z', 'KeyZ', 12); await t.sleep(200); out.redone = await all();
    await menu('tidy'); out.nothing = await t.status();

    await t.click('.new-doc'); await t.insert('keep this\tline\na   b  c\nand this\tline', 400);
    await t.caretTo('a   b', 0); await t.ev(`window.getSelection().modify('extend', 'forward', 'lineboundary')`);
    await t.key('t', 'KeyT', 5); await t.sleep(300); out.selection = await all();   // ⌘⌥T: ⌘K with a selection makes a link
    await t.key('z', 'KeyZ', 4, { commands: ['undo'] }); await t.sleep(200); out.selectionUndone = await all();   // the browser's own undo

    return out;
};

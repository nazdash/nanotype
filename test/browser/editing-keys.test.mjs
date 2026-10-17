// ⌥↑ ⌥↓ move the line (and keep it on screen); ⌘⌥1–6 / ⌘⌥0 headings; ⌘] ⌘[ indent; ⌘-click opens an address
export const expect = {
    down: 'one||two|four https://nanotype.app/x, done|## five', upTwice: 'two|one||four https://nanotype.app/x, done|## five', upAtTopUnchanged: true, undoMove: 'one|two||four https://nanotype.app/x, done|## five',
    h2: '## four https://nanotype.app/x, done', h4: '#### four https://nanotype.app/x, done', h0: 'four https://nanotype.app/x, done', h5to0: 'five',
    indent: '    one', outdent: 'one', opened: 1, wordOpensNothing: 1, moveStaysVisible: true,
};

export default async (t) => {
    await t.open('/');
    await t.focus(); await t.insert('one\ntwo\n\nfour https://nanotype.app/x, done\n## five', 400);
    const out = {};
    const all = async () => (await t.lines()).join('|');
    let opened = 0;
    t.listeners.push((msg) => { if (msg.method === 'Target.targetCreated' && msg.params.targetInfo.type === 'page') opened++; });
    await t.send('Target.setDiscoverTargets', { discover: true }); await t.sleep(300);
    opened = 0;   // the targets that already existed were just announced

    await t.caretTo('two', 1); await t.key('ArrowDown', 'ArrowDown', 1); out.down = await all();
    await t.key('ArrowUp', 'ArrowUp', 1); await t.key('ArrowUp', 'ArrowUp', 1); out.upTwice = await all();
    await t.key('ArrowUp', 'ArrowUp', 1); out.upAtTopUnchanged = (await all()) === out.upTwice;
    await t.key('z', 'KeyZ', 4, { commands: ['undo'] }); out.undoMove = await all();

    await t.caretTo('four', 2); await t.key('2', 'Digit2', 5); out.h2 = (await t.lines())[3];
    await t.key('4', 'Digit4', 5); out.h4 = (await t.lines())[3];
    await t.key('0', 'Digit0', 5); out.h0 = (await t.lines())[3];
    await t.caretTo('five', 4); await t.key('0', 'Digit0', 5); out.h5to0 = (await t.lines())[4];

    await t.caretTo('one', 1); await t.key(']', 'BracketRight', 4); out.indent = (await t.lines())[0];
    await t.key('[', 'BracketLeft', 4); out.outdent = (await t.lines())[0];

    const b = JSON.parse(await t.ev(`(() => { const d = [...document.querySelector('article').childNodes].find(x => x.textContent.includes('https')); const rg = document.createRange(); const i = d.firstChild.data.indexOf('https'); rg.setStart(d.firstChild, i + 5); rg.setEnd(d.firstChild, i + 6); return JSON.stringify(rg.getBoundingClientRect()) })()`));
    await t.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x + 2, y: b.y + b.height / 2, button: 'left', clickCount: 1, modifiers: 4 });
    await t.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x + 2, y: b.y + b.height / 2, button: 'left', clickCount: 1, modifiers: 4 }); await t.sleep(600);
    out.opened = opened;
    const w = await t.rect('article');
    await t.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: w.x + 5, y: w.y + 8, button: 'left', clickCount: 1, modifiers: 4 });
    await t.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: w.x + 5, y: w.y + 8, button: 'left', clickCount: 1, modifiers: 4 }); await t.sleep(300);
    out.wordOpensNothing = opened;

    // a line moved far keeps on screen
    await t.ev(`document.querySelector('article').innerHTML = ''; document.querySelector('article').focus()`);
    await t.insert(Array.from({ length: 60 }, (_, i) => 'line ' + i).join('\n'), 300);
    await t.caretTo('line 1', 2); await t.ev(`document.body.scrollTop = 0`);
    for (let i = 0; i < 40; i++) await t.key('ArrowDown', 'ArrowDown', 1);
    out.moveStaysVisible = await t.ev(`(() => { let n = window.getSelection().anchorNode; while (n.parentNode !== document.querySelector('article')) n = n.parentNode; const r = n.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight })()`);

    return out;
};

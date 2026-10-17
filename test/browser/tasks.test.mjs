// Tasks: ⌘Enter ticks, ⌘⇧Enter makes a task (and back), both on a selection too;
// the preview's boxes tick the text
export const expect = {
    tick: '- [x] milk@8', untick: '- [ ] milk', undo: '- [ ] milk', plainUntouched: '7 lines', nested: '    - [x] nested', numbered: '1. [x] numbered',
    makeTask: '- [ ] Todo@8', backToPlain: 'Todo@2', itemToTask: '- [ ] plain item@9', undoMake: '- plain item',
    bulkMade: '- [ ] Todo||- [ ] milk|- [ ] eggs|    - [ ] nested|1. [ ] numbered|- [ ] plain item', bulkTicked: '- [x] Todo||- [x] milk|- [x] eggs|    - [x] nested|1. [x] numbered|- [x] plain item',
    bulkCleared: '- [ ] Todo||- [ ] milk|- [ ] eggs|    - [ ] nested|1. [ ] numbered|- [ ] plain item', bulkPlain: 'Todo||milk|eggs|    nested|numbered|plain item',
    previewBoxes: '_,_,_,_,_,_', previewClick: '- [x] milk', previewBoxesAfter: '_,x,_,_,_,_',
    emptyLineToggles: '<div><br></div>', emptyLineTyped: '- [ ] z', emptyLineHeight: true,
};

export default async (t) => {
    await t.open('/');
    await t.focus();
    await t.insert('Todo\n\n- [ ] milk\n- [x] eggs\n    - [ ] nested\n1. [ ] numbered\n- plain item', 400);
    const out = {};
    const at = async (word, offset) => { await t.caretTo(word, offset); };
    const line = async (i) => (await t.lines())[i];
    const caret = () => t.ev(`window.getSelection().anchorOffset`);
    const cmdEnter = () => t.key('Enter', 'Enter', 4);
    const cmdShiftEnter = () => t.key('Enter', 'Enter', 12);
    const undo = () => t.key('z', 'KeyZ', 4, { commands: ['undo'] });

    await at('milk', 8); await cmdEnter(); out.tick = await line(2) + '@' + await caret();
    await cmdEnter(); out.untick = await line(2);
    await cmdEnter(); await undo(); out.undo = await line(2);
    await at('plain', 3); await cmdEnter(); out.plainUntouched = (await t.lines()).length + ' lines';
    await at('nested', 9); await cmdEnter(); out.nested = await line(4);
    await at('numbered', 9); await cmdEnter(); out.numbered = await line(5);

    await at('Todo', 2); await cmdShiftEnter(); out.makeTask = await line(0) + '@' + await caret();
    await cmdShiftEnter(); out.backToPlain = await line(0) + '@' + await caret();
    await at('plain', 5); await cmdShiftEnter(); out.itemToTask = await line(6) + '@' + await caret();
    await undo(); out.undoMake = await line(6);

    const selectAll = () => t.ev(`(() => { const c = document.querySelector('article').childNodes; const s = window.getSelection(); const r = document.createRange(); r.setStart(c[0].firstChild || c[0], 1); r.setEnd(c[6].firstChild, 3); s.removeAllRanges(); s.addRange(r) })()`);
    await at('eggs', 1); await cmdEnter();   // eggs back to [ ]
    await at('nested', 1); await cmdEnter(); await at('numbered', 1); await cmdEnter();
    await selectAll(); await cmdShiftEnter(); out.bulkMade = (await t.lines()).join('|');
    await cmdEnter(); out.bulkTicked = (await t.lines()).join('|');
    await cmdEnter(); out.bulkCleared = (await t.lines()).join('|');
    await cmdShiftEnter(); out.bulkPlain = (await t.lines()).join('|');
    await cmdShiftEnter();

    await t.click('.markdown', 500);
    out.previewBoxes = await t.ev(`[...document.querySelectorAll('.markdown-showcase .task-list-item-checkbox')].map(b => b.checked ? 'x' : '_').join(',')`);
    const box = JSON.parse(await t.ev(`JSON.stringify(document.querySelectorAll('.markdown-showcase .task-list-item-checkbox')[1].getBoundingClientRect())`));
    await t.mouse(box.x + 4, box.y + box.height / 2); await t.sleep(300);
    out.previewClick = await line(2);
    out.previewBoxesAfter = await t.ev(`[...document.querySelectorAll('.markdown-showcase .task-list-item-checkbox')].map(b => b.checked ? 'x' : '_').join(',')`);

    // ⌘⇧Enter on an empty line, made and unmade twice: a clean empty line each time
    // (not a zero-height block), the caret after the marker
    await t.click('.new-doc'); await t.insert('intro\n- [ ] one'); await t.sleep(200);
    await t.key('Enter', 'Enter', 0, { text: '\r' }); await t.sleep(200); await t.key('Enter', 'Enter', 0, { text: '\r' }); await t.sleep(200);
    for (let i = 0; i < 4; i++) { await cmdShiftEnter(); await t.sleep(100); }
    out.emptyLineToggles = await t.ev(`document.querySelector('article').lastElementChild.outerHTML`);
    out.emptyLineHeight = await t.ev(`document.querySelector('article').lastElementChild.getBoundingClientRect().height`) > 10;
    await cmdShiftEnter(); await t.type('z'); out.emptyLineTyped = await line(2);

    return out;
};

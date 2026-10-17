// Plain text, always: a big paste lands as blocks with its own undo step; a small
// paste goes through the browser; formatting from any route never gets in; cut and
// copy give plain text; old stray tags are cleaned on load
export const expect = {
    empty: { text: true, structure: 'DIV,DIV,DIV,DIV', caret: true }, midLine: { text: true, structure: 'DIV,DIV,DIV' }, bareFirst: { text: true },
    selection: { text: true }, spaces: { text: true, saved: true }, smallUndo: true, bigUndo: true, bigRedo: true, undoAfterTyping: true,
    afterCmdU: 'hello world', afterDrop: 'plain, no tags', afterPaste: 'hello world', formatEventCancelled: true, classInText: true, oldTagsOnLoad: 'old bold text<div>under line</div>',
    copied: '"two  sp"', cut: '"two  sp" | left: ""', attrs: 'off off',
    urlOverWords: 'see [the docs](https://nanotype.app/x) now', urlAlone: 'see https://nanotype.app/x now', wordsOverWords: 'see hello now',
};

export default async (t) => {
    await t.open('/');
    const big = 'B'.repeat(2100);
    const paste = (text, html) => t.ev(`(() => { const dt = new DataTransfer(); dt.setData('text/plain', ${JSON.stringify(text)}); ${html ? `dt.setData('text/html', ${JSON.stringify(html)});` : ''} document.querySelector('article').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })) })()`);
    const text = async () => (await t.lines()).join('\n');
    const structure = () => t.ev(`Array.from(document.querySelector('article').childNodes).map(n => n.nodeName + (n.querySelector && n.querySelector('div') ? '(nested!)' : '')).join(',')`);
    const set = (html, block, offset) => t.ev(`(() => { const a = document.querySelector('article'); a.innerHTML = ${JSON.stringify(html)}; a.focus(); const node = a.childNodes[${block}]; const target = node.nodeType === 3 ? node : (node.firstChild || node); const r = document.createRange(); r.setStart(target, ${offset}); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r) })()`);
    const z = (redo) => t.key('z', 'KeyZ', redo ? 12 : 4, { commands: [redo ? 'redo' : 'undo'] });
    const out = {};

    await t.ev(`document.querySelector('article').innerHTML = ''; document.querySelector('article').focus()`);
    await paste(`${big}\nsecond\n\nfourth`); await t.sleep(200);
    out.empty = { text: (await text()) === `${big}\nsecond\n\nfourth`, structure: await structure(), caret: await t.ev(`(() => { const s = getSelection(); return document.querySelector('article').contains(s.anchorNode) && s.isCollapsed })()`) };
    await set('<div>hello world</div><div>after</div>', 0, 6); await paste(`${big}\nmid`); await t.sleep(200);
    out.midLine = { text: (await text()) === `hello ${big}\nmidworld\nafter`, structure: await structure() };
    await set('bare line<div>second</div>', 0, 4); await paste(`${big}\nx`); await t.sleep(200);
    out.bareFirst = { text: (await text()) === `bare${big}\nx line\nsecond` };
    await t.ev(`(() => { const a = document.querySelector('article'); a.innerHTML = '<div>keep DELETE keep</div>'; a.focus(); const n = a.firstChild.firstChild; const r = document.createRange(); r.setStart(n, 5); r.setEnd(n, 11); const s = getSelection(); s.removeAllRanges(); s.addRange(r) })()`);
    await paste(`${big}\nnew`); await t.sleep(200);
    out.selection = { text: (await text()) === `keep ${big}\nnew keep` };
    await set('<div><br></div>', 0, 0); await paste(`${big}\n    indented\n\n\nend`); await t.sleep(600);
    out.spaces = { text: (await text()) === `${big}\n    indented\n\n\nend`, saved: (await t.ev(`localStorage['zen.doc.' + localStorage['zen.current']]`)).includes('end') };
    await set('<div>abc</div>', 0, 3); await paste('small'); await t.sleep(100); await t.ev(`document.execCommand('undo')`);
    out.smallUndo = (await text()) === 'abc';
    await set('<div>abc</div>', 0, 3); await paste(`${big}\nsecond\nthird`); await t.sleep(200);
    await z(false); out.bigUndo = (await text()) === 'abc';
    await z(true); out.bigRedo = (await text()) === `abc${big}\nsecond\nthird`;
    await t.ev(`document.execCommand('insertText', false, 'X')`); await z(false); await z(false); out.undoAfterTyping = (await text()) === 'abc';

    // formatting never gets in
    await t.ev(`document.querySelector('article').innerHTML = ''; document.querySelector('article').focus(); document.execCommand('insertText', false, 'hello world')`);
    const selectWord = () => t.ev(`(() => { const n = document.createTreeWalker(document.querySelector('article'), NodeFilter.SHOW_TEXT).nextNode(); const i = n.data.indexOf('world'); const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 5); const s = getSelection(); s.removeAllRanges(); s.addRange(r) })()`);
    const html = () => t.ev(`document.querySelector('article').innerHTML`);
    await selectWord(); await t.key('u', 'KeyU', 4, { commands: ['underline'] }); out.afterCmdU = await html();
    await t.ev(`(() => { const dt = new DataTransfer(); dt.setData('text/html', '<b>bold</b> <i>it</i>'); dt.setData('text/plain', 'bold it'); const a = document.querySelector('article'); const b = a.getBoundingClientRect(); a.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, clientX: b.x + 5, clientY: b.y + 8 })) })()`); await t.sleep(200);
    out.afterDrop = (h => h.includes('bold it') && !/<[bi]>/.test(h) ? 'plain, no tags' : h)(await html());
    await t.ev(`document.querySelector('article').innerHTML = 'hello world'; document.querySelector('article').focus()`);
    await t.ev(`(() => { const s = getSelection(); const r = document.createRange(); const n = document.querySelector('article').firstChild; r.setStart(n, n.length); r.collapse(true); s.removeAllRanges(); s.addRange(r) })()`);
    await paste('', '<h1>Big</h1><p>para</p>'); await t.sleep(200);
    out.afterPaste = await html();
    await selectWord(); out.formatEventCancelled = await t.ev(`(() => { const e = new InputEvent('beforeinput', { inputType: 'formatBold', bubbles: true, cancelable: true }); return !document.querySelector('article').dispatchEvent(e) })()`);
    await t.ev(`localStorage['zen.doc.' + localStorage['zen.current']] = 'old <b>bold</b> text<div><u>under</u> line</div>'`); await t.reload(1200);
    out.oldTagsOnLoad = await html();

    // a typed class="x" is text, not presentation: it survives the save and the reload
    await set('', 0, 0); await t.insert('keep class="x" and <b> here'); await t.sleep(600); await t.reload(1200);
    out.classInText = (await text()) === 'keep class="x" and <b> here';

    // cut and copy are plain, with ordinary spaces
    await t.ev(`document.querySelector('article').innerHTML = ''; document.querySelector('article').focus()`);
    for (const ch of ['t', 'w', 'o', ' ', ' ', 's', 'p']) { await t.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, code: ch === ' ' ? 'Space' : 'Key' + ch.toUpperCase(), text: ch }); await t.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch, code: ch === ' ' ? 'Space' : 'Key' + ch.toUpperCase() }); }
    for (let i = 0; i < 20 && (await t.text()) !== 'two  sp'; i++) await t.sleep(100);   // the keys land in their own time under load
    await t.ev(`document.execCommand('selectAll')`);
    out.copied = await t.ev(`(() => { const dt = new DataTransfer(); document.querySelector('article').dispatchEvent(new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true })); return JSON.stringify(dt.getData('text/plain')) })()`);
    out.cut = await t.ev(`(() => { const dt = new DataTransfer(); document.querySelector('article').dispatchEvent(new ClipboardEvent('cut', { clipboardData: dt, bubbles: true, cancelable: true })); return JSON.stringify(dt.getData('text/plain')) + ' | left: ' + JSON.stringify(document.querySelector('article').textContent) })()`);
    out.attrs = await t.ev(`document.querySelector('article').getAttribute('autocorrect') + ' ' + document.querySelector('article').getAttribute('autocapitalize')`);

    // a web address pasted over selected words links them; alone, or with words, it is plain
    const sel = async () => { await t.caretTo('the docs', 4); await t.ev(`window.getSelection().modify('extend', 'forward', 'word'); window.getSelection().modify('extend', 'forward', 'word')`); };
    await t.ev(`document.querySelector('article').innerHTML = '<div>see the docs now</div>'`); await sel(); await paste('https://nanotype.app/x'); await t.sleep(200); out.urlOverWords = (await t.lines())[0];
    await t.ev(`document.querySelector('article').innerHTML = '<div>see the docs now</div>'`); await sel(); await paste('hello'); await t.sleep(200); out.wordsOverWords = (await t.lines())[0];
    await t.ev(`document.querySelector('article').innerHTML = '<div>see now</div>'`); await t.caretTo('see', 4); await paste('https://nanotype.app/x '); await t.sleep(200); out.urlAlone = (await t.lines())[0];

    return out;
};

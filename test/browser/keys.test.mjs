// Every shortcut, matched on the physical key (a wrong `key` is sent on purpose),
// each one prevented; then the markdown marks on a selection and ⌘K as a link
export const expect = {
    notPrevented: [],
    after: { focus: false, md: false, lines: false, font: 'mono', theme: 'light', sound: 'off', cursor: 'block', size: 's', docs: 3 },
    menuOpened: true, docsOpened: true,
    bold: 'hello **world**', italic: 'hello *world*', code: 'hello `world`', link: 'hello [world](https://)', menuOnLink: false,
};

export default async (t) => {
    await t.open('/');
    await t.focus();

    const press = (code, mods) => t.ev(`(() => { const e = new KeyboardEvent('keydown', { code: '${code}', key: '˜', keyCode: 0, which: 0, metaKey: ${!!(mods & 4)}, shiftKey: ${!!(mods & 8)}, altKey: ${!!(mods & 1)}, bubbles: true, cancelable: true }); (document.activeElement || document.body).dispatchEvent(e); return e.defaultPrevented })()`);
    const state = () => t.ev(`({ focus: document.body.classList.contains('focus-mode'), md: document.body.classList.contains('markdown-mode'), lines: document.body.classList.contains('line-numbers'), font: document.querySelector('.font-flip b').textContent, theme: document.querySelector('.color-flip b').textContent, sound: document.querySelector('.sfx-mute b').textContent, cursor: document.querySelector('.caret b').textContent, size: document.querySelector('.font-size b').textContent, docs: JSON.parse(localStorage['zen.docs']).length })`);
    const checks = [
        ['KeyD', 4, 'focus on'], ['KeyD', 4, 'focus off'],
        ['KeyM', 12, 'markdown on'], ['KeyM', 12, 'markdown off'],
        ['KeyU', 12, 'lines on'], ['KeyU', 12, 'lines off'],
        ['KeyA', 12, 'font sans'], ['KeyA', 12, 'font serif'], ['KeyA', 12, 'font mono'],
        ['KeyE', 12, 'theme light'], ['KeyE', 12, 'theme dark'], ['KeyE', 12, 'theme green'], ['KeyE', 12, 'theme sand'], ['KeyE', 12, 'theme night'], ['KeyE', 12, 'theme system'], ['KeyE', 12, 'theme light'],
        ['KeyY', 12, 'sound soft'], ['KeyY', 12, 'sound click'], ['KeyY', 12, 'sound blip'], ['KeyY', 12, 'sound typewriter'], ['KeyY', 12, 'sound off'],
        ['KeyK', 12, 'cursor thin'], ['KeyK', 12, 'cursor block'],
        ['Equal', 4, 'size m'], ['Equal', 4, 'size l'], ['Minus', 4, 'size m'], ['Digit0', 4, 'size s'],
        ['KeyD', 12, 'new document'], ['KeyN', 5, 'new document (alt)'],
    ];
    const notPrevented = [];

    for (const [code, mods, label] of checks) {
        if (!await press(code, mods)) notPrevented.push(label);
        await t.sleep(60);
    }

    const after = await state();

    await press('KeyK', 4); await t.sleep(150);
    const menuOpened = await t.ev(`document.querySelector('.picker').classList.contains('visible')`);
    await t.key('Escape', 'Escape'); await t.sleep(100);
    await press('KeyO', 12); await t.sleep(150);
    const docsOpened = await t.ev(`document.querySelector('.picker').classList.contains('visible') && document.querySelector('.picker').dataset.kind === 'documents'`);
    await t.key('Escape', 'Escape'); await t.sleep(100);

    await t.ev(`document.querySelector('article').focus(); document.execCommand('selectAll'); document.execCommand('delete'); document.execCommand('insertText', false, 'hello world')`);
    const selectWord = () => t.ev(`(() => { const n = document.createTreeWalker(document.querySelector('article'), NodeFilter.SHOW_TEXT).nextNode(); const i = n.data.indexOf('world'); const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 5); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return s.toString() })()`);
    const text = () => t.ev(`document.querySelector('article').innerText`);
    const out = { notPrevented, after, menuOpened, docsOpened };

    await selectWord(); await press('KeyB', 4); out.bold = await text();
    await t.ev(`document.execCommand('undo')`); await selectWord(); await press('KeyI', 4); out.italic = await text();
    await t.ev(`document.execCommand('undo')`); await selectWord(); await press('KeyE', 4); out.code = await text();
    await t.ev(`document.execCommand('undo')`); await selectWord(); await press('KeyK', 4); await t.sleep(150);
    out.link = await text();
    out.menuOnLink = await t.ev(`document.querySelector('.picker').classList.contains('visible')`);

    return out;
};

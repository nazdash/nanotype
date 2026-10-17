export default async (t) => {
    const out = {};
    const state = () => t.ev(`(() => { const s = window.getSelection(); const a = document.querySelector('article'); const c = document.querySelector('.block-caret'); const cr = c.getBoundingClientRect(); const w = document.querySelector('.welcome').getBoundingClientRect(); const inArticle = s.rangeCount && a.contains(s.anchorNode); return (document.activeElement === a ? 'A' : document.activeElement.tagName) + ' sel=' + (inArticle ? 1 : 0) + ' caret=' + c.classList.contains('visible') + '@' + Math.round(cr.top) + ' welcome@' + Math.round(w.top) + '/' + getComputedStyle(document.querySelector('.welcome')).display + ' html=' + JSON.stringify(a.innerHTML).slice(0, 30) })()`);
    const reset = () => t.ev(`document.activeElement.blur(); window.getSelection().removeAllRanges()`);
    const typed = async () => { await t.type('x'); const r = await t.ev(`JSON.stringify(document.querySelector('article').innerHTML)`); await t.key('Backspace'); return r; };
    for (const shape of ['', '<br>', '<div><br></div>', '<div></div>', '<div class="current"><br></div>']) {
        await t.open('/'); await t.ev(`localStorage['focus-mode'] = 'true'; localStorage['zen.doc.' + localStorage['zen.current']] = ${JSON.stringify(shape)}`); await t.reload();
        await reset(); await t.mouse(640, 600); out[`stored ${JSON.stringify(shape)}`] = await state() + ' typed=' + await typed();
    }
    await t.open('/'); await t.click('.focus', 300); await t.focus(); await t.insert('hello world'); await t.sleep(400);
    for (let i = 0; i < 11; i++) await t.key('Backspace');
    await t.sleep(400); await reset(); await t.mouse(640, 600); out.backspaced = await state() + ' typed=' + await typed();
    await t.focus(); await t.insert('again'); await t.sleep(300); await t.click('.new-doc', 400); await reset(); await t.mouse(640, 600); out.newDoc = await state() + ' typed=' + await typed();
    await t.focus(); await t.insert('third'); await t.sleep(300); await t.key('a', 'KeyA', 4); await t.key('Backspace'); await t.sleep(400); await reset(); await t.mouse(640, 600); out.selectAllDelete = await state() + ' typed=' + await typed();
    console.log(JSON.stringify(out, null, 1));
    return {};
};

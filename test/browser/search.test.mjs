// The menu and the documents list find a document by a word in its text; a big
// store stays fast (numbers returned as bounds, not timings)
export const expect = {
    menuEggs: 'Shopping [in the text]', menuZebra: 'zebra facts | Journal [in the text]', menuSea: 'Journal [in the text]', menuEntity: 'Shopping [in the text]',
    menuTheme: 6, opened: 'Shoppingmilk, eggs &', docsStripes: 'zebra facts [in the text]', bigStore: true, openFast: true, filterFast: true, needle: 'perf 59 [in the text]',
};

export default async (t) => {
    await t.open('/');
    await t.focus(); await t.insert('Shopping\n\nmilk, eggs & bread <for> breakfast');
    await t.click('.new-doc'); await t.insert('Journal\n\nwent to the Sea today, zebra crossing');
    await t.click('.new-doc'); await t.insert('zebra facts\n\nstripes');
    await t.ev(`document.querySelector('article').blur()`); await t.sleep(400);
    const out = {};
    const rows = () => t.pickerRows();

    await t.click('.palette');
    await t.filter('eggs'); out.menuEggs = await rows();
    await t.filter('zebra'); out.menuZebra = await rows();
    await t.filter('sea today'); out.menuSea = await rows();
    await t.filter('& bread <for>'); out.menuEntity = await rows();
    await t.filter('theme'); out.menuTheme = (await rows()).split(' | ').length;
    await t.filter('eggs'); await t.key('Enter'); await t.sleep(300); out.opened = await t.ev(`document.querySelector('article').textContent.slice(0, 20)`);
    await t.click('.documents'); await t.filter('stripes'); out.docsStripes = await rows(); await t.click('.documents', 100);

    await t.ev(`{ const idx = JSON.parse(localStorage['zen.docs']); const para = '<div>' + 'lorem ipsum dolor sit amet, consectetur adipiscing elit '.repeat(20) + '</div>'; for (let i = 0; i < 60; i++) { const id = 'perf' + i; idx.push({ id, auto: 'perf ' + i, updated: Date.now() - i }); localStorage['zen.doc.' + id] = para.repeat(70) + (i === 59 ? '<div>needle</div>' : ''); } localStorage['zen.docs'] = JSON.stringify(idx) }`);
    await t.reload();
    out.bigStore = await t.ev(`Object.keys(localStorage).reduce((n, k) => n + localStorage[k].length, 0)`) > 4000000;
    out.openFast = await t.ev(`(() => { const s = performance.now(); document.querySelector('.palette').click(); return performance.now() - s })()`) < 150;
    await t.sleep(200);
    out.filterFast = await t.ev(`(() => { const i = document.querySelector('.picker input'); i.value = 'needle'; const s = performance.now(); i.dispatchEvent(new Event('input')); return performance.now() - s })()`) < 50;
    out.needle = await rows();

    return out;
};

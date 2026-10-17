// The column and the status line: groups and gaps, no column under 1060 px, the
// contents panel's widths, each end of the status line brightening on its own, the
// hint apart from the words, the documents list centred; the size scales the page
export const expect = {
    groups: 3, gaps: '12,12', column1000: 'none', statusWords: 'menu,keys,backup,about',
    hoverRight: { backup: '1', about: '0.55', counter: '0.16' }, hoverLeft: { counter: '1', about: '0.16' }, hintGap: 20, edgeGap: 20,
    docsCentred: true, panel1280: 'block', panel1200: 'picker', panelMarkdown2000: 'block', panelMarkdown1500: 'picker',
    sizes: 's 760 12px block|m 912 14.4px block|l 1115 17.6px none', sizes1920: 'l 1115 17.6px block', panelL1920: 'block', panelL1800: 'picker',
    keyPastL: 'size l kept=false', keyBack: 'size m kept=true',
    blankClicks: 'focus:ARTICLE/1 preview:ARTICLE/1 previewHint:ARTICLE/1 renderedText:BODY/1',
};

export default async (t) => {
    await t.open('/');
    await t.focus(); await t.insert('# One\n\ntext\n\n## Two\n\nmore'); await t.key('Escape', 'Escape');
    const out = {};
    const metrics = (w, h) => t.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });

    out.groups = await t.ev(`document.querySelectorAll('.commands .group').length`);
    out.gaps = await t.ev(`(() => { const g = [...document.querySelectorAll('.commands .group')].map(e => e.getBoundingClientRect()); return g.slice(1).map((r, i) => Math.round(r.top - g[i].bottom)).join(',') })()`);
    await metrics(1000, 700); await t.sleep(200); out.column1000 = await t.ev(`getComputedStyle(document.querySelector('.ui')).display`);
    await metrics(1280, 800); await t.sleep(200);
    out.statusWords = await t.ev(`[...document.querySelectorAll('.status-right button')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.textContent).join(',')`);

    const b = await t.rect('.status .backup'); await t.mouse(b.x + b.width / 2, b.y + b.height / 2, 'move');
    out.hoverRight = await t.ev(`({ backup: getComputedStyle(document.querySelector('.status .backup')).opacity, about: getComputedStyle(document.querySelector('.status .about')).opacity, counter: getComputedStyle(document.querySelector('.statistic')).opacity })`);
    const c = await t.rect('.statistic'); await t.mouse(c.x + c.width / 2, c.y + c.height / 2, 'move');
    out.hoverLeft = await t.ev(`({ counter: getComputedStyle(document.querySelector('.statistic')).opacity, about: getComputedStyle(document.querySelector('.status .about')).opacity })`);
    await t.ev(`document.querySelector('.status-message').textContent = 'every command, with its key ⌘K'`);
    out.hintGap = await t.ev(`Math.round(document.querySelector('.status .palette').getBoundingClientRect().left - document.querySelector('.status-message').getBoundingClientRect().right)`);
    out.edgeGap = await t.ev(`Math.round(innerWidth - document.querySelector('.status .about').getBoundingClientRect().right)`);

    await t.click('.documents'); out.docsCentred = await t.ev(`(() => { const p = document.querySelector('.picker').getBoundingClientRect(); return Math.abs(p.left + p.width / 2 - innerWidth / 2) < 2 && Math.round(p.width) === 560 })()`); await t.key('Escape', 'Escape');

    const panel = async (w, markdown) => {
        await metrics(w, 800); await t.sleep(200);
        if (markdown !== await t.ev(`document.body.classList.contains('markdown-mode')`)) await t.click('.markdown', 300);
        await t.key('L', 'KeyL', 12); await t.sleep(300);
        const picker = (await t.pickerOpen()).startsWith('true');
        const display = await t.ev(`getComputedStyle(document.querySelector('.contents-panel')).display`);
        await t.key('Escape', 'Escape'); if (!picker) await t.key('L', 'KeyL', 12);
        return picker ? 'picker' : display;
    };
    out.panel1280 = await panel(1280, false);
    out.panel1200 = await panel(1200, false);
    out.panelMarkdown2000 = await panel(2000, true);
    out.panelMarkdown1500 = await panel(1500, true);

    // the size scales the column (its measure in characters), the interface words and
    // the width under which the command column goes
    await t.click('.markdown', 300); await metrics(1440, 900); await t.sleep(200);
    const size = () => t.ev(`document.querySelector('.font-size').textContent.slice(5) + ' ' + Math.round(document.querySelector('section').getBoundingClientRect().width) + ' ' + getComputedStyle(document.querySelector('.status-message')).fontSize + ' ' + getComputedStyle(document.querySelector('.ui')).display`);
    const sizes = [await size()];
    for (let i = 0; i < 2; i++) { await t.key('=', 'Equal', 4); sizes.push(await size()); }
    out.sizes = sizes.join('|');
    await metrics(1920, 900); await t.sleep(200); out.sizes1920 = await size();
    out.panelL1920 = await panel(1920, false);
    out.panelL1800 = await panel(1800, false);
    // past the last size the key is the browser's (zoom); back inside it is ours
    const kept = () => t.ev(`(() => { const e = new KeyboardEvent('keydown', { key: '=', code: 'Equal', metaKey: true, cancelable: true, bubbles: true }); document.dispatchEvent(e); return e.defaultPrevented })()`);
    out.keyPastL = (await t.ev(`document.querySelector('.font-size').textContent`)) + ' kept=' + await kept();
    await t.key('-', 'Minus', 4); await t.sleep(100);
    out.keyBack = (await t.ev(`document.querySelector('.font-size').textContent`)) + ' kept=' + await kept();


    // a click around the text puts the caret in it: the page in focus mode, the
    // preview's empty space and welcome text; not the rendered text itself
    await t.open('/'); await metrics(1280, 800); await t.sleep(200);
    const probe = async (x, y) => { await t.ev(`document.activeElement.blur(); window.getSelection().removeAllRanges()`); await t.mouse(x, y); return await t.ev(`document.activeElement.tagName + '/' + window.getSelection().rangeCount`); };
    const clicks = [];
    await t.click('.focus', 300); clicks.push('focus:' + await probe(640, 650));
    await t.click('.markdown', 300); clicks.push('preview:' + await probe(900, 650)); clicks.push('previewHint:' + await probe(900, 420));
    await t.focus(); await t.insert('# Title\n\nsome words here', 400); const h = await t.rect('.markdown-showcase h1'); clicks.push('renderedText:' + await probe(h.x + 10, h.y + h.height / 2));
    out.blankClicks = clicks.join(' ');

    return out;
};

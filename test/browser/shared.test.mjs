// A share link: the writer's font and size travel; the reader opens rendered in the
// system theme with only a reader's commands; import brings everything back
// Wide enough for the contents panel at size l (1280 px times the size's scale)
export const options = { width: 1920 };
export const expect = {
    writer: 'font serif size l theme night', reader: 'font serif size l theme system', column: 'import to edit,contents off,size l,theme system,font serif', status: 'about',
    menu: 'import to edit,export as .md,export as .txt,print or save as PDF…,contents on,size s,size m,size l,theme system,theme light,theme dark,theme green,theme sand,theme night,font mono,font sans,font serif,keys,about',
    rendered: 'article=none showcase=block h1=true', boxInert: true, markdownKeyIgnored: true, contentsPanel: 'contents on panel=block items=1', jump: true,
    afterImport: 'shared=false font mono size s theme system markdown=false', imported: '# Shared note',
    lockedDialog: 'This link is locked', wrongSeed: 'wrong seed word', unlocked: true,
    longNote: 'short=hidden long=shown:This text makes a link of about',
};

export default async (t) => {
    await t.open('/');
    await t.focus(); await t.insert('# Shared note\n\nbody with **bold** and `code`\n\n- [ ] a task\n\n```js\nlet a = 1;\n```');
    for (const c of ['.font-flip', '.font-flip', '.font-size', '.font-size']) await t.click(c, 50);
    for (let i = 0; i < 5; i++) await t.click('.color-flip', 50);
    const look = () => t.ev(`document.querySelector('.font-flip').textContent + ' ' + document.querySelector('.font-size').textContent + ' ' + document.querySelector('.color-flip').textContent`);
    const out = { writer: await look() };

    await t.click('.share'); await t.click('.share-modal [data-choice=public]', 600);
    const link = await t.ev(`document.querySelector('.link-output').value`);
    await t.key('Escape', 'Escape');

    // a private link too, for the unlock dialog
    await t.click('.share'); await t.click('.share-modal [data-choice=private]', 300);
    await t.ev(`document.querySelector('.seed-input').value = 'apple river stone'`);
    await t.click('.share-modal [data-choice=make]', 1500);
    const privateLink = await t.ev(`document.querySelector('.link-output').value`);
    await t.key('Escape', 'Escape');

    await t.ev(`localStorage.clear()`); await t.send('Page.navigate', { url: 'about:blank' }); await t.sleep(200);
    await t.send('Page.navigate', { url: link }); await t.sleep(1800);
    out.reader = await look();
    out.column = await t.ev(`[...document.querySelectorAll('.commands button')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.textContent).join(',')`);
    out.status = await t.ev(`[...document.querySelectorAll('.status-right button')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.textContent).join(',')`);
    await t.click('.palette'); out.menu = await t.ev(`[...document.querySelectorAll('.picker-item .label')].map(e => e.textContent).join(',')`); await t.key('Escape', 'Escape');
    out.rendered = await t.ev(`'article=' + getComputedStyle(document.querySelector('article')).display + ' showcase=' + getComputedStyle(document.querySelector('.markdown-showcase')).display + ' h1=' + !!document.querySelector('.markdown-showcase h1')`);
    const box = JSON.parse(await t.ev(`JSON.stringify(document.querySelector('.task-list-item-checkbox').getBoundingClientRect())`));
    await t.mouse(box.x + 4, box.y + box.height / 2); await t.sleep(300);
    out.boxInert = await t.ev(`document.querySelector('article').textContent.includes('[ ]') && !document.querySelector('.task-list-item-checkbox').checked`);
    await t.key('M', 'KeyM', 12); out.markdownKeyIgnored = await t.ev(`document.body.classList.contains('markdown-mode')`);
    await t.click('.contents', 300); out.contentsPanel = await t.ev(`document.querySelector('.contents').textContent + ' panel=' + getComputedStyle(document.querySelector('.contents-panel')).display + ' items=' + document.querySelectorAll('.contents-panel button').length`);
    await t.ev(`document.querySelector('.contents-panel button').click()`); await t.sleep(200);
    out.jump = await t.ev(`Math.abs(document.querySelector('.markdown-showcase h1').getBoundingClientRect().top - 48) < 60`);
    await t.click('.contents', 100);
    await t.click('.import-shared', 600);
    out.afterImport = await t.ev(`'shared=' + document.body.classList.contains('shared')`) + ' ' + await look() + await t.ev(`' markdown=' + document.body.classList.contains('markdown-mode')`);
    out.imported = (await t.lines())[0];

    await t.ev(`localStorage.clear()`); await t.send('Page.navigate', { url: 'about:blank' }); await t.sleep(200);
    await t.send('Page.navigate', { url: privateLink }); await t.sleep(1800);
    out.lockedDialog = await t.ev(`document.querySelector('.unlock-modal h1').textContent`);
    await t.ev(`document.querySelector('.unlock-input').value = 'wrong words here'`); await t.click('.unlock-modal [data-choice=open]', 800);
    out.wrongSeed = await t.ev(`document.querySelector('.unlock-error').textContent`);
    await t.ev(`document.querySelector('.unlock-input').value = 'apple river stone'`); await t.click('.unlock-modal [data-choice=open]', 1500);
    out.unlocked = await t.ev(`document.querySelector('article').textContent.includes('Shared note') && document.querySelector('.overlay').style.display === 'none'`);

    // the warning before the choice: absent for a short text, there for one that makes a long link (random letters do not compress)
    await t.ev(`localStorage.clear()`); await t.goto('/', 1200); await t.focus(); await t.insert('short', 300);
    await t.click('.share', 300); const short = await t.ev(`document.querySelector('.share-long').hidden ? 'hidden' : 'shown'`); await t.key('Escape', 'Escape');
    await t.ev(`document.execCommand('insertText', false, Array.from({ length: 40000 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join(''))`); await t.sleep(400);
    await t.click('.share', 300); out.longNote = 'short=' + short + ' long=' + await t.ev(`(document.querySelector('.share-long').hidden ? 'hidden' : 'shown') + ':' + document.querySelector('.share-long').textContent.slice(0, 31)`); await t.key('Escape', 'Escape');

    return out;
};

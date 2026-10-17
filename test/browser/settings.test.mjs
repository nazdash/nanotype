// Theme system follows the OS; duplicate; the zip export; the frontmatter block and
// the copy word in the preview; the hint word for a refusal
export const expect = {
    freshDarkOs: 'scheme-dark-and-white/system', osToLight: 'scheme-light/system', chosenLightUnderDark: 'scheme-light/light', storedLightDarkOs: 'scheme-light/light',
    cycle: 'light,dark,green,sand,night,system', duplicate: 'Recipe|Recipe', opened: 'Recipeflour',
    zipName: true, zipFiles: 'documents/Notes (2).md,documents/Notes.md,documents/Recipe (2).md,documents/Recipe.md,documents/abcd quoted.md,nanotype-backup.json',
    emptyPreview: 'Here your text is rendered as you write it.|', frontmatter: '<dl class="frontmatter"><div><dt>title</dt><dd>Notes</dd></div></dl>', copyWord: 'copy', copied: 'let a = 1;\n', copyAfter: 'copied',
    nothingToShare: 'nothing to share', fileDrop: 'dropped note|imported note.md', dragHint: 'drop to import as a new document (.txt, .md; .json restores a backup)|true', dragLeft: '|false',
};

export default async (t) => {
    const os = (v) => t.media([{ name: 'prefers-color-scheme', value: v }]);
    await os('dark'); await t.open('/');
    const state = () => t.ev(`document.documentElement.className + '/' + document.querySelector('.color-flip b').textContent`);
    const out = { freshDarkOs: await state() };
    await os('light'); await t.sleep(200); out.osToLight = await state();
    await os('dark'); await t.sleep(200);
    const cycle = [];
    for (let i = 0; i < 6; i++) { await t.click('.color-flip', 60); cycle.push(await t.ev(`document.querySelector('.color-flip b').textContent`)); }
    out.cycle = cycle.join(',');
    await t.click('.color-flip', 60); out.chosenLightUnderDark = await state();
    await t.ev(`localStorage.scheme = 'scheme-light'`); await t.reload(); out.storedLightDarkOs = await state();
    await os('light');

    await t.focus(); await t.insert('Recipe\n\nflour, water'); await t.ev(`document.querySelector('article').blur()`); await t.sleep(400);
    await t.click('.documents'); await t.key('d', 'KeyD', 4); await t.sleep(400);
    out.duplicate = await t.ev(`JSON.parse(localStorage['zen.docs']).map(d => d.auto).join('|')`);
    out.opened = await t.ev(`document.querySelector('article').textContent.slice(0, 11)`);

    await t.ev(`window.__saved = []; const make = URL.createObjectURL.bind(URL); URL.createObjectURL = (blob) => { window.__saved.push({ blob }); return make(blob) }; HTMLAnchorElement.prototype.click = function () { window.__saved[window.__saved.length - 1].name = this.download }`);   // the download is a link click on a blob url (util.download)
    await t.click('.new-doc'); await t.insert('Notes\n\nfirst'); await t.click('.new-doc'); await t.insert('Notes\n\nsecond'); await t.click('.new-doc'); await t.insert('a/b:c*d? "quoted"\nline');
    await t.ev(`document.querySelector('article').blur()`); await t.sleep(400);
    await t.click('.palette'); await t.filter('zip'); await t.key('Enter'); await t.sleep(500);
    out.zipName = /^nanotype-\d{4}-\d{2}-\d{2}\.zip$/.test(await t.ev(`window.__saved[0].name`));
    out.zipFiles = await t.ev(`window.__saved[0].blob.arrayBuffer().then(b => { const u = new Uint8Array(b); const names = []; let i = 0; while (i < u.length - 4) { if (u[i] === 0x50 && u[i+1] === 0x4b && u[i+2] === 3 && u[i+3] === 4) { const n = u[i+26] | (u[i+27] << 8); const e = u[i+28] | (u[i+29] << 8); names.push(new TextDecoder().decode(u.slice(i + 30, i + 30 + n))); i += 30 + n + e; } else i++; } return names.sort().join(',') })`);

    await t.click('.new-doc'); await t.click('.markdown', 300);
    out.emptyPreview = await t.ev(`document.querySelector('.preview-welcome p').textContent`) + '|'; await t.click('.markdown', 200);
    await t.insert('---\ntitle: Notes\n---\n# Hi\n\n```js\nlet a = 1;\n```'); await t.click('.markdown', 500);
    out.frontmatter = await t.ev(`document.querySelector('.markdown-showcase .frontmatter').outerHTML`);
    out.copyWord = await t.ev(`document.querySelector('.code-block .copy').textContent`);
    await t.send('Browser.grantPermissions', { permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'], origin: t.base });
    const cb = await t.rect('.code-block .copy'); await t.mouse(cb.x + cb.width / 2, cb.y + cb.height / 2); await t.sleep(300);
    out.copied = await t.ev(`navigator.clipboard.readText()`);
    out.copyAfter = await t.ev(`document.querySelector('.code-block .copy').textContent`);
    await t.click('.markdown', 200);

    await t.click('.new-doc'); await t.click('.share', 300);
    out.nothingToShare = await t.ev(`document.querySelector('.share .note').textContent`);

    await t.ev(`(() => { const dt = new DataTransfer(); dt.items.add(new File(['x'], 'note.md', { type: 'text/markdown' })); document.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true })) })()`); await t.sleep(100);
    out.dragHint = await t.status() + '|' + await t.ev(`document.body.classList.contains('dragging')`);
    await t.ev(`document.dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true, relatedTarget: null }))`); await t.sleep(100);
    out.dragLeft = await t.status() + '|' + await t.ev(`document.body.classList.contains('dragging')`);
    await t.ev(`(() => { const dt = new DataTransfer(); dt.items.add(new File(['dropped note'], 'note.md', { type: 'text/markdown' })); document.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })) })()`); await t.sleep(500);
    out.fileDrop = await t.text() + '|' + await t.status();

    return out;
};

// Every combination of saved settings and stored document shapes must start: no
// blank page, no exception (the shapes include what older versions stored)
export const options = { timeout: 300000 };
export const expect = { total: 72, bad: 0 };

export default async (t) => {
    await t.goto('/');
    const contents = ['', '<br>', '<div><br></div>', '<div class="current"><br></div>', 'abc', '<div class="">abc</div><div class="current">def</div>'];
    let bad = 0;
    let total = 0;

    for (const focus of ['true', 'false']) {
        for (const font of ['font-scheme-monospace', 'font-scheme-serif']) {
            for (const caret of ['{}', '{"font-scheme-monospace":false}', '{"font-scheme-serif":true}']) {
                for (const content of contents) {
                    t.errors.length = 0;
                    await t.ev(`localStorage.clear(); localStorage['zen.docs'] = JSON.stringify([{id: 'd1', title: '', auto: '', updated: 1}]); localStorage['zen.current'] = 'd1'; localStorage['zen.doc.d1'] = ${JSON.stringify(content)}; localStorage['focus-mode'] = '${focus}'; localStorage['font-scheme'] = '${font}'; localStorage['caret-prefs'] = '${caret}'`);
                    await t.reload(900);
                    total++;

                    if (await t.ev(`getComputedStyle(document.body).display`) !== 'block' || t.errors.length) {
                        bad++;
                    }
                }
            }
        }
    }

    t.errors.length = 0;
    return { total, bad };
};

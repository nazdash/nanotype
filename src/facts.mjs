// The product's facts, in one place: what the page's metadata, the JSON-LD and the
// generated files (robots.txt, sitemap.xml, llms.txt) say about Nanotype. A fact
// written anywhere else is a drift: test/seo.test.mjs checks index.html against
// this file. Plain data, no code, so the build (gulp) and the tests can both read it.
export default {
    name: 'Nanotype',
    formerName: 'Zen',
    title: 'Nanotype - Online Text Editor',
    line: 'A private place to write.',
    description: 'Nanotype is a free online text editor: minimal, private, plain text and Markdown. Your text stays in your browser, it works offline, and a share link carries the text inside itself.',
    url: 'https://nanotype.app/',
    formerUrl: 'https://zen.unit.app/',
    language: 'en',
    since: 2016,            // as Zen; Nanotype since October 2026
    renamed: '2026-10',
    publisher: {
        name: 'Unit',
        url: 'https://unit.app/',
        email: 'support@unit.app',
    },
    price: 0,
    source: 'https://github.com/nazdash/nanotype',
    licence: 'AGPL-3.0',
    copyright: 'Nazir Dashtiev',

    // what leaves the browser, for the generated files; About says it in its own words
    privacy: 'The text never leaves the browser. Visits and commands are counted with cookie-free PostHog; the text is never part of that. A picture named by its address is fetched from there when the preview shows it.',
    analytics: 'PostHog',

    // the product, as lists the generated files can name
    formats: { reads: ['.txt', '.md'], writes: ['.md', '.txt', 'PDF (print)', '.json backup', '.zip of .md files'] },
    themes: ['system', 'light', 'dark', 'green', 'sand', 'night'],
    fonts: ['mono (Nanotype Mono, a build of Iosevka)', 'sans (Inter)', 'serif (Literata)'],
    sizes: ['s', 'm', 'l'],
    cursors: ['block', 'thin'],
    sounds: ['off', 'soft', 'click', 'blip', 'typewriter'],
    trashDays: 30,
    shareLinks: ['public: the text, compressed, after the # of the address', 'private: the same, locked with a seed word (AES-GCM); the seed word never leaves the browser'],
    folderCopy: 'Chromium browsers on a computer (File System Access): every document kept as a .md file in a folder of your choice',
    offline: 'after the first visit; installs as an app',
    devices: 'any current browser on a computer, tablet or phone',

    doesNot: [
        'no account, no sign-in',
        'no server holding the text, no sync between devices (a share link, a backup file or the folder copy carries it)',
        'no rich text: plain text and Markdown only',
        'no plugins',
        'no pictures stored in the app (a picture is named by its address)',
    ],

    credits: [
        'Nanotype Mono is a build of Iosevka',
        'Inter by Rasmus Andersson',
        'Literata by TypeTogether for Google Fonts',
    ],
};

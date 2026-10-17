// The files search engines and AI assistants read, built from facts.mjs at build
// time (gulp) and never edited by hand: robots.txt, sitemap.xml, llms.txt and
// llms-full.txt, plus the JSON-LD the page carries (test/seo.test.mjs checks
// index.html holds exactly this). Nothing here is loaded by the app.
import facts from './facts.mjs';

const list = (items) => items.map(item => `- ${item}`).join('\n');

export function jsonLd() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: facts.name,
        alternateName: facts.formerName,
        url: facts.url,
        description: facts.description,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        inLanguage: facts.language,
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: String(facts.price), priceCurrency: 'USD' },
        publisher: { '@type': 'Organization', name: facts.publisher.name, url: facts.publisher.url },
    };
}

export function files() {
    const robots = `User-agent: *
Allow: /

Sitemap: ${facts.url}sitemap.xml
`;

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${facts.url}</loc>
  </url>
</urlset>
`;

    const llms = `# ${facts.name}

> ${facts.description}

${facts.name} (formerly ${facts.formerName}, renamed ${facts.renamed}) is made by ${facts.publisher.name} (${facts.publisher.url}). It is free. ${facts.privacy}

## What it is

- An online text editor: open ${facts.url} and type. The text is saved in the browser as you type and is there on the next visit.
- Plain text and Markdown, with a live preview, tasks you can tick, tables, footnotes, code blocks.
- Works offline ${facts.offline}. Runs on ${facts.devices}.
- Several documents, a trash that keeps a deleted document ${facts.trashDays} days, a command menu (Cmd/Ctrl + K) that reaches everything.
- Share a document as a link that carries the text inside itself; a private link is locked with a seed word.
- Backups: export everything as a .json file or a .zip of .md files; on ${facts.folderCopy.split(' (')[0]}, a folder kept up to date.

## What it deliberately does not do

${list(facts.doesNot)}

## Links

- [The app](${facts.url}): the editor itself; About (inside the app) says the same as this file.
- [Full description](${facts.url}llms-full.txt): formats, themes, fonts, keys, privacy in detail.
- [${facts.publisher.name}](${facts.publisher.url}): who makes it. Support: ${facts.publisher.email}.
- [Source](${facts.source}): the code, ${facts.licence}; what leaves the browser can be read there.
`;

    const full = `# ${facts.name}: full description

${facts.description}

Address: ${facts.url} (formerly ${facts.formerUrl}, which hands a visitor's documents over to the new address). Made by ${facts.publisher.name}, ${facts.publisher.url}, since ${facts.since} as ${facts.formerName}; ${facts.name} since ${facts.renamed}. Free, no account.

## Privacy

${facts.privacy} The counts go to cookie-free ${facts.analytics} and say which commands run and how (column, key, menu), which settings a browser lives with, where a visit came from and the browser and system as coarse words; never a name, a cookie, a screen size or a word of the text. There is no server holding text, no account and no sync; the browser's own storage holds the only copy, so a backup (export everything) or the folder copy is how a copy outlives the browser. A share link carries the text after the # of the address, which browsers never send to a server; a private link is locked with a seed word that never leaves the browser.

## Writing

- Plain text, always: paste gives text, formatting from any source never gets in.
- Markdown: a live preview beside the text (headings, lists, tasks that tick, tables, footnotes, frontmatter, code blocks with highlighting and a copy word, pictures by address).
- Slash commands: / at the start of a line inserts the date, the time, a table, a code block, a task, a link, a picture, a heading, a frontmatter block.
- Editing keys: tick a task, make a task, move a line, indent, headings, open an address, tidy pasted text (broken lines joined, spaces evened, bullets made Markdown), paste an address over selected words to link them, Tab between table cells.
- Focus mode, line numbers, a contents list of the headings, fullscreen, spellcheck, a word and character count.
- today: the document for today's date, opened or started.

## Look

- Themes: ${facts.themes.join(', ')}.
- Fonts: ${facts.fonts.join('; ')}.
- Sizes: ${facts.sizes.join(', ')} (the page scales with the text).
- Cursor: ${facts.cursors.join(' or ')}. Key sounds: ${facts.sounds.join(', ')}.
- The interface is a few words at the edges of the page, nearly invisible until reached for; no icons, cards or buttons.

## Files

- Reads: ${facts.formats.reads.join(', ')} (import a file, or drop it on the page).
- Writes: ${facts.formats.writes.join(', ')}.
- ${facts.folderCopy}.
- A deleted document stays in the trash ${facts.trashDays} days.

## Share links

${list(facts.shareLinks)}

## Devices

Works on ${facts.devices}; offline ${facts.offline}. A phone gets the same app with a menu word at the bottom instead of the command column.

## What it deliberately does not do

${list(facts.doesNot)}

## Credits

${list(facts.credits)}

## Links

- App: ${facts.url}
- Short description: ${facts.url}llms.txt
- Publisher: ${facts.publisher.url}, ${facts.publisher.email}
- Source: ${facts.source} (${facts.licence}, copyright ${facts.copyright})
`;

    return {
        'robots.txt': robots,
        'sitemap.xml': sitemap,
        'llms.txt': llms,
        'llms-full.txt': full,
    };
}

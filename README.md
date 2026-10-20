# Nanotype

A free, minimal, private online text editor by [Unit](https://unit.app). Live at [nanotype.app](https://nanotype.app). Nanotype was called Zen, at zen.unit.app and zen.unit.ms, until October 2026; the old addresses still hand a visitor's documents over to the new one (`src/js/components/move.js`), which is why the storage keys and the backup format still carry the old name.

Everything you write stays in your browser (`localStorage`); nothing is sent to a server, and a share link carries the text itself rather than pointing to a copy somewhere. The page makes no third-party requests: fonts are bundled, and the only thing that leaves is a count of visits and commands (cookie-free, no SDK, through the site's own domain; exactly what is sent is in `docs/analytics.md` and `src/js/components/stats.js`).

## The source is public

- So the privacy claim can be checked: `src/js/components/stats.js` is the whole of what leaves the browser, `docs/analytics.md` says what it means, and the Content-Security-Policy in `vercel.json` has the browser enforce it: the page may connect to its own domain only.
- So the app can outlive us: it is a static site, `npm run build` makes it, any host serves it (`DEPLOY.md`).
- Issues are welcome, especially a bug with steps to reproduce. The roadmap is ours and follows `PRINCIPLES.md`: feature pull requests are rarely taken; a small fix with a test is (`CONTRIBUTING.md`).
- No support promises; the address is the one in About.
- Licence: [AGPL-3.0](LICENSE), copyright Nazir Dashtiev. Use it, change it, host it; a changed copy that people use must publish its source under the same licence and keep the notice in About. The name Nanotype and the wordmark are not part of the licence. What the app is made with, and under what terms, is in `CREDITS.md`.

## Features

- Multiple documents, kept in the browser, each named by its first line: duplicate, delete to a trash that keeps them 30 days
- Import `.txt` / `.md` files as new documents (file picker or drag and drop); export as `.md` (default) or `.txt`; print or save as PDF
- Share a document as a link that carries the text inside itself (after the `#`, which browsers never send to a server), public or locked with a seed word (AES-GCM in the browser; Nanotype never sees the seed). Nothing is stored anywhere. The reader sees it rendered, with the writer's font and size.
- Markdown mode with a live side-by-side preview (tables, task lists you can tick, footnotes, frontmatter, highlighted code with a `copy` word), focus mode (dims other paragraphs, keeps the caret line centred), line numbers, fullscreen
- Contents: the document's headings as a clickable list in the margin, or in the menu on small screens; `go to heading…` to jump by typing
- A command menu (`Cmd/Ctrl + K`) in groups that runs every command and finds a document by a word in its text; slash commands (`/` at a line start: date, time, table, code block, task, link, headings, frontmatter)
- Tables by hand: Tab between cells, a row after the last, columns lined up when you leave the table; `today` opens or starts the day's document
- `tidy` in the menu joins hard-wrapped lines, evens spaces and tabs, makes bullets markdown; on the selection or the whole text, one undo step
- Editing keys: ⌘Enter ticks a task, ⌘⇧Enter makes one (on a selection: all of them), ⌥↑↓ moves a line, ⌘⌥1–6 headings, ⌘] ⌘[ indent, ⌘-click opens an address
- Six themes (system, light, dark, green, sand, night); the text in mono, sans or serif, in three sizes; block or thin cursor; key sounds (typewriter, or synthesised soft, click and blip); follows the system's reduce-motion and increase-contrast settings
- A status line with word and character counts and a reading time; select text to count the selection
- Works offline (cache-first service worker) and can be installed as an app
- Never loses text: saves after a pause and at once on blur or unload, keeps the previous copy when a document shrinks, says so when storage is full; "export everything" as .md files in a zip or as one .json, and "import a backup"; on Chromium desktops, a folder kept up to date with every document as .md (File System Access API)

The full list of what changed, by day, is `CHANGELOG.md`.

## Principles

In `PRINCIPLES.md`, sixteen of them: minimal, everything must earn its place; nothing distracts from writing; private, the text never leaves the browser; never lose anyone's data; fewer clicks, fewer windows; transparency; clear to someone who has never seen it; works on every device and browser it can; ask first what if we did not build it; a hammer, not a jet engine; the simplest, lightest solution; the right part for each job, one part for alike jobs; use known patterns where they exist; be creative where no pattern exists; nothing personal is counted, only how the product is used; it just works.

## Design

The interface is as plain as it can be: words, hairlines and whitespace, one typeface. `DESIGN.md` says how the interface follows the principles; read it before changing anything visible.

- One typeface for the whole interface: Nanotype Mono. Sans (Inter) and serif (Literata) are options for the text only.
- Black on white or the reverse, plus the sand, night and green themes. One accent blue, `#00A3E0`.
- No icons, cards, shadows or rounded corners. Commands are plain words; structure comes from hairlines and whitespace.
- The interface is nearly invisible until the pointer comes close, and hides while you type.
- Motion is 75 ms and linear.

Nanotype Mono is a build of [Iosevka](https://github.com/be5invis/Iosevka) with Cyrillic and the keyboard symbols. The recipe is `fonts/nanotype-mono.build-plans.toml`; its header says how to compile it. Font licences are in `public/fonts/LICENSE.txt`.

## Where things are

A static site: Gulp builds `src/` into `dist/`; `public/` is copied as is. No framework, no server. The script is 117 KB gzipped (highlight.js with twenty languages is most of it), the stylesheet 6 KB (2026-10-14).

| path | what |
|---|---|
| `public/index.html` | the one page: the editor, the column of commands, the status line, the dialogs (About, Keys, Share, Backup…) |
| `public/404.html`, `public/sw.js` | the missing-address page; the service worker (the build stamps it with the files to cache) |
| `src/js/main.js` | startup: the editor, the interface, the move from the old address, the counts, the service worker |
| `src/facts.mjs`, `src/seo.mjs` | the product's facts in one place, and the files built from them for search engines and AI assistants (robots, sitemap, llms.txt) plus the page's JSON-LD; `test/seo.test.mjs` keeps `index.html` in step |
| `src/js/keys.js` | every name under which something is stored in the browser; a contract, never renamed casually |
| `src/js/enums.js` | the old and new addresses, a file-name limit |
| `src/js/components/editor.js` | the contenteditable: load, save (debounced, flushed on blur/unload), lock, the plain-text guards |
| `src/js/components/documents.js` | the document store in `localStorage`: list, create, save, previous copy, trash, search text |
| `src/js/components/backup.js`, `folder.js` | "export everything" (.json, zip of .md) and "import a backup"; the folder copy (File System Access) |
| `src/js/components/share.js` | a document packed into a link: deflate, base64url, AES-GCM with a seed word; unit-tested |
| `src/js/components/move.js` | the hand-over of documents from zen.unit.app to nanotype.app through a fragment |
| `src/js/components/markdown.js` | the preview: markdown-it with task lists, footnotes, frontmatter, highlight.js, the `copy` word; unit-tested |
| `src/js/components/tables.js` | Tab between table cells, a new row, columns lined up on leaving |
| `src/js/components/tidy.js` | the tidy rules, pure text in and out; unit-tested |
| `src/js/components/sounds.js` | the synthesised key sounds (Web Audio) |
| `src/js/components/stats.js` | what leaves the browser for the counts, and nothing else |
| `src/js/components/utils.js` | text helpers: HTML ↔ plain text, a document's name (its first line) and file names, clipboard |
| **the interface**, one file per part: | |
| `src/js/components/ui.js` | init and bindings, settings load/save, the status line, the look (font, size, theme), markdown mode, dialogs, spelling, **the command menu and the keyboard table** (every command is listed in these two tables and in Keys) |
| `src/js/components/app.js` | the one object the parts share: elements, state, the few functions they all call |
| `src/js/components/picker.js` | the list used for the menu, documents, trash, contents and slash commands |
| `src/js/components/docs.js` | the documents list, duplicate/delete, the trash, a new document |
| `src/js/components/caret.js` | the block cursor, focus mode, line numbers, "every line is a block", the caret kept across a dialog |
| `src/js/components/lines.js` | tasks, headings, moving a line, indent, the slash commands, list continuation |
| `src/js/components/paste.js` | paste, drop, copy and cut, plain; the big paste's own undo step |
| `src/js/components/sharing.js` | the share dialog, the shared (read-only) view, the locked-link dialog, the moved banner |
| `src/js/components/files.js` | the backup dialog, importing files, exporting this document or everything |
| `src/js/components/contents.js`, `counter.js`, `key-sounds.js`, `ripples.js` | the headings list; the word count; which key makes which sound; the ripples behind an empty page |
| `src/scss/` | one file per part too: `style.scss` imports them in order; `_variables` and `_mixins` (sizes, scales), `_tokens` (themes), `_fonts`, `_base`, `_editor`, `_preview`, `_column`, `_status`, `_picker`, `_dialogs`, `_accessibility`, `_print`, `_media-queries` (touch and narrow windows, last) |
| `fonts/`, `scripts/`, `assets/` | the font recipe; the two Python tools that redraw the icons (`make-icons.py`, from `assets/icon.png`) and the pixel wordmark (`wordmark.py`) |
| `test/` | unit tests in Node (`share`, `markdown`, `names`, `tidy`, `seo`); `browser/` (sixteen headless-Chrome suites, see its README) |
| `docs/analytics.md` | the ledger of what is counted |

## Development

```bash
npm ci
npm run dev              # build, serve dist/ on http://localhost:3002 with live reload
npm run build            # production build into dist/ (not while the dev server runs: it wipes dist/)
npm test                 # unit tests: share, markdown, names, tidy, seo
npm run test:browser     # 16 headless-Chrome suites against the dev server, about four minutes
```

Requires Node 24 and, for the browser tests, Google Chrome. `AGENTS.md` holds the working rules for anyone, person or agent, who changes the code (commit locally, changelog before every push, never lose data, keep Keys in step with the code).

## Documents

- [PRINCIPLES.md](PRINCIPLES.md): the sixteen principles; every change is judged against them.
- [DESIGN.md](DESIGN.md): how Nanotype looks and behaves, and why; which file each component lives in.
- [CHANGELOG.md](CHANGELOG.md): what changed for the people who use it, by day.
- [docs/analytics.md](docs/analytics.md): what is counted, field by field.
- [DEPLOY.md](DEPLOY.md): a static site; how it is built, hosted and why the old addresses stay.

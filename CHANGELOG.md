# Changelog

What changed for the people who use Nanotype, by day. Newest first. Updated with every push to `main` (see `AGENTS.md`).

## 2026-10-20

- About says again who makes it: "Nanotype (prev. Zen) is made by the Unit team."; the credits line reads "Since 2016 · AGPL-3.0 · source".
- The share dialog says that a link cannot be taken back: whoever has it has the text.
- The menu finds the export commands when you type "download": each export row says so in its hint.

## 2026-10-17

- About is shorter: the fonts, the sounds and the seed words are named; the rest of what the app is made with is in `CREDITS.md` in the repository. Unit is named once, in the copyright line, with its link; the page description no longer says "by Unit".
- The source is public under AGPL-3.0: [github.com/nazdash/nanotype](https://github.com/nazdash/nanotype). About links the licence and the code, and `llms.txt` points there.

## 2026-10-16

- Share: when the text would make a link longer than some messengers carry, the dialog says so before the choice, with the size; the link is still made and opens in a browser.
- About ends with "Since 2016. © Unit."
- The thin cursor is in the accent colour, like the block.
- A backup file is named `nanotype-backup-<date>.json` (was `zen-backup-…`); old files still import.

## 2026-10-15

- Ripples: while the page is empty, slow shapes of grey characters drift behind the welcome, and a click on the page sends a soft ripple through them in the accent colour; it rises over two seconds and fades on the first key. `ripples off` in the menu's appearance group turns it off, remembered.
- The menu is grouped by subject: `documents` (all of them), `document` (this one: share, export, print, tidy), `editor` (lines, focus, contents, markdown, spellcheck, fullscreen), `appearance`, `help`. The Keys dialog has the same headings.
- In markdown mode the preview's welcome sits level with the welcome at every text size.
- Safari showed no wordmark on the empty page; it does again.

## 2026-10-14

- The browser now enforces that the page talks to nanotype.app alone (a Content-Security-Policy header): what the About says, checked by the browser on every visit.
- A typed `class="…"` in the text no longer disappears on save (it was taken for the editor's own mark on the current line).
- With storage full, a new document, a duplicate, `today`, an import or a restore from the trash say so instead of failing silently.
- Two tabs: what was typed in one is saved before the other's change is shown.
- In a narrow window on a computer the menu keeps its keyboard selection and key hints; only the layout changes with the width.
- The counts go to PostHog alone; the second counter that ran beside it since 2026-10-08 is gone. Nothing new is counted (`docs/analytics.md`).

## 2026-10-11

- In the documents list, `duplicate` and `delete` sit at the right edge of the row, away from the name, so a click on a document can no longer land on `delete` as it appears.

## 2026-10-10

- For search engines and AI assistants: one description everywhere, a canonical address, Open Graph tags, structured data, and `robots.txt`, `sitemap.xml`, `llms.txt`.
- Tables by hand: Tab moves to the next cell (⇧Tab back), Tab in the last cell adds a row, and the columns line up when you leave the table.
- `today` in the menu opens the document for today, or starts it with the date as a heading.
- Paste a web address over selected words and they become a link: `[words](address)`.

## 2026-10-09

- The counts now say where a visit came from (the referring site, campaign words in the address) and on what kind of browser (Chrome, Safari…, Mac, Windows, iOS…, desktop or phone), as coarse words, plus a per-tab session so a visit has a length. Still no name, cookie, screen size or text; the full list is in `docs/analytics.md`, and principle 15 in `PRINCIPLES.md` says why.
- ⌘⇧Enter on a task with nothing after the box left a line that could not be typed in or deleted and drew two line numbers in one place. Fixed; the caret lands after the box.
- Focus mode with no text yet: the cursor and the welcome lines sit together in the middle of the screen, instead of the cursor high and the words below.
- With markdown on, a click on the preview's empty space puts the caret in the text, as a click on the page does.
- Markdown on with no text yet: the preview side says what it is and shows the four marks that matter, instead of a blank half.
- `tidy` in the menu and on ⌘⌥T: text pasted from a PDF, an email or a web page gets its broken sentences joined, tabs and runs of spaces evened, stacks of blank lines reduced to one and `•` bullets made markdown; on the selection, or the whole text; the status line says what was done and ⌘Z undoes it all.
- Dragging a file over the page: the status line says what a drop will do (`drop to import as a new document`).
- Pictures, by address: `![caption](https://…)` shows the picture in the preview (and in a shared document), fetched from that address only when shown, without a referrer. `/image` writes the line. The picture is not stored in Nanotype; About says so.
- `keys` is back in the status line: `menu · keys · backup · about`.
- `size` now scales the page, not only the text: at `m` and `l` the column grows with the letters (the same number of characters a line) and the menu, status line and dialogs grow with it, so on a 4K screen `l` is readable everywhere. Past `l`, ⌘+ is the browser's zoom again, and ⌘- below `s`. The `text` and `room` groups are one group now, `appearance`: size, theme, font, cursor, sound, in the column, the menu and Keys.
- A document is named by its first line, always. `rename` and `F2` are gone (nobody used them); `# Heading`, `- item` and `[ ] task` marks are not part of the name, a frontmatter `title:` is used when there is one, and a long line is cut at a word. An exported file is now named the same way as in the zip and the folder copy: `First line.md` instead of `first_line.md`.
- Offline: the app opens from its cached copy at once, online or not, instead of waiting for the network first; a dead connection no longer leaves a blank page. A new version shows on the next open.

## 2026-10-08

- For a few days the counts also go to a second counter, beside PostHog, to compare the two; the same counts, one of them goes afterwards.
- Counts say how a command was reached (column, key, menu, slash list) and, once per visit, whether the browser is new and which settings it uses; still words only, never the text.
- Visits and commands are now counted with PostHog, the same way as before: a page view and one event per command under a random id, no cookie, never the text. About says so in one sentence; `docs/analytics.md` lists exactly what is sent. Nothing is counted on localhost.
- Status line: the hint or message is grey, like other notes, and stands a little apart from `menu · backup · about`, so it no longer reads as one of them.
- Status line: hovering the count brightens the count, hovering the words brightens the words; the other end stays as it was.
- Moving a line with ⌥↑ ⌥↓ keeps it on screen; the page follows it past the edge.
- A wrong address shows a Nanotype page with the way back, instead of the host's error text.
- The serif is Literata (was Lora): drawn for long reading on screens, crisper at the small size, cleaner Cyrillic.
- A shared document is simply rendered until imported (no markdown switch); it opens in the system theme with the writer's font and size, and contents off; all three can be changed for that view.
- In a shared view the word is `import to edit`, so it is clear what it is for.
- The dialog for a locked link now says what it is: the text travels scrambled inside the link and the seed word unscrambles it in your browser, nothing sent, no account; the button is `unlock`. Chrome had been reading the old wording as a sign-in page.

## 2026-10-07

- A shared document opens rendered (`markdown on`, the text alone, no split) with the writer's font, size and theme; the shared view has `contents` too, and no `menu` word; the shared view shows only what a reader needs (import, font, size, theme, menu, about), and everything returns on import.
- With lines selected, ⌘⇧Enter makes all of them tasks (or all plain again) and ⌘Enter ticks every task among them (or clears all when all are ticked).
- A new document made in focus mode takes typing at once (the empty page keeps one line of height, and the caret is placed).
- Editing keys: ⌥↑ ⌥↓ move the line; ⌘⌥1–6 make it a heading, ⌘⌥0 plain again; ⌘] ⌘[ indent and outdent beside Tab; ⌘-click an address in the text to open it. All in Keys under a new Editing group.
- ⌘⇧Enter makes the current line a task (and back); tasks can be ticked: ⌘Enter on a `- [ ]` line in the text, or a click on the box in the markdown preview; both write `[x]` into the text (and back).
- The documents list (and the trash) opens in the middle of the page like the menu, at the menu's width, instead of beside the column.
- The slash list opens above the caret when there is no room below, and never runs off the screen.
- Saved documents no longer carry the focus-mode line mark in their stored HTML.
- Markdown preview: a frontmatter block at the top (`---` … `---`) shows as its keys and values, muted, instead of a rule and loose text.
- Documents list: `duplicate` (⌘D on a row) makes a copy named `<title> copy` and opens it.
- Slash commands: type `/` at the start of a line (or after a space) for a list of things to insert: the date, the time, a table, a code block (`/code js`), a task, a link, a heading of this line, a frontmatter block. Letters filter, Enter inserts, Esc or a space leaves the slash as typed.
- Keys: headings in the menu are lowercase, bold and grey; Keys keeps its table headers. The Keys sheet lists `copy` on code blocks, `go to heading…`, and that .txt export is in the menu.
- Contents: the list in the margin also shows beside the markdown split on a window 1760 px or wider; where the list is in the margin, the menu adds `go to heading…`, the headings as a filterable list to jump from.
- Markdown preview: the word `copy` in the corner of every code block puts the code on the clipboard.
- The menu (⌘K) is in groups with headings (documents, switches, text, room, help, open), the key of each row alone at the right edge, notes muted beside the label; a setting's current value is marked with `*`. The menu opens taller.
- `menu` is in the status line on every device, where `keys` was; `keys` is a row in the menu. The command column keeps what is used often or shows a state: `docs`, `new`, `share`, the four switches, `font`, `size`, `cursor`, `theme`, `sound`. `import`, `export`, `print`, `contents` and `spellcheck` are in the menu and on their keys.
- On a window narrower than 1060 px the command column is not shown at all; the text stays centred and `menu` in the status line reaches everything.
- The page follows the system's "reduce motion" (nothing blinks or fades) and "increase contrast" (the faint interface rests readable) settings; the text, the status messages, the dialogs and the lists are named for screen readers. No change for anyone else.
- After the menu or a dialog closes, the cursor is back where it was instead of at the start of the text.
- Theme `system`: light or dark by the operating system, following it when it changes. First in the cycle (system, light, dark, green, sand, night) and the start for a new browser; a browser that already chose a theme keeps it.
- The menu (⌘K) and the documents list find a document by a word in its text, not only by its title; those rows say `in the text`.
- "export everything" comes in two: as .md (every document as a file, in one .zip, with the .json beside them) or as .json. In the menu and in the backup dialog.
- Trash: deleting a document moves it to the trash instead of asking first; it stays 30 days. `trash…` is the last row of the documents list and of the menu while there is something in it; Enter restores, ⌘⌫ deletes for good (that one asks), `empty trash` at the end.
- On a half-screen window (about 800–1060 px) the command column no longer sits over the text's right edge and takes its clicks; the text ends before the column.
- New document is ⌘⇧D (⌘⌥N still works where the browser allows it; Chrome does not).
- `PRINCIPLES.md`: the fourteen principles the app is built around, settled on 2026-10-07.
- Analytics: the visitor id is sent the moment the tracker loads, so short visits get it too.
- The contents list scrolls without a visible bar, like the column.
- The command column scrolls on a short window instead of running under the status line, and the text never scrolls under the status line either: the bottom strip is its own.
- About: "After the first visit it works offline. It installs as an app."; the counting line back to one sentence.
- Spellcheck on/off (⌘⇧;), before fullscreen. The editor no longer pins English as its language, so Firefox checks text in the language it is written in.
- Status line: the word under the pointer is fully visible, the rest of the line half, like the command column.
- ⌘Z takes back a big paste again (and ⌘⇧Z brings it back); the fast paste path had slipped out of the browser's undo history.

## 2026-10-06

- Contents (⌘⇧L): the document's headings as a list in the left margin, indented by level; click one to go there. On narrow screens, phones and in the markdown split view the same command opens the list in the menu instead.
- After a forward from zen.unit.ms or zen.unit.app with nothing to bring, nanotype.app no longer shows the "Used Zen before?" hint.
- Analytics: a random id kept in the browser, so a returning visitor counts as one person instead of one per day. Nothing personal in it.
- Plain text, always: ⌘U and formatting commands from menus or extensions no longer get through; older documents with stray tags are cleaned when opened; text dragged in from another window lands as plain text where it was dropped; cut and copy put plain text on the clipboard with ordinary spaces; Safari's smart quotes and dashes are off in the editor.
- Keys: ⌘K makes a link of selected text (and still opens the menu otherwise); ⌘E inline code; ⌘D focus mode. Shortcuts no longer trigger the browser's own actions (⌘⇧A opened Chrome's tab search), and ⌘⌥N works on every keyboard layout.
- Menu rows: three dots only where a row asks for something more; `lines`, `focus`, `markdown` named like the column; `import a backup (.json)…`.
- Shift+Tab with just a caret takes one level of indentation off the line (it only worked on a selection).
- Sounds: arrow and navigation keys make a quieter key sound in the soft, click and blip sets (none on the typewriter); Shift, Caps Lock and ⌘ alone are silent; a shortcut makes no key sound; switching sets plays a key and a return of the new set; soft is louder.
- Hover `docs` to see how many documents there are. When a command refuses (share on an empty page), the reason appears beside the word, not only in the corner.
- The *t* of the wordmark redrawn; About says "Since 2016".
- Zen is now Nanotype, at nanotype.app. zen.unit.app and zen.unit.ms hand every document and setting over to the new address and forward; a banner says so once. The old copies stay where they were.
- The font is Nanotype Mono (was Zen Mono); pixel wordmark redrawn on a smaller grid.
- Fast: saving waits for a pause in typing and writes only what changed; pasting 8,000 words went from half a second to 10 ms, and 60,000 words paste in 42 ms.
- Never lose text: a full browser store keeps the last good copy and the status line says so; a save that wipes most of a document keeps the previous version, with "restore previous version" in the menu; the browser is asked to keep the site's storage.
- "export everything" to one .json and "import a backup" in the menu.
- New word in the status line, "backup": explains where the text lives and offers "keep a copy in a folder…" (Chrome, Edge, Brave on a computer: every document as .md plus one .json, kept up to date as you write) or "export everything". On Safari and Firefox it says what to do instead; on iPhone, the home-screen tip.
- Night theme, a deep blue-black.
- Focus mode: the interface no longer reappears when the page scrolls under a still pointer.
- About: "A private place to write", a row of links (support, suggest an improvement, buy me a coffee), the credits line.
- Dev server fixed to port 3002.

## 2026-10-05

- Share a document as a link: the text travels inside the link itself, nothing is stored anywhere. Public, or private with a seed word (encrypted in the browser). The link opens read-only with "import".
- Line numbers (lines on/off): in the margin, the current line highlighted while the cursor is in the text.
- Export as .md by default; .txt second.
- Code blocks in the markdown preview are filled and colour-highlighted, per theme.
- Key sounds: soft, click and blip, generated in the browser, beside the typewriter.
- Commands in four groups (documents, switches, text, room); focus, markdown, fullscreen and lines show on/off; "preview" renamed "markdown".
- "open" and "save" renamed "import" and "export".
- About rewritten: local app, nothing sent out, visits are counted only.

## 2026-10-04

- A plain look: one mono typeface for the interface, plain words instead of icons, black and white with the blue accent, sand and green themes kept.
- Multiple documents with rename and delete; import .txt/.md files (picker or drag and drop); export .txt/.md; print or save as PDF.
- Focus mode (dims other paragraphs, holds the caret line above the middle), markdown preview beside the text, fullscreen.
- Command menu (⌘K) that runs every command and switches documents.
- Fonts: mono (default), sans, serif; three text sizes (s, m, l); block or thin cursor, the block fades after ten seconds idle.
- Word and character count in the status line; selection count; reading time from 100 words.
- Works offline and installs as an app; usable on phones (menu in the status line).
- Google Analytics replaced with a cookie-free counter, served through the site's own domain.
- New icon: the blue block cursor.

## 2026-10-02

- Moved to Vercel; Docker and the old CI removed.

## 2019–2020

- Markdown, print mode, Product Hunt launch, assorted fixes.

## 2016–2017

- Zen started: a single page that keeps the text in the browser. Mobile support, Ctrl+S, plain-text copy.

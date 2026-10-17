# Nanotype design

How Nanotype (Zen until October 2026) looks and behaves, and why. Read this before changing the interface. The values quoted here live in the stylesheet (`src/scss/`, one file per part) and `src/js/components/ui.js`; if a value changes there, change it here too.

## The idea

The page is the text and almost nothing else. The interface is plain: words, hairlines, whitespace, one typeface. It happens to share that plainness with a terminal, which is not the aim, only a likeness.

The look is one mono face, a faint interface and short linear motion; what is borrowed is credited in `CREDITS.md`.

## Principles

1. **The text comes first.** The interface is nearly invisible until the pointer comes close, and it hides completely while typing.
2. **One typeface for the interface.** Everything that is not the user's text is set in Nanotype Mono.
3. **Words, not icons.** Commands are plain lowercase words. A setting shows its current value next to its name.
4. **No decoration.** No cards, shadows, gradients, blur, rounded corners or pills. Structure comes from whitespace and one-pixel hairlines.
5. **Black and white, one accent.** Colour carries meaning (a link, the cursor, a selection), never ornament. The one exception is a code block in the preview, where colour is the convention readers expect; its palette is scoped to the block.
6. **Everything is reachable from the keyboard.** Every command has a key, and one menu lists them all.
7. **Motion is mechanical.** Fast and linear. No easing, bounce or scaling.
8. **Say less.** Short factual statements. One exception: the welcome line, which makes a promise to the reader.
9. **Never surprise the writer.** The text is never modified for the interface's convenience, and nothing leaves the browser.
10. **Plain text, always.** Pasting takes only the text; every formatting command the browser could apply (⌘U, a menu, an extension) is refused at `beforeinput`; a stored document with any tag but a line in it is rebuilt from its text when loaded.

## Typography

| Use | Typeface | Notes |
|---|---|---|
| Interface (commands, status line, menus, dialogs, welcome) | Nanotype Mono | Always. Never follows the text font. |
| Text, default | Nanotype Mono | Line height 1.25, tight. |
| Text, option | Inter ("sans") | Line height 1.5. |
| Text, option | Literata ("serif") | Line height 1.5. Variable with an optical-size axis, so 15, 18 and 22 px are each drawn for their size. Replaced Lora on 2026-10-08: same kind of face, crisper at s, cleaner Cyrillic. |

**Nanotype Mono** is a build of [Iosevka](https://github.com/be5invis/Iosevka) with Cyrillic and the keyboard symbols (⌘ ⇧ ⌥ ⌫) added. Regular, bold, italic, bold italic. The recipe is `fonts/nanotype-mono.build-plans.toml`. All fonts are self-hosted; licences are in `public/fonts/LICENSE.txt`.

Sizes:

| Element | Size |
|---|---|
| Text | `s` 15 px (default), `m` 18 px, `l` 22 px |
| Commands, status line | 12 px |
| Menus, dialogs | 13 px, line height 1.5 |
| Welcome block | 14 px, line height 1.5 |

Text sizes are named `s`, `m`, `l` in the interface, never in pixels.

## Colour

Every component reads these tokens. A theme only sets them.

| Token | Meaning | light | sand | dark | night | green |
|---|---|---|---|---|---|---|
| `--bg` | page | `#ffffff` | `#f8f3e8` | `#000000` | `#0f1a24` | `#050805` |
| `--fg` | text | `#000000` | `#2b2820` | `#ededed` | `#e9eef2` | `#3cf26e` |
| `--muted` | secondary text | `#767676` | `#8f8672` | `#8a8a8a` | `#7f93a3` | `#1e8a40` |
| `--line` | structural hairlines | fg at 28% | fg at 28% | fg at 32% | fg at 30% | fg at 35% |
| `--fill` | faint fill (inline code) | fg at 7% | fg at 8% | fg at 10% | fg at 9% | fg at 12% |
| `--veil` | behind dialogs | bg at 72% | bg at 72% | bg at 72% | bg at 72% | bg at 72% |
| `--band` | behind the current line's number | fg at 13% | fg at 13% | fg at 20% | fg at 18% | fg at 22% |
| `--accent` | links, cursor, active mode | `#00a3e0` | `#00a3e0` | `#00a3e0` | `#00a3e0` | `#3cf26e` |
| `--select` | text selection | accent at 25% | accent at 25% | accent at 38% | accent at 38% | accent at 30% |

Night (2026-10-06) is a deep blue-black with blue-grey muted text, after the look of a dark app at night; it uses the dark code palette.

Light and dark are pure white and pure black on purpose (principle 5). Tried on 2026-10-14 and kept as possible replacements, not adopted: `#f7f7f7` for light and `#050805` (green's black) for dark, softer on a bright screen. If either is taken, the same value goes into `--veil`, the `html` fallback in `_tokens.scss`, the `theme-color` meta in `index.html` and `site.webmanifest`; the favicon and print stay white.

`theme` cycles `system → light → dark → green → sand → night`. `system` (2026-10-07) is light or dark by the operating system's setting and follows it while chosen; it is stored as `scheme-system` and the page carries the class of the scheme actually shown. A browser with nothing stored starts on `system` (the inline script in `index.html` resolves it for the first paint); every browser that has visited before has its choice stored and keeps it.

Rules:
- The accent is one blue, `#00A3E0`. The green theme uses its own green instead.
- Use `--line` for structure (table rows, frames, dividers). Use `--fg` for a rule that carries weight (a table header's underline, a quote's edge, a dialog's frame).
- A highlight inside a menu is reverse video or grey, never the accent. The command column does not use the accent at all.
- Class names for themes are historical (`scheme-solarized` is sand, `scheme-dark-and-white` is dark). Do not rename them: saved settings refer to them.

## Layout

- The text sits in one centred column, at most 760 px wide at size `s`. Body padding is 48 px top and bottom, 80 px at the sides.
- **`size` scales the page, not only the text** (2026-10-09, after a 4K user found the menu tiny and the column narrow). `s`, `m`, `l` are 15, 18, 22 px of text, and with them the column (760, 912, 1115 px: the same ~84 characters a line), the interface words (12, 14.4, 17.6 px), the picker and the dialogs, and every breakpoint below (the command column goes under 1060, 1272, 1555 px; the contents panel from 1280, 1536, 1877 px). One variable, `--scale` on the body, and a class `size-s/m/l` for the media queries, which cannot read a variable; `$scales` in `_variables.scss` generates them. Why one setting and not a second one for the interface: the measure should stay in characters whatever the size, and the words should not shrink next to bigger text; browser zoom (remembered per site) is the second knob, for anyone who needs more than `l`. So ⌘+ at `l` and ⌘- at `s` are left to the browser, whose zoom carries on from there. Since `size` then sets the room as much as the text, the old `text` (`font · size · cursor`) and `room` (`theme · sound`) groups became one, `appearance` (`size · theme · font · cursor · sound`: the page first, then the text, then sound), the word every system uses; `room` alone no longer fit `font` and `cursor`, and a group of two was barely a group.
- The page's scroll area ends 44 px above the bottom edge, where the status line lives, so text never passes under the status words and a click near the bottom always reaches the text (a 2019 user report: the old statistics block took clicks meant for the text). Below the last line there are 200 px of space that scroll with the text, on the text column, since padding on the scrolling element itself is not scrollable.
- Commands: a column of words at the top right, right-aligned, scrolling inside itself (no visible scrollbar) when the window is too short for it, ending above the status line. Its box never takes a click (only the words do). Under 1060 px (at size `s`; the limit scales with the size) there is no margin for it, so it is not shown and the status line's `menu` reaches everything, as on a phone. A word is in the column only if it is used often or shows a state the page does not show by itself (2026-10-07): documents (`docs`, `new`, `share`), switches (`lines`, `focus`, `markdown`, `fullscreen`, each `on` or `off`), appearance (`size`, `theme`, `font`, `cursor`, `sound`). `import`, `export`, `print` (on the keys everyone knows), `contents` (its list is on screen when on) and `spellcheck` (set once; the underlines show it) are in the menu only. Every row in a group has the same shape. The groups are elements (`.group`) and the gap is between groups, so it holds whatever words a view hides (the shared view hides most of the first two). The menu and the Keys dialog follow the same order.
- Status line: one line at the bottom. Left: the document's name (only when the user gave it one) and the counts. Right: a hint or message, then `menu`, `keys`, `backup` and `about` (`keys` left the line for the menu on 2026-10-07 and came back on 2026-10-09: the sheet is looked up often enough to be one click away). `menu` is the same word on every device; `keys` is also a row inside the menu, so a search finds it. Keys stays its own sheet (decided 2026-10-07): a table you read beside a list you run; the two are kept in step by hand, so a new command goes in both.
- Markdown preview: two equal columns with a 48 px gap, up to 1400 px wide at size `s` (scaled with the size). Under 900 px the preview takes the whole width.
- Phones and touch devices: see "Touch" below.

## Interface visibility

| State | Opacity |
|---|---|
| Idle | 0.16 |
| Pointer near (over the column or the status line) | 0.55 |
| Pointer on the item | 1 |
| While typing | hidden; returns when the pointer moves |

A switch that is on says `on` in bold, in the same colour as everything else; the accent is not used in the column. Hints and messages in the status line are meant to be read, so they show at 0.55 without hovering.

## Components

Where each lives (2026-10-09): the column, status line, look, markdown mode, dialogs, the command menu and the keyboard table in `ui.js`; the picker's mechanics in `picker.js`; documents, trash and new document in `docs.js`; the block caret, focus mode and line numbers in `caret.js`; tasks, headings, line moves, indent and the slash commands in `lines.js`; paste, drop and copy in `paste.js`; share and the shared view in `sharing.js`; backup, import and export in `files.js`; contents in `contents.js`; the counter in `counter.js`; key sounds in `key-sounds.js`. `app.js` holds what they share.

### Commands
Lowercase words. A command that sets something shows the value in bold after its name: `focus off`, `markdown off`, `fullscreen off`, `font mono`, `size s`, `cursor block`, `theme light`, `lines off`, `sound off`. Clicking cycles the value.

### Sounds
`sound` cycles `off → soft → click → blip → typewriter` and plays one key of the chosen set. Typewriter is the recorded set in `public/sfx`. The other three are synthesised with the Web Audio API in `src/js/components/sounds.js`: `soft` is low-passed noise (a laptop thock), `click` high-passed noise with a faint ping (a distant mechanical switch), `blip` a triangle-wave note per key on a pentatonic scale with a two-note fall on Enter. Every press is jittered a few percent in pitch so typing never loops. Arrows, Home, End and Page keys make a quieter key sound in the synthesised sets (a plain tick in `blip`) and nothing on the typewriter, which had no such keys; modifiers pressed alone are silent everywhere; Delete sounds like Backspace. Volumes sit under the typing, never on top. The audio context is created on the first key, since browsers allow sound only after the user has interacted. Saved as `sound`; the old `muted` key is migrated.

### A document is named by its first line
A document has no name of its own (since 2026-10-09; before, `rename` and `F2` set one, and nobody used them). Its name is its first line with text, as in most notes apps: the name lives in the text, so it survives export, the zip, the folder copy, a share link and a paste into another app, where a separate name would be lost. The one rule is `util.firstLine`: a frontmatter block at the top is skipped (its `title:` is the name, if there is one), heading marks, list markers and task boxes are dropped (`# Shopping` is "Shopping"), and the name is cut at a word to 50 characters, which fits the list beside its date. The list, the status line, exported file names, the folder copy and the zip all use it; file names are the name with the characters a file system refuses removed, numbered when two documents share one (`Notes (2).md`). An empty document is "Untitled". An imported file is named by its text, not by the file's name; if that ever bothers someone, the answer is a checkbox that puts the file name into the text as a heading.

### Tables by hand
Inside a markdown table (a run of lines starting with `|`) Tab moves to the next cell, ⇧Tab to the previous, and Tab in the last cell adds a row with the same number of cells; when the caret leaves the table its columns are lined up, every cell padded to its column's width and the separator row dashed to match (`| name   | price |`) (2026-10-10). Lining up is one edit through `insertText`, so ⌘Z takes it back, and it never changes a cell's text; a skeleton with nothing typed in it (`/table`) is left alone. Only while the text has the focus: with the focus in the menu's filter line an edit would land there, so a table left by clicking out waits for the caret to pass through it again. `src/js/components/tables.js`; the caret hook is read-only (it runs on every selection change and must not wrap lines or touch selections: it did once, and collapsed `/link`'s selection).

### today
`today` in the menu opens the document whose first line is today's date, or starts one with `# 2026-10-10` (ISO, so the documents sort and read the same everywhere; a document named in the local form, `10/10/2026`, counts too). A daily note is a habit many writers have; with first-line names it is one lookup. No key; the status line says `today: 2026-10-10` or `today: 2026-10-10, started`.

### Tidy
`tidy` in the menu (group `document`) and on ⌘⌥T (⌘K with a selection makes a link, so the key is how a selection is tidied; ⌘⇧T is the browser's) fixes what paste cannot know: which line breaks were meant. Text copied from a PDF, an email or a web page comes hard-wrapped mid-sentence, with tabs, runs of spaces and stacks of blank lines. Five rules, fixed, nothing guessed (`src/js/components/tidy.js`, unit-tested): a line that does not end a sentence followed by a line starting with a lowercase letter (after any indent) is one line, a list item or a quote taking its continuation as markdown reads it, a heading or a table never; tabs and runs of spaces become one space, and an indent goes (in markdown four spaces or a tab make a code block) unless it is in front of a list item, where it nests the list; spaces at line ends go and two or more blank lines become one; `•` `·` `◦` `▪` `–` `—` at a line start become `- `; code fences and tables are untouched. Never touched: quotes, punctuation, a line that ends with punctuation (poetry, addresses, lists), a heading, a list item. It works on the selection when there is one, else on the whole text, so the cases a rule cannot see (lyrics, code outside a fence) are the person's to choose. One undo step: the selection through the browser's own edit, the whole text with the big paste's step (`paste.replaceAll`). The status line says what was done (`tidied: 3 lines joined, 1 blank line removed, tabs gone · ⌘Z undoes`) or `nothing to tidy`. Not a setting, not automatic: paste stays exactly what was copied (2026-10-09).

### For search engines and AI assistants
The page itself is the only page (2026-10-10). Its head carries the title (`Nanotype - Online Text Editor`), one description, a canonical link to nanotype.app (zen.unit.app serves the same page and hands documents over by script; the canonical keeps it from counting as a copy), Open Graph and Twitter tags and a `WebApplication` JSON-LD (free, any system, publisher Unit, alternateName Zen). The dialogs, the command column, the picker and the Zen notice are marked `data-nosnippet`, so a search result quotes About or the welcome, never `theme light`. `robots.txt`, `sitemap.xml`, `llms.txt` and `llms-full.txt` are built from `src/facts.mjs` by `src/seo.mjs` and never written by hand; the service worker does not cache them. Every fact is in `facts.js` and `test/seo.test.mjs` fails when the page says otherwise. No separate about, privacy or keys pages: About says it, and the llms files say it for machines. No image for the Open Graph card, since there is none to show honestly.

### Dropping a file
A `.txt` or `.md` dropped anywhere on the page becomes a new document, several at once each their own; a `.json` restores a backup. While the file is over the page a dashed hairline runs inside the edge and the status line says what a drop will do (`drop to import as a new document (.txt, .md; .json restores a backup)`, 2026-10-09), since the line alone said only that something could be dropped. Dragged text lands at the caret as plain text; a file never does: one rule, and the hint removes the surprise. Nothing happens in the shared view.

### Naming: import and export, not open and save
Nanotype saves as you type, and it never writes to a file on disk. So `import` copies a file in as a new document, and `export` downloads the current document. "Open" and "save" would promise a link to the file that does not exist. The keys stay ⌘O and ⌘S, because that is where fingers go. ⌘S exports as `.md`, the default; `.txt` has no key of its own and lives in the export list and the menu. ⌘⇧S is `share`.

### Share
`share` (⌘⇧S) opens a dialog that explains before it asks: the text goes inside the link, nothing is stored anywhere, and the link is a snapshot, not a shared document. Two choices follow, `public link` and `private link`, as rows in the picker's style. The link format and the cryptography are in `src/js/components/share.js`, with its unit tests.

The last step always shows the link in a field with its own `copy link` row, so the writer sees what they got and can copy it again. A public link is already on the clipboard when that step appears ("Link copied"). A private link is never copied on its own: the step shows the link and the seed word side by side, each with its own copy row, and says "Copy both. Send the link one way and the seed word another. Zen keeps neither." A row says `copied` for a moment after it is used. Two explicit copies cost one more click than copying for the writer would, and nothing can be lost by copying the second thing over the first.

Messages in the status line: `nothing to share`; `link shared` after a phone's share sheet. The link's length sits under its field as a muted line (`2.1k characters`); past 30,000 it adds `· some messengers cut links this long`. When the text would make such a link, the first step says so before the choice (2026-10-16): `This text makes a link of about 34.2k characters; some messengers cut links this long. It still opens in a browser.`; for everyone else the line is not there.

Every message about sharing says plainly who can read what. Never "secure" or "encrypted" as a selling word; "locked with a seed word" is the phrase.

### Shared document
A share link opens the text read-only: no caret, no welcome block, the reader's own documents and settings untouched (the editor is locked, nothing is saved or loaded). The status line says `shared document` on the left, then the counts. The command column keeps only `import to edit` (the word says why: a copy among the reader's own documents, to change), `contents` (off to start), `font` and `size` (the writer's, from the link) and `theme` (always `system` to start, whatever the writer had: a reader gets their own light or dark); each can be changed for that view. The status line has only `about` (`menu` is for a person's own documents; ⌘K still opens it); the menu matches (import to edit, export, print, contents, font, size, theme, keys, about). A shared document is rendered until it is imported: the rendered text alone in the text column, no raw side and no `markdown` switch, since a reader has nothing to edit (settled 2026-10-08). `contents` works beside the rendered text from 1280 px (it is one column there), a click scrolling the rendered heading; narrower, the picker. Task boxes in the rendered shared view are drawn but inert (the text is read-only); `copy` and links work. `import` (⌘O) copies the text in as a new document, removes the fragment from the address and gives the reader their own modes back.

A private link first shows the unlock dialog, "This link is locked": a sentence saying the text travels scrambled inside the link and the seed word unscrambles it here with nothing sent, a field labelled `seed word`, `unlock`, and `wrong seed word` under the field when it is. Esc leaves an empty page with `locked link · the seed word unlocks the text`; the menu's first item brings the dialog back. Worded this way on 2026-10-08 after Chrome's on-device phishing model read the earlier "This document is private. Enter the seed word" plus a field and `open`, on a new domain, as a sign-in page and showed its red interstitial for private links (public links were fine; Google's list had the site clean). Never phrase this dialog like a login: no "enter", no "password", say what happens to the word. A damaged link says `this link is incomplete`; a link from a newer format says `this link needs a newer Zen`. Neither ever blanks the page.

Reverse video rows inside a dialog (`.choices`) follow the picker: arrows, Enter, the pointer; on touch devices the row reverses while pressed and there is no standing selection.

### Saying no beside the word
When a command refuses (`share` on an empty page: `nothing to share`), the reason appears for 0.7 s to the left of the word that was used, muted, and for 2.5 s in the status line, because the status line is easy to miss. The same slot shows the document count before `docs` on hover. `sayBeside(button, text)` in `ui.js`.

### Status line
- The count reads `39 words · 177 chars`, with `· 2 min read` from 100 words. Clicking it shortens it to `39 words`.
- Selecting text shows the selection's count in the accent colour.
- Words are runs of characters containing a letter or digit, so markdown markers are not counted.
- The line is two clusters, the count and name at the left end, the words at the right; hovering a word brightens its own cluster, not the other (2026-10-08; the column, one cluster, brightens whole).
- Hovering any command shows its description and key on the right: `focus mode  ⌘⇧D`. The message is muted like every other note (a word you act on is in the text colour, a note about it is muted) and stands 20 px from `menu`, the page's edge inset, so the three words sit in the same frame on both sides (2026-10-08).
- After a command the right side shows a message for 1.6 s: `exported notes.md`, `theme dark`.

### Menu rows
The groups, each named for its subject (2026-10-15; before, `switches` and `editing`): `documents` (all of them: the list, new, today, imports, export everything, the backup folder, the trash), `document` (this one: share, export, print, tidy, restore, go to heading), `editor` (how the page is shown while you write: lines, focus, contents, markdown, spellcheck, fullscreen), `appearance` (how the app is: size, theme, font, cursor, sound, ripples), `help` (keys, about). The Keys dialog has the same headings.

Lowercase, same words as the command column. A row ends in `…` when it asks for something more (a file, a document, a choice, a seed word, the print dialog) and has no dots when it just does the thing or opens a plain pane (`keys`, `about`, switches, settings). A row that takes a file names the formats in brackets: `import a file (.txt, .md)…`, `export everything as .json`.

A row has three parts in two columns: the label; a note after it, muted, only where the label alone would not tell a first-time visitor what the row does (`lines on  line numbers`) or where it carries a fact (`in the text`, a count, a date); and the key alone at the right edge, so the keys line up down the page like the Keys dialog. Nothing but a key ever goes on the right. The menu's rows are in groups, each under a heading (bold, muted, lowercase, no rule: it is not a row and does nothing). The Keys table's headers are table headers as in the markdown preview (bold, text colour, text-colour rule) with a capital, since its rows are sentences: lowercase means a word that does something, a capital means text to read, in the order of the column: `documents`, `document`, `editor`, `appearance`, `help`, then `open`, the documents by recency. A setting with values lists each value; the current one is marked `*` and is the only one carrying the key, since the key cycles. A switch is one row that names the state it will set (`lines on` when lines are off; `cursor thin` when the cursor is a block): the menu lists things to do, while the column's word is a readout (`lines on` there means they are on).

### Slash commands
Typing `/` at the start of a line or after a space opens the picker under the slash (above it when the bottom of the window is closer, the list shortened to the room either way) with things to insert (2026-10-07): `/date`, `/time`, `/table`, `/code` (`/code js` names the language), `/task`, `/link`, `/image`, `/h1`–`/h3`, `/fm`. The text keeps the focus: the letters typed filter the list, ↑↓ move, Enter or Tab inserts, Esc closes; a space closes it too unless it follows a full name (`/code js`), and a word no row matches (`/usr`) closes it, so a path or a fraction never has a box over it. `and/or` and `seo/` never open it. Inserting deletes the typed slash word and inserts through `execCommand('insertText')`, so the browser's undo knows both steps; the caret lands where typing continues (the first cell, inside the fence, on `text` of a link, on `address` of an image, after `title:`). `/table` and `/fm` on a line with text go below it. Rule: `/` inserts into the text, ⌘K runs commands.

### Picker
One component for the command menu, the documents list, the trash and the contents.
- A box with a one-pixel frame in the text colour, square corners, no shadow.
- An optional `>` filter line, a list, an optional footer with key hints. The filter matches every typed word against a row's label and hint; rows whose name begins with the first word come first (`/im` is `/image` before `/time`, `theme` the themes before rows that mention one; 2026-10-09); in the menu and the documents list it also matches the documents' text, and those rows come after, with the hint `in the text`. The text is read from storage when the list opens (21 ms for a full 4.75 MB store, measured 2026-10-07) and each keystroke is a plain `includes` (2–5 ms at that size).
- The selected row is in reverse video. The open document, and the current value of a setting, are marked with `*`. A row's actions (`duplicate`, `delete` in the documents list) show on the selected row only, at its right edge (2026-10-11): they appear as the pointer reaches a row, so they must sit away from the name, which is what a click on a row is for.
- The menu is the long list, so it opens higher (10vh) and taller (up to 74vh) than the others, enough for two groups at a time.
- In the middle of the page (18% from the top, 560 px wide) for the menu, documents, the trash and contents; under the caret (420 px at size `s`, scaled with the size, since 2026-10-09; 340 px cut the longer hints) for the slash commands. A third position exists as an option, not in use since 2026-10-07: **anchored beside the word that opened it**, a 340 px box whose top aligns with the word and whose right edge sits 16 px left of the column, the word marked `active` while open. It served the documents list and the export formats until those moved to the centre (one list was left, narrower than the menu, its foot wrapping). It suits a short list that belongs to one word and should not cover the text: a few formats, a few values. It was ~12 lines in `openPicker` (an `anchor` option: `top = rect.top − 9`, `right = innerWidth − rect.left + 16`) plus `.picker.anchored { left: auto; transform: none; width: 340px }`; commit `aa80291` shows the removal.
- Arrows move, Enter runs, Esc closes. In documents: F2 renames, ⌘D duplicates (a copy named `<title> copy`, opened), ⌘⌫ moves to the trash. The trash is the same list (`trash…`, last row of the documents list and of the menu, only while it holds something): Enter restores, ⌘⌫ deletes for good after one confirm, `empty trash` at the end.

### Dialogs (About, Keys, Share, Seed word)
A centred box with a one-pixel frame, up to 36rem wide, over a veil of the page colour. No blur. A field in a dialog is one line with a hairline under it and nothing else.

The veil is what tells a dialog from the picker (settled 2026-10-07): a dialog is something to read or answer and takes the page until dismissed, so the page dims behind it; the picker is a list you act from, open for a second between ⌘K and Enter, sometimes under the caret in the text, so the page stays bright and nothing looks changed. Same rule as the case of the words: things you read get the veil and a capital, things you do get neither.

### Welcome block
Shown while the document has no text and at most one line: the pixel wordmark, a block-character divider, and three lines.

```
Type your text. When you return it will still be here.
It never leaves this browser.
⌘K lists every command.
```

The first line is the author's and stays as written. It is a promise, not a description.

### Ripples
Behind the empty page (2026-10-14, reworked 2026-10-15): a clean screen over which slow waves of grey characters drift (12 px, the text colour up to 12%) as two or three soft shapes with rounded, lobed edges, the characters inside them changing now and then. Under it is water: a click drops a stone; where the wave passes, a run of characters lights along the row in the accent and fades to the right like a tail, the characters inside it changing fast. Nothing is blue until someone clicks. `ripples off`, in the menu's appearance group after `sound` (hint: the animation on an empty page), turns them off, remembered. It is the only ornament in the app, and it exists only before writing starts: it rises over two seconds when the page empties, the first keystroke fades it in 0.3 s, and it never shows over text, over a shared document, or in print. The ripples keep clear of the words: within 56 px of the welcome's lines, the column's groups and the status line it eases to nothing, grey and blue alike, so every word reads and nothing has an edge. `ripples.js`, two canvases (the grey, and the light over it) and no dependency: the grey is four slow sine sheets at different angles and speeds (the short fourth gives the edges rounded lobes), in eight levels, stepped ten times a second and drawn into a layer only at the cells whose level changed; the water is the two-buffer ripple on a square grid (damped harder near the edges, so a wave runs off the screen instead of bouncing; waves pass through each other by adding up), stepped every other frame and only while a wave is in it, and read through a seven-cell neighbourhood with the light lingering a few frames and tailing to the right, so a ring is one soft band; under reduced motion the grey drifts and nothing else moves.

### Wordmark
"nanotype" on a pixel grid (3-cell letters, 4-row x-height, one row above and below), drawn in the text colour. Regenerated by `scripts/wordmark.py`. Used in the welcome block and in About.

### Cursor
- **Block** (default with the mono font): a solid block in the accent colour, one character wide, drawn behind the letter so the letter stays readable. It blinks once a second.
- **Thin** (default with sans and serif): the browser's own caret, in the accent colour like the block (`caret-color`, 2026-10-16); its width is the browser's and cannot be set.
- A choice made by hand is remembered per font.
- The cursor fades out after 10 s without a key, click or caret move, and returns on the next one. Scrolling and moving the pointer do not bring it back.
- The block must sit exactly where the next typed character will appear. This is tested by typing a character and comparing positions.

### Focus mode
Other paragraphs are dimmed to 0.28. The line with the caret is held 38% down the screen, a little above the middle. An empty document must not scroll. With no text yet (2026-10-09) the caret line, the wordmark, the rule and the welcome lines are centred as one group (209 px at size `s`, scaled; the welcome sits 3.75em below the top of the text in both modes, it was 2.5em in focus mode for no recorded reason), since the caret at 38% with the welcome hanging below read as "cursor at the top, placeholder in the middle"; the caret lands near 38% anyway, so the first character moves it a few pixels at most.

### Line numbers
Off by default. When on, each paragraph has a muted number in a gutter to the left of the text column. The column keeps its width and position; the numbers hang in the page margin. They are set in the mono font whatever the text font is. The line with the caret has its number in the text colour on a `--band` background, only while the cursor is in the text: after Esc or a click on a command the highlight goes with the cursor. A paragraph that wraps has one number, on its first row, as in a code editor. When everything is deleted and the browser leaves no paragraph behind, the empty text still shows a highlighted `1`. The numbers are CSS counters: they are never selected, copied, counted or exported, and they do not print. On a phone there is no margin to hang the gutter in, so it takes room from the text.

### Contents
`contents` (⌘⇧L) lists the document's headings (lines starting with `#` to `######`), one step of indent per level, in the interface font at the usual faint-until-hovered opacity, in the left margin aligned with the top of the text and clear of the line-number gutter. Click one: that line scrolls to the top and the caret goes to it. The list rebuilds 200 ms after a change and hides with the rest of the interface while typing. The panel exists only where there is a margin: at least 1280 px wide with a pointer beside the text, at least 1760 px beside the markdown split (1400 px wide; the panel's width is then measured from that); both times the size's scale. Everywhere else the same command opens the picker with the headings as rows (`contents…` on phones), filterable from nine headings up. "no headings" when there are none. Remembered like the other switches. Where the panel exists the menu also offers `go to heading…` (2026-10-07), the same picker as a jump: type part of a heading, Enter. The panel is a view, the picker is a jump; the one key, ⌘⇧L, gives the panel where there is room and the picker where there is not.

### Spellcheck
`spellcheck` (⌘⇧;, the Mac's own spelling key) switches the browser's spelling check on the editor; on by default, remembered. It is the browser's checker entirely: its dictionaries, its right-click suggestions, its language detection. The editor carries `lang=""` so that Firefox, which picks a dictionary from the page language, does not check Russian text against English. Anything better than the browser's checker means sending the text to a server, which Nanotype does not do.

### Markdown preview
The command is `markdown` (the word `preview` alone did not say what of). On:
- Headings: 1.875em, 1.25em, 1.0625em, then 1em; bold; no rules under them.
- Inline code: `--fill` background, no rounding.
- Code blocks: the `--fill` background, no frame, no rounding, one step smaller than the text.
- Editing keys as people already know them (2026-10-07), all through the browser's own edit so ⌘Z knows and the caret keeps its place in the words: ⌥↑ / ⌥↓ swap the caret's line with its neighbour (one edit: the two lines re-inserted in the other order), the page scrolling just enough to keep the moved line on screen; ⌘⌥1–6 make the line a heading of that level and ⌘⌥0 plain text again (`/h1`–`/h3` use the same); ⌘] / ⌘[ indent and outdent the line or the selected lines by four spaces, beside Tab / ⇧Tab (Tab with a caret still inserts at the caret, as in a text editor; ⌘] always indents the line); ⌘-click on an `http(s)://` address in the text opens it in a new tab (the preview's links are clickable; in the text they are characters, so the key says "follow"). The line edits share `caretBlock` and `editLineStart` in `lines.js`.
- ⌘⇧Enter makes the caret's line a task (`- [ ] ` in front, after any indent; a list item becomes a task; a task becomes a plain line again), the caret keeping its place in the words. With lines selected it does the same to all of them as one edit: if every line with text is a task they all become plain, otherwise every line with text becomes a task (blank lines are left alone); the lines stay selected, so the key can be pressed again. A task line (`- [ ] …`, also `* `, `+ ` and `1. `) is ticked in the text with ⌘Enter on its line (with lines selected, every task among them: all ticked, or all cleared when every one is already ticked, as one edit, the lines staying selected) (the one character between the brackets is replaced through the browser, so ⌘Z undoes it and the caret stays) and in the preview by clicking its box, where the n-th box is the n-th task line of the text and the text node is changed directly with an `input` event reported, since the text is not focused there (2026-10-07). Nothing else happens to a done task: no strike-through, no sorting, no count.
- A frontmatter block at the very top of the text (`---`, lines, `---`) is shown in the preview as its keys and values, muted, in mono, under a hairline (2026-10-07), instead of a rule and stray text. The raw text is untouched; `test/markdown.test.mjs` covers it.
- A code block in the preview carries the word `copy` in its top-right corner (2026-10-07): faint like the column, up on hover, `copied` for a moment after a click, the code on the clipboard as plain text. It is drawn on the block's own fill so a long line never runs under it, and it does not print.
- Code blocks are the one place with a palette. Seven `--code-*` tokens per theme (keyword, string, number, function, type, attribute, comment), set beside the other tokens and read only inside `pre code`. Light and dark use GitHub's palette; sand a warmer version; green stays shades of its one green, white for names. Nothing else on the page reads these tokens, so the rest stays monochrome.
- Tables: `--line` between rows, `--fg` under the header, no outer frame.
- Block quotes: a 2 px `--fg` edge on the left.
- Task items are text: `[ ]` and `[x]`.
- An empty preview says what it is (2026-10-09), in the welcome block's voice and colour, level with its first line of prose: `Here your text is rendered as you write it.` and one line of markdown, `# heading, **bold**, - list, [link](url)`, the one lesson a first-timer needs. Before, the right half was blank and read as more text area. Gone with the first character.
- Pictures, by address only (2026-10-09): `![caption](https://…)` shows the picture in the preview, as wide as the column at most, fetched from that address when shown (`loading=lazy`) and without a referrer. It is the one request the page makes on the writer's behalf, and the writer chose it, as with a link; About says so. The picture is never stored in Nanotype, so the text stays text and travels whole through export, backup, the folder copy and a share link. Pictures kept in the browser belong with the storage change (documents into IndexedDB); a picture shown inline in the text, not only in the preview, is the editor-engine question; a line of base64 in the text is never the answer (one photo fills the store and breaks a share link).

### Icon
A black square beside the blue block cursor on white. Source: `assets/icon.png`. Regenerate every size with `python3 scripts/make-icons.py`. In the browser tab the area around the image is transparent, so the icon keeps the image's own shape.

## Behaviour

- **Clicks.** A click anywhere on the blank page puts the caret in the text: at the start if the click is above the text, at the end otherwise. It never removes the caret. The preview's empty space and its welcome text count as blank too (2026-10-09: with markdown on, the right half took clicks and did nothing); the rendered text does not, its links, boxes and `copy` words are its own, and selecting it to copy is the browser's.
- **Esc.** Closes the open menu or dialog. With nothing open it puts the caret away.
- **Keys.** Shown the way the platform writes them: `⌘D` on a Mac, `Ctrl+D` elsewhere. Written once in the HTML as `Mod D`. The rule for choosing them: use the key people already know from other writing apps where one exists (`⌘K` link, `⌘E` code, `⌘D` focus, `⌘O` `⌘S` `⌘P` `⌘B` `⌘I` as everywhere); `⌘⇧` + a letter where none exists. `⌘K` opens the menu with nothing selected and makes a link of selected text. The browser keeps `⌘N`, `⌘T`, `⌘W`, `⌘⇧N`, `⌘Q` for itself, so new document is `⌘⇧D` (new Document, beside `⌘D` focus); `⌘⌥N`, the usual web answer to the same problem, also works but Chrome takes it, so it is only listed in Keys. Shortcuts are matched on the physical key (`event.code`) and every handled one is prevented, so the browser never also runs its own.
- **Settings** (theme, font, size, cursor, sound set, focus, count length) are remembered in the browser.
- **A shared link carries the writer's font and size** (short names in the packed document, 2026-10-07; the theme was carried for a day and dropped on 2026-10-08: a reader's theme is the system's), so the reader sees the text as it was shared; the reader can change them for that view and nothing is saved while shared; on import the reader's own settings return (the defaults in a fresh browser). See "Shared document" above for what the view shows.
- **Saving.** The text is written 300 ms after the last change, and at once on blur, tab hide, page hide and before a document switch; only when something was typed here, so an untouched page never overwrites what another tab saved. The document list is reloaded before a write if storage holds a list this page did not write. Measured on 2026-10-06: a 70k-character paste went from 532 ms to 10 ms, and the app's own cost per keystroke is about 1 ms at 590k characters; what remains is the browser's layout.
- **Paste.** A web address alone, pasted over selected words, links them: `[words](address)` (2026-10-10; a known pattern, and it is what ⌘K does with a selection). Otherwise up to 2,000 characters goes through the browser's `insertText`. Above that the lines are built as blocks in one go, which is instant at any size; the status line says `pasted 8,000 words`. The browser's undo cannot see a change made that way, so a big paste keeps its own step: the document before and after, and ⌘Z / ⌘⇧Z restore them while the text matches (typed changes since are undone first by the browser, as usual). `insertHTML` was tried instead: as fast and natively undoable, but Chrome drops blank lines and merges the last pasted line into what follows.
- **Offline** (`public/sw.js`): the shell (page, script, styles, fonts, sounds, the word list) is cached on the first visit. Since 2026-10-09 the worker answers same-origin requests **cache-first**: the cached copy at once, online or not, with a fresh copy fetched behind it for the next open, so the editor opens instantly and never waits on a connection that is up but dead (a captive portal, one bar). A new deploy installs a new worker with a complete new cache (`cache.addAll`, then `skipWaiting`), so the shell updates as a whole; the background refresh is a bonus. Before, it was network-first, which hung on dead connections. The counts (`/stats/`) are never cached; a file in neither place gets a plain network error, not an empty answer.
- **A missing address** (`public/404.html`, served by Vercel for any path that is not there, 2026-10-08) is a page in the app's manner: a big 404 drawn on the wordmark's own pixel grid (the same 3-wide cells), centred, "There is nothing at this address" and the way back under it, the wordmark muted in the status line's corner, in the theme the browser has stored. Not indexed. It links to `/`; it never redirects, since a wrong link should say so.
- **Saved HTML carries no classes.** A class on a line is presentation (focus mode marks the current line); it is stripped before the save, so storage holds only the text's structure (2026-10-07).
- **Never lose text.** Text that was on screen must be there on the next visit unless the person deleted it on purpose. So: a full store keeps the last good copy and the status line says `storage is full: this text is not being saved · export it, or delete old documents` until a save takes again (the text stays on screen and is retried on the next change). A save that drops a document from 2,000+ characters to under a fifth keeps the previous copy (`zen.doc.<id>.prev`) and the menu offers `restore previous version`, which swaps the two so it can be run again to go forward. `navigator.storage.persist()` is asked for at startup. Deleting a document moves it to the trash, where it stays 30 days (`deleted` timestamp on its index entry; the text stays under its key) and can be restored; only deleting from the trash removes text, and that asks first.
- **The copy that outlives the browser.** The word `backup` in the status line (after `keys`) opens a dialog that says where the text lives and why that is fragile, then offers `keep a copy in a folder…` (Chromium on a computer: every document as `documents/<first line>.md` and everything as `nanotype-backup.json`, written two seconds after a save, the folder handle kept in IndexedDB) and `export everything as .md (zip)` (every document as `documents/<first line>.md` plus `nanotype-backup.json`, in one zip, for anything that is not Nanotype) and `export everything as .json`. The word reads `backup on` while copying and `backup paused` (readable without hovering) when the browser needs a click after a restart; the dialog then offers `resume`. On phones the word is in the menu as `backup…`, and the dialog adds the home-screen tip for Safari. `src/js/components/folder.js`.
- **Starting up must never fail.** Restoring saved settings is guarded, so an error in one feature cannot leave the page blank. Test against saved states, not only a fresh browser.

## Touch

Two separate things (split 2026-10-14, after a laptop at 700 px lost its menu selection). A device that cannot hover (a phone, a tablet) gets the touch interface below: no standing selection, no key hints, row actions always shown. Any screen under 768 px wide, whatever the pointer, gets only the small-screen layout: the column hidden, the menu across the top, bigger rows and fields; a narrow window on a computer keeps its arrows, Enter and key hints. The rules are in `src/scss/_media-queries.scss`, which loads last.

- The command column is hidden. The status line shows one word, `menu`, which opens the same list of commands. `keys` and `about` move into that list; key hints are dropped everywhere.
- Nothing can be hovered, so the status line rests at 0.5 opacity and 14 px.
- The menu spans the screen width at the top, with 46 px rows. Its filter line is not focused automatically, because that would raise the keyboard over the list. A row reverses while it is pressed; there is no standing selection.
- In the documents list, `duplicate` and `delete` are always visible, on a line under the name.
- After a command the text is not refocused, so the keyboard does not jump up.
- The page ends at the on-screen keyboard: `--app-height` follows the visible height, so the caret is scrolled into the part of the page that can be seen, and focus mode's 38% line is 38% of the visible part.
- Any field that takes text is 16 px or larger, so iOS does not zoom the page.
- A tap brings the interface back after typing, as a mouse move does on a desktop.
- The welcome block says `menu lists every command.` instead of naming a key.
- Safe areas (notch, home indicator) are respected with `env(safe-area-inset-*)`.

## Motion

- Transitions are 75 ms, linear.
- The one slow transition is the cursor's fade-out, 400 ms.
- No transitions on layout properties.
- With the operating system's "reduce motion" on, nothing moves: one rule removes every animation and transition, so the cursor stands and everything appears and goes at once.

## Accessibility

The page follows three choices people make once in the operating system, with no setting of its own (2026-10-07):

- *Reduce motion*: see Motion.
- *Increase contrast* (`prefers-contrast: more`): the interface's resting opacity is one token, `--ui-idle` on `html` (0.16), and this setting raises it to the "near" value (0.55). Hover still goes to full. Line numbers stay `--muted`, which already meets AA contrast.
- *Screen readers*: the text is a named `textbox` ("Text"); a hidden `aria-live` copy of the status line (`.status-said`) carries answers and warnings (`exported notes.md`, `theme dark`) but never hover hints, so the column can be swept without chatter; every dialog is `role="dialog"` with a name and takes focus when it opens (no `aria-modal`: Tab is not trapped, and the attribute would claim it is). Nothing more: no `aria-activedescendant` or option bookkeeping for the lists, which would be attributes synced from script for a benefit no one has asked for.

Opening a dialog or the picker keeps the caret's place and closing returns to it (`keep`/`focusArticle` in `caret.js`), so Esc never throws the cursor to the start of the text. Focus rings are off everywhere (`*:focus { outline: none }`); a visible focus style for keyboard users is still to do.

## Writing

- **Interface is lowercase, prose is sentence case, and a heading takes the case of its rows** (settled 2026-10-07). Words you act on (the column, the menu, the status line, the picker's foot) are lowercase, as commands usually are: `docs`, `lines on`, `export as .md`, `exported notes.md`; their headings follow: `documents`, `switches`. Things you read (About, Keys, the dialogs, the welcome block) are sentences with capitals; their headings follow: `Documents`, `Switches`. So the case itself says what a thing is: lowercase does something, a capital is text. Keys names a command by its long description (`Line numbers`) where the menu says `lines on`; that is the one place the long name is the point.
- Short statements, one idea each. No promotional language.
- Be exact about privacy: text never leaves the browser unless the writer exports it or makes a share link; visits and commands are counted, never the text. What is counted is exactly what `src/js/components/stats.js` sends (PostHog, over plain HTTP through `/stats` on our own domain, no SDK, no autocapture, no session recording): a page view and one event per command, with the referrer, under a random visitor id (`localStorage['visitor']`, made once, carried in backups and the move) so a returning person is one visitor, not one per day; nothing about the person is in it, no person profile is built, and the address is recorded without its fragment, where a share link carries the text. Nothing is sent from localhost. About says it in one sentence ("Visits and commands are counted with cookie-free PostHog. The text is never part of that."); keep it true.

## Do not

- Add icons, cards, shadows, blur, rounded corners or pill shapes.
- Use the accent for decoration.
- Show the interface while the user is typing.
- Modify the user's text to make the interface work.
- Set interface text in the sans or serif font.
- Add a popup where the status line can carry the message.

## History worth knowing

- An "OpenAI style" redesign (rounded cards, pills, blurred backdrops, green accent) was built and then removed piece by piece. Do not bring it back.
- Icons were tried in several sets, including a pixel set, before being replaced by words.
- Six fonts were offered at one point; three is the decision.
- The status line once showed the automatic document title, which is just the first line of the text. It now shows a name only when the user gave one.

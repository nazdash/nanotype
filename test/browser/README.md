# Browser tests

Each `*.test.mjs` drives the app in headless Chrome over CDP and returns a plain object that must equal its `expect`. The runner is `run.mjs`; the toolkit it hands each suite (`open`, `key`, `type`, `insert`, `click`, `lines`, `caretTo`, `pickerRows`, `filter`, `status`, `shot`, `media`, `requests`, `errors`, …) is documented at the top of that file.

    npm run dev                        # the dev server on :3002, in another terminal
    npm run test:browser               # every suite, about four minutes
    npm run test:browser -- slash keys # by name

Every test browser blocks `/stats/`, so a run against any address, the live site included, counts no visitors. The suites assume a fresh store and are meant for the dev server; `NANOTYPE_URL` exists for a one-off look, not for routine runs.

A page exception fails a suite unless `options.allowErrors` is set. Values that vary (dates, ids, timings) are returned as booleans or bounds, never compared raw.

| suite | covers |
|---|---|
| `state-matrix` | 72 combinations of saved settings and stored document shapes all start |
| `keys` | every shortcut by physical key, each prevented; marks on a selection; ⌘K as link vs menu |
| `plain-text` | big and small paste, their undo, formatting from every route refused, cut/copy plain, old tags cleaned |
| `slash` | the `/` list: trigger rules, each row, caret placement, above/below the caret |
| `tasks` | ⌘Enter, ⌘⇧Enter, both on a selection, the preview's boxes |
| `editing-keys` | ⌥↑↓ (and the line kept on screen), ⌘⌥digits, ⌘] ⌘[, ⌘-click an address |
| `trash` | delete without asking, restore, delete for good, empty, expiry, the empty document |
| `search` | the menu and the list find a word in the text; a 4.7 MB store stays fast |
| `shared` | font/size in the link, the reader's view (rendered, system theme, trimmed column), import, the locked link |
| `layout` | column groups and gaps, no column under 1060 px, status-line clusters, the hint's gap, the contents panel's widths |
| `settings` | theme system follows the OS, duplicate, zip export, frontmatter, the copy word, a refusal beside the word |
| `a11y` | reduce-motion, contrast, names for a screen reader, the caret kept across menu and dialog, new document in focus mode |
| `stats` | what leaves the browser for the counts, and that nothing leaves from localhost |
| `tables` | Tab between table cells, ⇧Tab back, a row after the last, columns lined up on leaving (one undo step); `today` |
| `tidy` | tidy on the whole text and on a selection, each one undo step; what the status line says |
| `zz-focus` | focus mode on an empty page in every stored shape: the caret and the welcome in place, typing lands where the caret is (last, since it reloads often) |

Offline behaviour (the service worker) can only be tested against the live site, since the worker registers on https only: run a suite against it with `NANOTYPE_URL=https://nanotype.app`.

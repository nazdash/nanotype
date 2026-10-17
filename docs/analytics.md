# Analytics: what is counted

Status: **PostHog**, since 2026-10-08; a second counter ran beside it as a test until 2026-10-14 and was removed. The rule is in `AGENTS.md`: whatever is sent must match the sentence in About, and it is never the text.

## What is counted

- One page view per visit, with the page's address **without its fragment** (a share link carries the text in the fragment), and the referrer.
- One event per command run, named as in `track(name, data)` in `src/js/components/ui.js` (`theme {scheme}`, `export-all {zip}`, `menu`, `slash {row}` (the list opening itself is not an event since 2026-10-09), `task {done}`, …), with `via`: how it was reached (`column`, `key`, `menu`, `slash`, `dialog`, `status`, `preview`, `contents`; set by the handlers, read by `track`). The data is a word or a flag, never free text.
- The page view carries `first_visit` (the id was made just now) and the settings the browser lives with, as the words the commands show (`theme`, `font`, `size`, `sound`, `lines`, `focus`, `markdown`, `contents`, `spellcheck`, `counter`, `ripples`), read from storage before the page is built (2026-10-08).
- A random visitor id, `localStorage['visitor']`, made once in `stats.js` (before: in `main.js`), carried in backups and the move, so a returning browser counts once. Nothing about the person is in it.
- **Where the visit came from** (2026-10-09): `$referring_domain` (the referrer's host, or `$direct`) and any `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` in the address (a campaign's own labels, cut at 100 characters). PostHog's channel type is computed from these.
- **The browser as coarse words** (2026-10-09): `$browser` (Chrome, Safari, Firefox, Microsoft Edge, Opera, Other), `$browser_version` (the major number), `$os` (Mac OS X, Windows, iOS, Android, Chrome OS, Linux, Other), `$device_type` (Desktop, Mobile, Tablet), read from the user agent in `stats.js` the way PostHog's SDK names them; the service does not parse the user agent itself, which is why these were empty before.
- **A session id** (`$session_id`, 2026-10-09): a UUIDv7 kept in `sessionStorage`, one per tab, renewed after thirty idle minutes; PostHog's bounce rate, visit length, entry page and channel are built per session. And `$pageleave` on `pagehide`, which gives a visit its length.
- Share links, as a funnel of four events (`sharing.js`): `share-dialog` (the dialog opened), `share {kind: public | private, size}` (a link made; `size` is a length bucket, not the length), `share-open {kind}` (a share link opened; the page view is counted without the fragment, so the text never arrives), `share-import` (the reader kept the text as a document). Never: anything that tells one link from another, or a count per link; that would be a fingerprint of the text.
- `moved {ok, added}`, once per browser that reached the new address forwarded from the old one with its documents in the fragment (`sharing.js`): `ok` is whether the pack was taken, `added` how many documents came along. A count of people who followed the move, nothing more.
- Country comes from the request (IP) on PostHog's side, as for any server; the IP itself is not kept in the event. We send no screen or viewport size and set no cookie.
- Nothing from localhost.

About says: "Visits and commands are counted with cookie-free PostHog. The text is never part of that." The full list is this file.

## PostHog

- `src/js/components/stats.js`: `init()` makes the id and sends `$pageview`; `track(name, data)` sends an event. Each is one `fetch` POST (`Content-Type: text/plain`, `keepalive`) to `/stats/i/v0/e` (no trailing slash: Vercel's `:path*` rewrite does not match one; found on 2026-10-08 when the first live events 404ed) with `{ api_key, event, distinct_id, timestamp, properties }`; properties carry `$current_url` (origin + pathname), `$host`, `$pathname`, `$referrer`, `$referring_domain`, the `utm_*` words, `$browser`, `$browser_version`, `$os`, `$device_type`, `$session_id`, `$lib: 'nanotype'` and `$process_person_profile: false` (events only, no person records). Principle 15 is the rule; this list is the whole of what is sent.
- `vercel.json`: `{ "source": "/stats/:path*", "destination": "https://us.i.posthog.com/:path*" }`, so the call goes to our own domain.
- Project: a PostHog organisation on the US cloud, project "Nanotype", public key `phc_rmfY…` in `stats.js`. Free tier is 1M events a month across the organisation.
- Never: the `posthog-js` SDK or its snippet, autocapture, session recording, surveys, feature flags, person profiles. The wizard (`npx @posthog/wizard`) installs all of that; do not run it.
- Dashboards to set up once on the PostHog side: a funnel (`$pageview` → any command → `export-all` or `download`), retention on `$pageview`, a breakdown of events by name.

## Unique visitors in PostHog

Every event carries `distinct_id` = the visitor id and `$process_person_profile: false`, so PostHog stores them as anonymous events with no person record. Unique counts still work: *Unique users* in Trends, Funnels and Retention is a count of distinct ids, and the Web Analytics *Visitors* number is the same. *Sessions*, *Bounce rate* and *Session duration* come from the `$session_id` sent since 2026-10-09 (one per tab, renewed after thirty idle minutes), so a session is a sitting, not a person's history.

One browser is one id. The same person on a phone and a laptop is two visitors, and a browser that clears its storage (Safari after 7 days without a visit) becomes a new visitor with `first_visit: true`. That is the honest limit of a cookie-free count.

## Counting nothing

Empty the `send` function in `stats.js` and drop the rewrite in `vercel.json`; `track()` becomes a no-op and About then says nothing is counted. Nothing else in the app depends on the counts.

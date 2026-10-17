# Deploying Nanotype

Nanotype is a static site. `npm run build` writes everything to `dist/`; any static host serves it. No server, database or environment variables are needed.

```bash
npm ci
npm run build      # output in dist/
npm run dev        # local server with live reload, http://localhost:3002
```

Requires Node 24 (pinned in `package.json`).

## nanotype.app

The live site is a Vercel project connected to this repository: every push to `main` builds (`vercel.json` names the build command and the output folder) and deploys to production; pushes to other branches get preview URLs. `vercel.json` also holds an optional rewrite so the counts (`/stats/*` → PostHog, see `docs/analytics.md`) go through the site's own domain, and the response headers: a Content-Security-Policy under which the page may load and connect to its own domain only (pictures by address excepted), so the browser itself enforces that nothing leaves. Without the rewrite the app runs the same and counts nothing; without the headers it runs the same, unenforced.

Visitors' texts live in their browser's `localStorage`, which is tied to the exact hostname. That is why the old addresses, `zen.unit.app` and `zen.unit.ms` (Nanotype was Zen until October 2026), serve the same build and hand a visitor's documents over to the new address instead of merely redirecting (`src/js/components/move.js`); they stay up for at least a year.

## Hosting it yourself

Build, then put `dist/` on any static host or behind any web server, over https (private share links and offline use need a secure context). The service worker (`public/sw.js`) caches the app for offline use under the path it is served from; it is registered as `/sw.js` and the asset paths are absolute, so serve the build from the root of a hostname (the texts are tied to that hostname too).

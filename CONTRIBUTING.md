# Contributing

Nanotype is an opinionated product. It is small on purpose, and the roadmap is ours. Issues are welcome: a bug, we are glad to fix. An improvement we cannot promise, however good it is; most would make the app bigger, and that is the one thing it must not become.

What helps most:

- **A bug, with steps to reproduce.** Browser, what you did, what you saw, what you expected. If a document is involved, a share link of a text that shows it (never one you would not want read).
- **A small fix, with a test.** One change per pull request, in the file where the behaviour lives (`AGENTS.md` says how the code is laid out), with a check in `test/` or `test/browser/`. Say what a person using the app would notice; that line goes into `CHANGELOG.md`.
- **Words.** A sentence in the app, About, the Keys dialog or the docs that is wrong or unclear.

What is rarely taken: a feature. Every change is judged against `PRINCIPLES.md` (minimal, private, nothing distracts, works everywhere, a hammer not a jet engine). Open an issue before writing code; it saves the work.

Not taken at all: anything that sends the text anywhere, a dependency where the platform will do, a framework, a build step for one use, a second way to do what one key already does.

## Working on it

```
npm install
npm run dev          # http://localhost:3002
npm test             # the pure modules
npm run test:browser # headless Chrome, needs the dev server; about four minutes
```

Read `PRINCIPLES.md`, then `DESIGN.md` before touching the interface. The rules in `AGENTS.md` apply to people as much as to agents: storage keys are a contract, the Keys dialog must match the code, and nothing new leaves the browser without a line in `docs/analytics.md`.

Security issues: `SECURITY.md`.

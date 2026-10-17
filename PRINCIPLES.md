# Principles

What Nanotype is built around. Every change is checked against them; when two pull in different directions, the earlier one wins. `DESIGN.md` says how the interface follows them; this file says why.

## 1. Minimal: everything must earn its place

A page, a cursor, the words. Each addition costs attention, bytes and upkeep, so nothing gets in unless it clearly pays for itself, and taking away is as valuable as adding. Plain text, three fonts, one menu, a faint interface: all follow from this.

## 2. Nothing distracts from writing

The interface is nearly invisible until reached for, hides while typing, and never touches the text for its own convenience. The test for anything visible: does it serve the writing, or the app?

## 3. Private: the text never leaves the browser

No server, no account, no sync. Only a count of visits and commands leaves, never a word. When text does leave (export, share link, folder copy), the person did it on purpose.

## 4. Never lose anyone's data

Text that was on screen is there on the next visit unless the person deleted it. Storage keys are a contract with every browser out there. Where the browser itself can lose data, say so and give a way out.

## 5. Fewer clicks, fewer windows

The shortest path to anything: commands cycle their values, switches are one click, one menu reaches everything, a dialog only when the app must ask, and then once.

## 6. Transparency

Say what is true and only that. "Locked with a seed word", not "secure". No claim the app cannot keep, no hidden limitation, no promotional language.

## 7. Clear to someone who has never seen it

Nothing needs to be learned or guessed. Words instead of icons (`export`, not an arrow), even though words take more room; a setting shows its value (`font mono`); a hover says what a command does and its key; every action answers in the status line (`exported notes.md`, `theme dark`); a refusal says why, beside the word. If a first-time visitor would have to ask, it is not done.

## 8. Works on every device and browser it can

Phones, tablets, every current browser, offline after the first visit, installed as an app. Where a platform cannot do something, say so and offer the next best thing, not a broken button.

## 9. Ask first: what if we did not build it?

Doing a thing has visible benefits; not doing it is rarely visible and often costs nothing, while every thing built is carried forever. Most ideas fail this question, and the product is better for it.

## 10. A hammer, not a jet engine

A hammer works for a lifetime, in any hands, with no one on call. Nanotype must keep working for years without a team: a static site, no server to patch, no database to migrate, no dependency that can disappear.

## 11. The simplest, lightest solution

Fewer lines, fewer concepts, fewer moving parts; light to load, light to run, light to understand. No abstraction for one use, no configuration for a choice already made, no third-party scripts. Measure before optimising; remove what measurement shows is not needed. A heavier solution needs a reason the lighter one cannot meet. Code a stranger can read in one sitting.

## 12. The right part for each job, one part for alike jobs

Each job gets the part that fits it, not a stretched one: a list in the margin for headings, a picker where there is no margin; a dialog only where the app has to ask. Fit is judged by the job, never by what happens to exist. Where two jobs are alike, one part does both: the picker is the menu, the documents list, the export formats and the contents; the dialog is About, Keys, Share, Backup and the seed word. All parts share one manner (the type, the faint-until-hovered opacity, the scrolling), so the app stays one thing with few moving parts.

## 13. Use known patterns where they exist

A known pattern costs people nothing to learn: ⌘K for a link, ⌘S to export, ⌘Z for undo, paste gives text, markdown as the markup. Never fight the browser for what it keeps.

## 14. Be creative where no pattern exists

Where there is no pattern, or the existing one is poor, invent: the block cursor, the seed word, the move, the folder copy. The app has its own character and keeps finding it, within the principles above.

## 15. Nothing personal is counted, only how the product is used

What leaves for the counts is about the product, never about the person: which commands run and how they were reached, which settings a browser lives with, where a visit came from and on what kind of browser, as coarse words, under a random id with no name, cookie, text or address behind it. It is collected for two reasons only: to improve the product (what to build, what to remove, what to fix) and to see how it grows on its own. `docs/analytics.md` lists every field; anything not on that list is not sent.

## 16. It just works

Whatever a person would reasonably try, expecting it to work, works: paste an address over selected words and they become a link; drop a file on the page and it is a document; press Enter in a list and the next item is there; paste from a PDF, run `tidy`, and the sentences are whole. Nobody should have to wonder whether the app can do a thing before trying it, or look it up. The feeling comes from a hundred small cases, each a few lines, each found by asking what someone would try next; a feature that needs to be discovered is half built. The test: did it do what they thought it would, without a guess?

# Credits

What Nanotype is made with, beyond its own code, and the terms each comes under.

## Fonts (`public/fonts`, SIL Open Font License 1.1)

- **Nanotype Mono** is a build of [Iosevka](https://github.com/be5invis/Iosevka) by Belleve Invis, made with `fonts/nanotype-mono.build-plans.toml`, which adds Cyrillic and the keyboard symbols.
- **Inter** by [the Inter Project Authors](https://github.com/rsms/inter).
- **Literata** by [the Literata Project Authors](https://github.com/googlefonts/literata).

The licence text is in `public/fonts/LICENSE.txt`.

## Sounds (`public/sfx`)

- The **typewriter** key sounds are cut from *Old typewriter.wav* by [juskiddink](https://freesound.org/people/juskiddink/sounds/75105/) on Freesound, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The other key sounds are synthesised in the browser (`src/js/components/sounds.js`).

## Words (`public/words.txt`)

- The seed words of a private share link come from the [EFF large wordlist](https://www.eff.org/deeplinks/2016/07/new-wordlist-random-passphrases) by the Electronic Frontier Foundation, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

## Libraries (npm, bundled at build time)

markdown-it, markdown-it-footnote, markdown-it-task-lists, highlight.js, fflate. MIT, except markdown-it-task-lists (ISC) and highlight.js (BSD-3-Clause); each licence is in `node_modules/<name>/LICENSE` after `npm ci`.

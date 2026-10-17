// Every name under which Nanotype keeps something in the browser. A contract with
// every browser that has used the app: never rename a key here without the
// migration, which reads the old names forever.
export default {
    // localStorage: the documents (the names date from Zen, 2026-10-04)
    DOCS: 'zen.docs',                 // the list: [{ id, auto, updated, deleted }]; `auto` is the first line
    CURRENT: 'zen.current',           // the open document's id
    DOC_PREFIX: 'zen.doc.',           // + id: a document's HTML
    PREVIOUS_SUFFIX: '.prev',         // + after a document key: the copy kept when it shrank
    LEGACY_CONTENT: 'content',        // single-document Zen, before 2026-10-04

    // localStorage: the settings, in the order the backup carries them
    SETTINGS: ['scheme', 'font-scheme', 'font-size', 'sound', 'focus-mode', 'preview', 'line-numbers', 'contents', 'spellcheck', 'caret-prefs', 'counter', 'ripples', 'visitor'],
    SCHEME: 'scheme',                 // read by the inline script in index.html too (a literal there)
    VISITOR: 'visitor',               // the random id for the counts
    MOVED_SEEN: 'moved-seen',         // the banner after the move from the old address, shown once
    LEGACY_MUTED: 'muted',            // the on/off sound setting before the sets
    LEGACY_CARET: 'caret',            // the one cursor setting before the per-font one

    // IndexedDB: the folder copy's handle
    DB: 'nanotype',
    KV_STORE: 'kv',
    FOLDER: 'folder',
};

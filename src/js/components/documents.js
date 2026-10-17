import util from './utils';
import keys from '../keys';

// Document store. The list lives in localStorage['zen.docs'],
// each document's HTML in localStorage['zen.doc.<id>'].
export default (function () {
    const INDEX_KEY = keys.DOCS;
    const CURRENT_KEY = keys.CURRENT;
    const CONTENT_PREFIX = keys.DOC_PREFIX;
    const PREVIOUS_SUFFIX = keys.PREVIOUS_SUFFIX;   // the copy kept when a document lost most of its text
    const LEGACY_CONTENT_KEY = keys.LEGACY_CONTENT;   // single-document Zen stored the text here

    // A save that shrinks a document this much keeps the previous copy
    const SHRINK_KEEP_FROM = 2000;   // characters the document had
    const SHRINK_RATIO = 0.2;        // and keeps less than this share of them

    // A deleted document stays in the list, marked with the time it was deleted
    // (`deleted`), and its text stays in storage; this long, then it is gone for good
    const TRASH_DAYS = 30;

    let docs = [];
    let currentId = null;

    // The list as last read or written here. If storage holds something else, another
    // tab (or a restore) changed it, and the copy in memory is stale: reload before writing.
    let storedIndex = null;

    function init() {
        load();

        if (docs.length === 0) {
            const legacyContent = localStorage[LEGACY_CONTENT_KEY] || '';

            currentId = create(legacyContent).id;
            localStorage.removeItem(LEGACY_CONTENT_KEY);
        }

        // what has been in the trash long enough goes
        docs.filter(doc => doc.deleted && doc.deleted < Date.now() - TRASH_DAYS * 86400000).forEach(doc => destroy(doc.id));

        if (list().length === 0) {
            create('');
        }

        if (!getById(currentId) || getById(currentId).deleted) {
            currentId = list()[0].id;
        }

        saveIndex();
    }

    function load() {
        storedIndex = localStorage[INDEX_KEY] || null;

        try {
            docs = JSON.parse(storedIndex || '[]');
        } catch (e) {
            docs = [];
        }

        currentId = localStorage[CURRENT_KEY] || null;
    }

    // One write; false when storage refuses it (full). Every write of the store
    // goes through here except the ones in saveContent, which keep the old copy
    function write(key, value) {
        try {
            localStorage[key] = value;
            return true;
        } catch (e) {
            return false;
        }
    }

    function saveIndex() {
        storedIndex = JSON.stringify(docs);
        return write(INDEX_KEY, storedIndex) && write(CURRENT_KEY, currentId);
    }

    function isStale() {
        return (localStorage[INDEX_KEY] || null) !== storedIndex;
    }

    function newId() {
        return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    function getById(id) {
        return docs.find(doc => doc.id === id);
    }

    // The documents, newest first; what is in the trash is not among them
    function list() {
        return docs.filter(doc => !doc.deleted).sort((a, b) => b.updated - a.updated);
    }

    // The trash, last deleted first
    function trash() {
        return docs.filter(doc => doc.deleted).sort((a, b) => b.deleted - a.deleted);
    }

    function current() {
        return getById(currentId);
    }

    function setCurrent(id) {
        if (getById(id) && !getById(id).deleted) {
            currentId = id;
            saveIndex();
        }
    }

    // A document has no name of its own: `auto` is its first line (util.firstLine),
    // kept here so the list needs no text. Older entries may still carry a `title`
    // from when documents could be renamed; it is ignored.
    function create(html) {
        const doc = {
            id: newId(),
            auto: util.firstLine(util.htmlToText(html || '')),
            updated: Date.now(),
        };

        docs.unshift(doc);

        // a full store: nothing is left half-made, and null says so
        if (!write(CONTENT_PREFIX + doc.id, html || '') || !saveIndex()) {
            forget(doc.id);
            return null;
        }

        return doc;
    }

    // Add a document that already has an id (a backup, or the move from the old
    // address). An id that is already here is left alone: null says so.
    function add(doc, html) {
        if (!doc.id || getById(doc.id)) {
            return null;
        }

        const added = {
            id: doc.id,
            auto: util.firstLine(util.htmlToText(html || '')),
            updated: doc.updated || Date.now(),
        };

        docs.push(added);

        if (!write(CONTENT_PREFIX + added.id, html || '') || !saveIndex()) {
            forget(added.id);
            return null;
        }

        return added;
    }

    // True when nothing has been written yet: at most one document, and it is empty
    function isBlank() {
        return docs.length === 0 || (docs.length === 1 && isEmpty(docs[0].id));
    }

    function isEmpty(id) {
        return getContent(id).replace(/<[^>]*>/g, '').trim() === '';
    }

    function getContent(id) {
        return localStorage[CONTENT_PREFIX + id] || '';
    }

    // Returns true when written, false when storage refused (full): the old copy
    // stays and nothing else is touched
    function saveContent(id, html, firstLine) {
        if (isStale()) {
            load();
        }

        const doc = getById(id);
        const before = localStorage[CONTENT_PREFIX + id];

        if (!doc || before === html) {
            return true;
        }

        try {
            // most of the text gone in one save: keep what was there, in case
            if (before && before.length >= SHRINK_KEEP_FROM && html.length < before.length * SHRINK_RATIO) {
                localStorage[CONTENT_PREFIX + id + PREVIOUS_SUFFIX] = before;
            }

            localStorage[CONTENT_PREFIX + id] = html;
            doc.updated = Date.now();
            doc.auto = firstLine;
            saveIndex();
        } catch (e) {
            return false;
        }

        return true;
    }

    function hasPrevious(id) {
        return localStorage[CONTENT_PREFIX + id + PREVIOUS_SUFFIX] !== undefined;
    }

    // Swap the document with its kept copy, so a restore can itself be undone
    function restorePrevious(id) {
        const previous = localStorage[CONTENT_PREFIX + id + PREVIOUS_SUFFIX];
        const current = localStorage[CONTENT_PREFIX + id];

        if (previous === undefined) {
            return false;
        }

        localStorage[CONTENT_PREFIX + id] = previous;
        localStorage[CONTENT_PREFIX + id + PREVIOUS_SUFFIX] = current || '';

        return true;
    }

    // To the trash: the document and its text stay, out of the list. A document
    // with no text has nothing to keep and goes at once.
    function remove(id) {
        const doc = getById(id);

        if (!doc) {
            return;
        }

        if (isEmpty(id)) {
            forget(id);
        } else {
            doc.deleted = Date.now();
        }

        if (list().length === 0) {
            create('');
        }

        if (currentId === id) {
            currentId = list()[0].id;
        }

        saveIndex();
    }

    // Out of the trash, to the top of the list
    function restore(id) {
        const doc = getById(id);

        if (doc && doc.deleted) {
            delete doc.deleted;
            doc.updated = Date.now();
            saveIndex();
        }
    }

    // Gone for good, with its text
    function destroy(id) {
        forget(id);
        saveIndex();
    }

    function forget(id) {
        docs = docs.filter(doc => doc.id !== id);
        localStorage.removeItem(CONTENT_PREFIX + id);
        localStorage.removeItem(CONTENT_PREFIX + id + PREVIOUS_SUFFIX);
    }

    // A document's text as something to search in: tags out, the few entities the
    // editor writes back to characters, lowercase. Cheaper than parsing the HTML.
    function searchText(doc) {
        return getContent(doc.id)
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;|\xa0/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .toLowerCase();
    }

    function titleOf(doc) {
        return doc.auto || 'Untitled';
    }

    function isOwnKey(key) {
        return key === INDEX_KEY || key === CURRENT_KEY || (key && key.indexOf(CONTENT_PREFIX) === 0);
    }

    return {
        init,
        load,
        list,
        trash,
        TRASH_DAYS,
        current,
        setCurrent,
        create,
        add,
        isBlank,
        getContent,
        saveContent,
        hasPrevious,
        restorePrevious,
        remove,
        restore,
        destroy,
        titleOf,
        searchText,
        isOwnKey,
    }
})();

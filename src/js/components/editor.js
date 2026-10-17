import util from './utils';
import documents from './documents';

// editor: binds the contenteditable article to the current document
export default (function() {

    // Editor elements
    let contentField;

    let hasStorage = false;

    // Callbacks run after a different document is shown
    let changeListeners = [];

    // Called with true when storage refused a save (full) and with false once it takes again
    let fullListener = null;
    let storageFull = false;

    // Called after every successful save (the folder copy follows)
    let saveListener = null;

    // While a shared document is on screen the article is not the current document:
    // nothing is saved from it and nothing is loaded over it
    let locked = false;

    // Saving serialises the whole document, so it waits for a pause in typing and
    // runs at once whenever the page may go away or the document changes
    const SAVE_DELAY = 300;   // ms
    let saveTimer = null;
    let dirty = false;        // typed into since it was loaded or last saved

    function init() {
        hasStorage = util.supportsHtmlStorage();
        bindElements();

        createEventBindings();

        // Load state if storage is supported
        if (hasStorage) {
            documents.init();
            loadState();

            window.addEventListener('storage', onStorage, false);
        }
    }

    function createEventBindings() {
        if (hasStorage) {
            contentField.addEventListener('input', scheduleSave, false);
            contentField.addEventListener('blur', saveState, false);
            window.addEventListener('pagehide', saveState, false);
            window.addEventListener('beforeunload', saveState, false);
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    saveState();
                }
            }, false);
        }

        // Plain text only: every formatting command the browser could apply (⌘U, a
        // menu, an extension) arrives here first and is refused
        contentField.addEventListener('beforeinput', (event) => {
            if (event.inputType && event.inputType.startsWith('format')) {
                event.preventDefault();
            }
        });
    }


    function bindElements() {
        contentField = document.querySelector('article.content');
    }

    function scheduleSave() {
        dirty = true;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveState, SAVE_DELAY);
    }

    // The text as it is kept: a class on a line is presentation (focus mode's
    // current line), so it is dropped from a copy of the DOM, never from the
    // serialised string, where a typed class="x" is text like any other
    function html() {
        const copy = contentField.cloneNode(true);

        copy.querySelectorAll('[class]').forEach(element => element.removeAttribute('class'));

        return copy.innerHTML;
    }

    // Writes now. Safe to call at any time; writes only what was typed here, so a
    // page that was not touched can never overwrite what another tab saved.
    function saveState() {
        clearTimeout(saveTimer);
        saveTimer = null;

        if (!hasStorage || locked || !dirty) {
            return;
        }

        const written = documents.saveContent(documents.current().id, html(), util.firstLineOf(contentField));

        // storage is full: the text stays on screen and is tried again on the next change
        dirty = !written;

        if (written && saveListener) {
            saveListener();
        }

        if (written === storageFull && fullListener) {
            storageFull = !written;
            fullListener(storageFull);
        }
    }

    function onStorageFull(listener) {
        fullListener = listener;
    }

    function onSave(listener) {
        saveListener = listener;
    }

    // The kept copy of the current document, if a save had shrunk it
    function restorePrevious() {
        if (!documents.restorePrevious(documents.current().id)) {
            return false;
        }

        dirty = false;
        loadState();

        return true;
    }

    function loadState() {
        if (locked) {
            return;
        }

        contentField.innerHTML = util.plainHtml(documents.getContent(documents.current().id));
        dirty = false;
        notifyChange();
    }

    function lock() {
        locked = true;
    }

    function unlock() {
        locked = false;
    }

    // Another tab changed a document: this tab's typing is written first, so the
    // reload never drops it, and the text is reloaded only if what is stored
    // differs from what is shown (so the caret stays when only the list changed)
    function onStorage(event) {
        if (!documents.isOwnKey(event.key)) {
            return;
        }

        saveState();

        const id = documents.current().id;

        documents.load();

        if (documents.current().id !== id || util.plainHtml(documents.getContent(id)) !== html()) {
            loadState();
        }
    }

    function openDocument(id) {
        if (id === documents.current().id) {
            return;
        }

        saveState();
        documents.setCurrent(id);
        loadState();
    }

    function createDocument(html) {
        saveState();

        const doc = documents.create(html || '');

        // storage is full: nothing was made, and the sticky message says why
        if (!doc) {
            if (fullListener) {
                storageFull = true;
                fullListener(true);
            }

            return null;
        }

        documents.setCurrent(doc.id);
        loadState();

        return doc;
    }

    function removeDocument(id) {
        const wasCurrent = id === documents.current().id;

        documents.remove(id);

        if (wasCurrent) {
            loadState();
        }
    }

    function onDocumentChange(listener) {
        changeListeners.push(listener);
    }

    function notifyChange() {
        changeListeners.forEach(listener => listener());
    }

    return {
        init: init,
        saveState: saveState,
        openDocument: openDocument,
        createDocument: createDocument,
        removeDocument: removeDocument,
        onDocumentChange: onDocumentChange,
        lock: lock,
        unlock: unlock,
        reload: loadState,
        onStorageFull: onStorageFull,
        onSave: onSave,
        restorePrevious: restorePrevious,
    }

})();

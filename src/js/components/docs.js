import app from './app';
import caret from './caret';
import editor from './editor';
import documents from './documents';
import folder from './folder';
import util from './utils';

// Documents: the list (⌘⇧O), opening, duplicating, deleting to the
// trash, the trash itself, and a new document
export default (function () {
    let documentsElement = null;

    function init() {
        documentsElement = document.querySelector('.documents');
        documentsElement.onclick = onDocumentsClick;
        app.documentsElement = documentsElement;
    }

    // DOCUMENTS: the list, opening, duplicating, deleting, a new one

    function onDocumentsClick() {
        if (app.shared.active) {
            return;
        }

        if (app.picker.kind === 'documents') {
            app.closePicker();
            return;
        }

        openDocumentsPicker();
        app.track('documents');
    }

    function openDocumentsPicker() {
        const current = documents.current();
        const items = documents.list().map(doc => ({
            label: documents.titleOf(doc),
            hint: new Date(doc.updated).toLocaleDateString(),
            text: documents.searchText(doc),
            current: current && doc.id === current.id,
            run: () => openDocument(doc.id),
            actions: {
                duplicate: () => duplicateDocument(doc),
                delete: () => deleteDocument(doc),
            },
        }));

        if (documents.trash().length) {
            items.push(trashItem());
        }

        app.openPicker({
            kind: 'documents',
            startOnCurrent: true,
            placeholder: 'filter documents',
            foot: `enter open · ${app.formatKeys('Mod D')} duplicate · ${app.formatKeys('Mod ⌫')} delete`,
            items,
        });
    }

    function openDocument(id) {
        editor.openDocument(id);

        if (!app.is.touch) {
            app.article.focus();
        }
    }

    // A copy of the document, opened
    function duplicateDocument(doc) {
        const copy = editor.createDocument(documents.getContent(doc.id));

        app.closePicker(false);

        if (!copy) {
            return;   // storage is full; the status line says so
        }

        openDocument(copy.id);
        folder.writeAll();
        app.setStatus('duplicated', 3000);
        app.track('document-duplicate');
    }

    // To the trash, no question asked: the trash is the way back
    function deleteDocument(doc) {
        editor.removeDocument(doc.id);
        folder.writeAll();
        app.setStatus(documents.trash().some(d => d.id === doc.id)
            ? `moved "${documents.titleOf(doc)}" to trash · ${documents.TRASH_DAYS} days`
            : `deleted "${documents.titleOf(doc)}"`, 3000);
        app.track('document-delete');
        openDocumentsPicker();
    }

    // TRASH: deleted documents, kept for a while (see documents.js); a row at the
    // end of the documents list and of the menu while there is something in it

    function trashItem() {
        const count = documents.trash().length;

        return { label: 'trash…', hint: `${count} ${count === 1 ? 'document' : 'documents'}, gone after ${documents.TRASH_DAYS} days`, run: openTrashPicker };
    }

    function openTrashPicker() {
        const items = documents.trash().map(doc => ({
            label: documents.titleOf(doc),
            hint: `deleted ${new Date(doc.deleted).toLocaleDateString()}`,
            run: () => restoreDocument(doc),
            actions: {
                restore: () => restoreDocument(doc),
                delete: () => destroyDocument(doc),
            },
        }));

        items.push({ label: 'empty trash', hint: 'for good', run: emptyTrash });

        app.openPicker({
            kind: 'trash',
            placeholder: 'filter the trash',
            foot: `enter restore · ${app.formatKeys('Mod ⌫')} delete for good`,
            items,
        });
        app.track('trash');
    }

    function restoreDocument(doc) {
        documents.restore(doc.id);
        app.closePicker(false);
        openDocument(doc.id);
        folder.writeAll();
        app.setStatus(`restored "${documents.titleOf(doc)}"`, 3000);
        app.track('document-restore');
    }

    function destroyDocument(doc) {
        if (window.confirm(`Delete "${documents.titleOf(doc)}" for good?`)) {
            documents.destroy(doc.id);
            app.track('document-destroy');
        }

        if (documents.trash().length) {
            openTrashPicker();
        } else {
            openDocumentsPicker();
        }
    }

    function emptyTrash() {
        const count = documents.trash().length;

        if (window.confirm(`Empty the trash? ${count} ${count === 1 ? 'document' : 'documents'}, for good.`)) {
            documents.trash().forEach(doc => documents.destroy(doc.id));
            app.setStatus('trash emptied', 3000);
            app.track('document-destroy', { all: true });
        }
    }

    function newDocument() {
        if (app.shared.active) {
            return;
        }

        editor.createDocument('');
        app.removeOverlay();
        app.closePicker(false);
        app.article.focus();
        caret.placeAtEdge(true);   // focus alone does not always give an empty editable a caret (Safari)
        caret.wake();
        caret.schedule();
        app.setStatus('new document');
        app.track('document-new');
    }

    // today: the document whose first line is today's date, opened; or started with
    // that date as a heading. The date is written as 2026-10-10 (sorts, reads the
    // same everywhere); a document named with the local form (10/10/2026) counts too.
    function today() {
        if (app.shared.active) {
            return;
        }

        const now = new Date();
        const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const names = [iso, now.toLocaleDateString()];
        const existing = documents.list().find(doc => names.includes(documents.titleOf(doc)));

        if (existing) {
            app.removeOverlay();
            app.closePicker(false);
            openDocument(existing.id);
            app.setStatus(`today: ${documents.titleOf(existing)}`, 2000);
        } else {
            editor.createDocument(util.textToHtml(`# ${iso}\n\n`));
            app.removeOverlay();
            app.closePicker(false);
            app.article.focus();
            caret.placeAtEdge(false);
            caret.wake();
            caret.schedule();
            app.setStatus(`today: ${iso}, started`, 2000);
        }

        app.track('today', { existing: !!existing });
    }

    return {
        init,
        today,
        toggle: onDocumentsClick,
        openList: openDocumentsPicker,
        open: openDocument,
        create: newDocument,
        trashItem,
        openTrash: openTrashPicker,
        element: () => documentsElement,
    };
})();

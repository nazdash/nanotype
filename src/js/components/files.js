import app from './app';
import util from './utils';
import editor from './editor';
import documents from './documents';
import backup from './backup';
import folder from './folder';

// Files: the backup dialog and the folder copy's word, importing files (picker or
// drop), exporting this document, exporting everything (.json or a zip of .md)
export default (function () {
    let backupModal, backupElement, fileInput;

    function init() {
        backupModal = app.overlay.querySelector('.backup-modal');
        app.bindChoices(backupModal, onBackupChoice);
        backupElement = document.querySelector('.backup');
        backupElement.onclick = openBackup;
        fileInput = document.querySelector('.file-input');
        fileInput.onchange = onFileChosen;
        document.addEventListener('dragover', onDragOver);
        document.addEventListener('dragleave', onDragLeave);
        document.addEventListener('drop', onFileDrop);
        folder.onChange(updateBackupWord);
    }

    // BACKUP: the word in the status line says the state of the folder copy; the
    // dialog explains where the text lives and offers the ways out. See folder.js.

    function updateBackupWord(state) {
        backupElement.textContent = state === 'on' ? 'backup on' : state === 'paused' ? 'backup paused' : 'backup';
        backupElement.classList.toggle('attention', state === 'paused');
    }

    // What this browser does with its storage, said plainly, for browsers that
    // cannot keep a folder copy
    function storageNote() {
        const ua = navigator.userAgent;
        const safari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);
        const firefox = /Firefox/.test(ua);
        const how = 'Keep a copy with "export everything": one file, now and then, to a place you trust. Importing it later brings every document back.';

        if (safari) {
            return `Safari deletes a site's storage after 7 days without a visit, unless the app is on the home screen, and it cannot write to a folder. ${how}`;
        }

        if (firefox) {
            return `Firefox keeps the storage until you clear site data, but it cannot write to a folder. ${how}`;
        }

        return `This browser cannot write to a folder. ${how}`;
    }

    function openBackup() {
        const state = folder.state();

        backupModal.querySelector('.for-no-folder').textContent = storageNote();

        backupModal.classList.toggle('folder', state !== 'unsupported');
        backupModal.classList.toggle('folder-on', state === 'on');
        backupModal.classList.toggle('folder-paused', state === 'paused');
        backupModal.querySelector('.backup-state').textContent =
            state === 'on' ? `Copying to the folder "${folder.name()}" as you write.`
            : state === 'paused' ? `The folder "${folder.name()}" is set; the browser needs a click to allow writing again.`
            : '';
        app.openModal(backupModal);
        app.selectChoice(backupModal, app.visibleChoices(backupModal)[0]);
        backupModal.focus();
        app.track('backup-dialog', { state });
    }

    async function onBackupChoice(choice) {
        switch (choice) {
            case 'choose':
                if (await folder.choose()) {
                    app.removeOverlay();
                    app.setStatus(`copying to "${folder.name()}" as you write`, 4000);
                    app.track('backup-folder', { on: true });
                }
                break;

            case 'resume':
                if (await folder.resume()) {
                    app.removeOverlay();
                    app.setStatus(`copying to "${folder.name()}" again`, 4000);
                }
                break;

            case 'stop':
                await folder.stop();
                app.removeOverlay();
                app.setStatus('folder copy stopped · the files stay', 4000);
                app.track('backup-folder', { on: false });
                break;

            case 'export-zip':
                app.removeOverlay();
                exportEverythingZip();
                break;

            case 'export':
                app.removeOverlay();
                exportEverything();
                break;

            default:
        }
    }

    // IMPORT: a file picker, or files dropped on the page

    function openFilePicker() {
        if (app.shared.active) {
            return;
        }

        fileInput.click();
    }

    function onFileChosen() {
        importFiles(fileInput.files);
        fileInput.value = '';
    }

    // While a file is over the page the status line says what a drop will do; the
    // hint is renewed while the drag goes on and fades once it has left
    function onDragOver(event) {
        event.preventDefault();

        if (!app.shared.active && event.dataTransfer && Array.from(event.dataTransfer.types).includes('Files')) {
            app.body.classList.add('dragging');
            app.setStatus('drop to import as a new document (.txt, .md; .json restores a backup)', 1000);
        }
    }

    function onDragLeave(event) {
        if (!event.relatedTarget) {
            app.body.classList.remove('dragging');
            app.setStatus('', 1);
        }
    }

    // Files dropped on the page are imported; text dropped is the editor's (ui.js)
    function onFileDrop(event) {
        const dropped = event.dataTransfer && event.dataTransfer.files;

        if (dropped && dropped.length) {
            event.preventDefault();
            app.body.classList.remove('dragging');
            importFiles(dropped);
        }
    }

    function importFiles(files) {
        if (app.shared.active) {
            return;
        }

        Array.from(files).forEach((file) => {
            const reader = new FileReader();

            reader.onload = () => {
                app.removeOverlay();
                app.closePicker(false);

                // a backup made by "export everything"
                if (/\.json$/i.test(file.name)) {
                    importBackup(reader.result, file.name);
                    return;
                }

                editor.createDocument(util.textToHtml(reader.result));
                app.setStatus(`imported ${file.name}`);
                app.track('import');
            };

            reader.readAsText(file);
        });
    }

    // EVERYTHING AT ONCE: one .json with every document and setting, or every
    // document as .md in a zip: a backup, and the way out of this browser

    function exportEverything() {
        const data = backup.collect();
        const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json;charset=utf-8' });
        const name = backup.fileName();

        util.download(blob, name);
        app.setStatus(`exported ${data.documents.length} ${data.documents.length === 1 ? 'document' : 'documents'} to ${name}`, 3000);
        app.track('export-all');
    }

    // The same as plain .md files in a zip, for anything that is not Nanotype
    function exportEverythingZip() {
        const data = backup.collect();
        const blob = new Blob([backup.zipFiles(data)], { type: 'application/zip' });
        const name = backup.zipFileName();

        util.download(blob, name);
        app.setStatus(`exported ${data.documents.length} ${data.documents.length === 1 ? 'document' : 'documents'} to ${name}`, 3000);
        app.track('export-all', { zip: true });
    }

    function importBackup(text, name) {
        let data = null;

        try {
            data = JSON.parse(text);
        } catch (e) {
            data = null;
        }

        if (!backup.isBackup(data)) {
            app.setStatus(`${name} is not a Nanotype (or Zen) backup`, 3000);
            return;
        }

        const result = backup.apply(data);

        if (result.newer) {
            app.setStatus('this backup needs a newer Nanotype', 3000);
            return;
        }

        editor.reload();
        app.loadState();
        app.counterUpdate();
        app.track('import-all', { added: result.added });

        if (result.added === 0) {
            app.setStatus('nothing new: every document in the backup is already here', 3000);
        } else {
            app.setStatus(`imported ${result.added} ${result.added === 1 ? 'document' : 'documents'}${result.skipped ? `, ${result.skipped} already here` : ''}`, 3000);
        }
    }

    // EXPORT: this document as .md or .txt

    function saveText(format) {
        const text = getEditorPlainText();
        const content = format === 'md' ? text : text.replace(/\n/g, "\r\n"); // CRLF for windows-machines compatibility
        const blob = new Blob([content], { type: `text/${format === 'md' ? 'markdown' : 'plain'};charset=utf-8` });

        const name = getFileName(text, format);

        app.track('download', { format });
        util.download(blob, name);
        app.setStatus(`exported ${name}`);
    }

    function getEditorPlainText() {
        return util.articleToText(app.article);
    }

    // The file is named after the document, like the folder copy and the zip
    function getFileName(plaintext, extension) {
        return util.fileName(util.firstLine(plaintext), extension);
    }

    return {
        init,
        openBackup,
        openFilePicker,
        exportEverything,
        exportEverythingZip,
        saveText,
        getEditorPlainText,
    };
})();

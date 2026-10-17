import { zipSync, strToU8 } from 'fflate';
import documents from './documents';
import util from './utils';
import keys from '../keys';

// Everything in one piece: every document and every setting. Used by "export
// everything", by "import a backup", and by the move to the new address.
//
//   { format: 'zen-backup', version: 1, exported: ISO date, current: id,
//     settings: { key: value }, documents: [{ id, updated, text }] }
// (older files also carry a `title` per document, from when documents could be
// renamed; it is ignored, the first line names the document)
export default (function () {
    const FORMAT = 'zen-backup';   // the format's name is a contract with every backup file out there, like the storage keys
    const VERSION = 1;

    // The settings ui.js keeps in localStorage
    const SETTING_KEYS = keys.SETTINGS;

    function collect() {
        const settings = {};

        SETTING_KEYS.forEach((key) => {
            if (localStorage[key] !== undefined) {
                settings[key] = localStorage[key];
            }
        });

        const current = documents.current();

        return {
            format: FORMAT,
            version: VERSION,
            exported: new Date().toISOString(),
            current: current ? current.id : null,
            settings,
            documents: documents.list().map(doc => ({
                id: doc.id,
                updated: doc.updated,
                text: util.htmlToText(documents.getContent(doc.id)),
            })),
        };
    }

    function isBackup(data) {
        return !!data && data.format === FORMAT && typeof data.version === 'number' && Array.isArray(data.documents);
    }

    // Only adds. A document whose id is already here is skipped; settings are taken
    // only when nothing has been written in this browser yet (the app writes its
    // defaults on the first visit, so "no settings" is judged by the documents).
    // Returns what happened.
    function apply(data) {
        if (!isBackup(data)) {
            return null;
        }

        if (data.version > VERSION) {
            return { added: 0, skipped: 0, newer: true };
        }

        const wasBlank = documents.isBlank();
        const blank = wasBlank ? documents.list()[0] : null;
        let added = 0;
        let skipped = 0;

        data.documents.forEach((doc) => {
            // an empty document is the one every browser starts with: not worth carrying
            if (!doc || typeof doc.text !== 'string' || doc.text.trim() === '') {
                return;
            }

            if (documents.add(doc, util.textToHtml(doc.text))) {
                added++;
            } else {
                skipped++;
            }
        });

        if (wasBlank && data.settings) {
            SETTING_KEYS.forEach((key) => {
                if (typeof data.settings[key] === 'string') {
                    localStorage[key] = data.settings[key];
                }
            });
        }

        // the untouched empty document a fresh browser starts with gives way to what arrived
        if (blank && added > 0) {
            documents.remove(blank.id);
        }

        if (wasBlank && added > 0 && data.current && documents.list().some(doc => doc.id === data.current)) {
            documents.setCurrent(data.current);
        }

        return { added, skipped, settings: wasBlank };
    }

    function fileName() {
        return `nanotype-backup-${new Date().toISOString().slice(0, 10)}.json`;
    }

    // The same, as plain files: documents/<title>.md for each document, and the
    // .json beside them so the zip is a full backup too
    function zipFileName() {
        return `nanotype-${new Date().toISOString().slice(0, 10)}.zip`;
    }

    function zipFiles(data) {
        const taken = new Set();
        const files = {};

        data.documents.forEach((doc) => {
            files[`documents/${util.fileName(util.firstLine(doc.text), 'md', taken)}`] = strToU8(doc.text);
        });
        files['nanotype-backup.json'] = strToU8(JSON.stringify(data, null, 1));

        return zipSync(files);
    }

    return {
        FORMAT,
        VERSION,
        collect,
        isBackup,
        apply,
        fileName,
        zipFileName,
        zipFiles,
    };
})();

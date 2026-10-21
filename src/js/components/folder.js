import documents from './documents';
import backup from './backup';
import util from './utils';
import keys from '../keys';

// A copy that outlives the browser: a folder the person picks once, kept up to date
// with every document as <title>.md and everything as nanotype-backup.json.
// Chromium on a computer only (File System Access API). The folder handle can only
// be kept in IndexedDB; after a browser restart Chrome asks once to confirm access.
export default (function () {
    const DB = keys.DB;
    const STORE = keys.KV_STORE;
    const KEY = keys.FOLDER;
    const MANIFEST = 'nanotype-backup.json';
    const DOCS_DIR = 'documents';
    const WRITE_DELAY = 2000;   // ms after the last save

    let handle = null;
    let state = 'off';          // 'unsupported' | 'off' | 'on' | 'paused'
    let timer = null;
    let listener = null;

    function supported() {
        return typeof window.showDirectoryPicker === 'function' && typeof indexedDB !== 'undefined';
    }

    // A tiny key-value store, only because a folder handle cannot live in localStorage
    function db() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB, 1);

            request.onupgradeneeded = () => request.result.createObjectStore(STORE);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function kv(mode, run) {
        const connection = await db();

        return new Promise((resolve, reject) => {
            const request = run(connection.transaction(STORE, mode).objectStore(STORE));

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function setState(next) {
        state = next;

        if (listener) {
            listener(state);
        }
    }

    function onChange(fn) {
        listener = fn;
    }

    async function init() {
        if (!supported()) {
            setState('unsupported');
            return;
        }

        try {
            handle = await kv('readonly', store => store.get(KEY));
        } catch (e) {
            handle = null;
        }

        if (!handle) {
            setState('off');
            return;
        }

        const permission = await handle.queryPermission({ mode: 'readwrite' });

        if (permission === 'granted') {
            setState('on');
            writeAll();
        } else {
            setState('paused');
        }
    }

    // Needs a click: the folder picker
    async function choose() {
        try {
            handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'nanotype', startIn: 'documents' });
        } catch (e) {
            return false;   // cancelled
        }

        // if the handle cannot be kept, the copy still works for this session
        await kv('readwrite', store => store.put(handle, KEY)).catch(() => {});
        setState('on');
        await writeAll();

        return true;
    }

    // Needs a click: Chrome confirms access after a restart
    async function resume() {
        if (!handle) {
            return false;
        }

        const permission = await handle.requestPermission({ mode: 'readwrite' });

        if (permission !== 'granted') {
            return false;
        }

        setState('on');
        await writeAll();

        return true;
    }

    async function stop() {
        handle = null;
        await kv('readwrite', store => store.delete(KEY)).catch(() => {});
        setState('off');
    }

    function name() {
        return handle ? handle.name : '';
    }

    async function writeFile(dir, fileName, text) {
        const file = await dir.getFileHandle(fileName, { create: true });
        const stream = await file.createWritable();

        await stream.write(text);
        await stream.close();
    }

    // Everything; then any .md in the documents folder that is not a document now
    // is removed, so the folder mirrors the app after a rename, a delete or a
    // reconnect alike. The folder is listed, not remembered: nothing survives a
    // reload to remember with.
    async function writeAll() {
        if (state !== 'on') {
            return;
        }

        try {
            const data = backup.collect();
            const dir = await handle.getDirectoryHandle(DOCS_DIR, { create: true });
            const taken = new Set();

            for (const doc of data.documents) {
                await writeFile(dir, util.fileName(util.firstLine(doc.text), 'md', taken), doc.text);
            }

            // file systems mostly ignore case; so does this
            const kept = new Set([...taken].map(name => name.toLowerCase()));

            for await (const entry of dir.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.md') && !kept.has(entry.name.toLowerCase())) {
                    await dir.removeEntry(entry.name).catch(() => {});
                }
            }

            await writeFile(handle, MANIFEST, JSON.stringify(data, null, 1));
        } catch (e) {
            setState('paused');
        }
    }

    // After a save: everything again, a moment later. One path only; the files are
    // small and the disk is local.
    function schedule() {
        if (state !== 'on') {
            return;
        }

        clearTimeout(timer);
        timer = setTimeout(writeAll, WRITE_DELAY);
    }

    return {
        supported,
        init,
        choose,
        resume,
        stop,
        name,
        state: () => state,
        onChange,
        schedule,
        writeAll,
    };
})();

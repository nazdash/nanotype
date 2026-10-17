import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';

// Sharing by link: the document travels inside the part of the address after #,
// which a browser never sends to a server.
//
//   #s=1.<data>    public: deflate(JSON) in base64url
//   #s=1e.<data>   private: salt(16) + nonce(12) + AES-GCM(deflate(JSON)) in base64url,
//                  the key derived from a seed word with PBKDF2
//
// Pure functions, no DOM.
export default (function () {
    const VERSION = 1;
    const SALT_BYTES = 16;
    const NONCE_BYTES = 12;
    const PBKDF2_ITERATIONS = 600000;
    const SEED_WORDS = 4;

    // base64url: no +, / or =, so the link survives messengers and mail
    function toBase64Url(bytes) {
        let binary = '';

        for (let i = 0; i < bytes.length; i += 0x8000) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }

        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function fromBase64Url(text) {
        const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
        const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes;
    }

    // The writer's font and size travel too, so the reader sees the text as it was
    // shared (the theme does not: a reader gets the system's); short names, optional
    const LOOK = ['font', 'size'];

    function pack(doc) {
        const packed = { text: doc.text || '' };

        LOOK.forEach((key) => {
            if (typeof doc[key] === 'string' && doc[key]) {
                packed[key] = doc[key];
            }
        });

        return deflateSync(strToU8(JSON.stringify(packed)), { level: 9 });
    }

    function unpack(bytes) {
        const doc = JSON.parse(strFromU8(inflateSync(bytes)));

        if (!doc || typeof doc.text !== 'string') {
            throw new Error('not a document');
        }

        const unpacked = { text: doc.text };

        LOOK.forEach((key) => {
            if (typeof doc[key] === 'string') {
                unpacked[key] = doc[key];
            }
        });

        return unpacked;
    }

    // What a fragment is: none, public, private, incomplete, or from a newer Zen
    function inspect(hash) {
        const match = /^#?s=(\d+)(e?)\.([A-Za-z0-9_-]*)$/.exec(hash || '');

        if (!match) {
            return { kind: 'none' };
        }

        if (parseInt(match[1], 10) > VERSION) {
            return { kind: 'newer' };
        }

        if (!match[3]) {
            return { kind: 'incomplete' };
        }

        return { kind: match[2] ? 'private' : 'public', data: match[3] };
    }

    function encode(doc) {
        return `s=${VERSION}.${toBase64Url(pack(doc))}`;
    }

    // null for anything that is not a complete public link
    function decode(fragment) {
        const share = inspect(fragment);

        if (share.kind !== 'public') {
            return null;
        }

        try {
            return unpack(fromBase64Url(share.data));
        } catch (e) {
            return null;
        }
    }

    // Spacing and case never lock a reader out: "Amber-Lantern quiet  fox" is "amber lantern quiet fox"
    function normaliseSeed(seed) {
        return (seed || '').toLowerCase().replace(/[\s-]+/g, ' ').trim();
    }

    async function deriveKey(seed, salt) {
        const material = await crypto.subtle.importKey('raw', strToU8(normaliseSeed(seed)), 'PBKDF2', false, ['deriveKey']);

        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
            material,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt'],
        );
    }

    async function encrypt(doc, seed) {
        const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
        const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
        const key = await deriveKey(seed, salt);
        const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, pack(doc)));
        const bytes = new Uint8Array(salt.length + nonce.length + cipher.length);

        bytes.set(salt, 0);
        bytes.set(nonce, salt.length);
        bytes.set(cipher, salt.length + nonce.length);

        return `s=${VERSION}e.${toBase64Url(bytes)}`;
    }

    // null for a wrong seed, a changed link, or anything that is not a complete private link
    async function decrypt(fragment, seed) {
        const share = inspect(fragment);

        if (share.kind !== 'private') {
            return null;
        }

        try {
            const bytes = fromBase64Url(share.data);
            const salt = bytes.subarray(0, SALT_BYTES);
            const nonce = bytes.subarray(SALT_BYTES, SALT_BYTES + NONCE_BYTES);
            const cipher = bytes.subarray(SALT_BYTES + NONCE_BYTES);
            const key = await deriveKey(seed, salt);

            return unpack(new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, cipher)));
        } catch (e) {
            return null;
        }
    }

    // An index below `count`, drawn without bias
    function randomIndex(count) {
        const limit = Math.floor(0x100000000 / count) * count;
        const draw = new Uint32Array(1);

        do {
            crypto.getRandomValues(draw);
        } while (draw[0] >= limit);

        return draw[0] % count;
    }

    let wordList = null;

    // The EFF large word list (7,772 words), fetched when a private link is first made
    async function loadWords() {
        if (!wordList) {
            const response = await fetch('/words.txt');

            if (!response.ok) {
                throw new Error(`words: ${response.status}`);
            }

            wordList = (await response.text()).split('\n').filter(Boolean);
        }

        return wordList;
    }

    // Four words from the list, 51 bits of entropy. Without the list (offline on a first
    // visit) ten letters and digits, about the same strength.
    async function suggestSeed(words) {
        try {
            const list = words || await loadWords();

            return Array.from({ length: SEED_WORDS }, () => list[randomIndex(list.length)]).join(' ');
        } catch (e) {
            const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';

            return Array.from({ length: 10 }, () => alphabet[randomIndex(alphabet.length)]).join('');
        }
    }

    // Any JSON as a fragment-safe string, and back (used by the move to the new address)
    function packJson(value) {
        return toBase64Url(deflateSync(strToU8(JSON.stringify(value)), { level: 9 }));
    }

    function unpackJson(text) {
        try {
            return JSON.parse(strFromU8(inflateSync(fromBase64Url(text))));
        } catch (e) {
            return null;
        }
    }

    return {
        inspect,
        encode,
        packJson,
        unpackJson,
        decode,
        encrypt,
        decrypt,
        normaliseSeed,
        suggestSeed,
    };
})();

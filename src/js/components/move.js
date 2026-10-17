import backup from './backup';
import share from './share';
import { MOVE_FROM, MOVE_TO } from '../enums';
import keys from '../keys';

// The move to the new address.
//
// On the old address, before anything is painted: pack every document and
// setting and forward to <new>/#m=1.<pack>.<theme>. The fragment never reaches a
// server. On the new address, at startup: take the pack from the fragment, add
// it, clean the address. A pack too big for an address (about 3 MB of text,
// near what a browser stores at all) is left to "export everything".
export default (function () {
    const PACK_LIMIT = 1500000;   // characters; browsers take addresses this long, messengers do not matter here

    function isLocal() {
        return /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    }

    // Where to move to: the switch in enums.js, or ?move-to=<origin> while testing on localhost
    function target() {
        const override = isLocal() ? new URLSearchParams(location.search).get('move-to') : null;

        return override || MOVE_TO;
    }

    function isOldAddress() {
        return MOVE_FROM.includes(location.hostname) || (isLocal() && !!new URLSearchParams(location.search).get('move-to'));
    }

    function isNewAddress() {
        const to = target();

        return !!to && location.origin === to;
    }

    // Old address: forwards and returns 'forwarded'; returns 'too-big' when the pack
    // does not fit in an address; false when the move does not apply here
    function start() {
        const to = target();

        if (!to || !isOldAddress() || location.origin === to) {
            return false;
        }

        const pack = share.packJson(backup.collect());

        if (pack.length > PACK_LIMIT) {
            return 'too-big';
        }

        // the theme rides along so the new page paints in it at once (index.html reads it);
        // base64url has no dots, so it is easy to tell apart
        const theme = /^scheme-[a-z-]+$/.test(localStorage[keys.SCHEME] || '') ? `.${localStorage[keys.SCHEME]}` : '';

        location.replace(`${to}/#m=1.${pack}${theme}`);
        return 'forwarded';
    }

    // New address, at startup: a pack in the fragment. Returns what happened, or null.
    function receiveFromHash() {
        const match = /^#m=(\d+)\.([A-Za-z0-9_-]+)(?:\.scheme-[a-z-]+)?$/.exec(location.hash);

        if (!match) {
            return null;
        }

        const data = share.unpackJson(match[2]);
        const result = data ? backup.apply(data) : null;

        history.replaceState(null, '', `${location.pathname}${location.search}#moved`);

        return result || { added: 0, skipped: 0, failed: true };
    }

    return {
        target,
        isNewAddress,
        start,
        receiveFromHash,
    };
})();

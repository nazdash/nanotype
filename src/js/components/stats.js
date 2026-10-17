// What leaves the browser about a visit, and nothing else (principle 15): a page
// view, a page leave, and one event per command run (with how it was reached:
// column, key, menu, slash…). Each carries the page's address (never its
// fragment: a share link carries the text there), where the visit came from (the
// referring domain and any utm_ words in the address), the browser, system and
// device class as coarse words (Chrome 131, Mac OS X, Desktop), a session id
// (one per tab, renewed after 30 idle minutes) and a random visitor id made once
// in this browser (localStorage['visitor']) so a returning person is counted
// once; the page view says whether the browser is new and which settings it
// lives with. No name, no cookie, no screen size, no IP kept, and never a word
// of the text. PostHog's web analytics (channel, referring domain, device,
// bounce, duration) is built from exactly these properties, which its SDK would
// send; without the SDK they are set here (2026-10-09).
//
// Sent to PostHog over plain HTTP through /stats on our own domain (vercel.json):
// no SDK, no autocapture, no session recording, nothing stored by the tracker.
import keys from '../keys';

export default (function () {
    const KEY = 'phc_rmfYc4473aukmSuoEdAknyVnmrSWpABxKDqjT5jWFJsY';   // the project's public key
    const ENDPOINT = '/stats/i/v0/e';   // no trailing slash: Vercel's rewrite does not match one

    let visitor = null;

    function init() {
        let first = false;

        try {
            if (!localStorage[keys.VISITOR]) {
                localStorage[keys.VISITOR] = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
                first = true;
            }

            visitor = localStorage[keys.VISITOR];
        } catch (e) {
            visitor = null;   // no storage: this visit is counted on its own
        }

        // the page view carries whether this browser is new, and the settings it
        // lives with: fixed words only, read from storage before the page is built
        send('$pageview', { first_visit: first, ...settings() });

        // the leave gives a visit its length; keepalive lets it go with the page
        window.addEventListener('pagehide', () => send('$pageleave'));
    }

    // The settings as the words the commands show: theme, font, size, and the
    // switches. Nothing a person typed.
    function settings() {
        const read = (key) => { try { return localStorage[key]; } catch (e) { return undefined; } };
        const names = {
            'scheme-system': 'system', 'scheme-light': 'light', 'scheme-dark-and-white': 'dark',
            'scheme-dark-and-green': 'green', 'scheme-solarized': 'sand', 'scheme-night': 'night',
            'font-scheme-monospace': 'mono', 'font-scheme-sans-serif': 'sans', 'font-scheme-serif': 'serif',
            15: 's', 18: 'm', 22: 'l',
        };
        const on = key => read(key) === 'true';

        return {
            theme: names[read('scheme')] || 'system',
            font: names[read('font-scheme')] || 'mono',
            size: names[read('font-size')] || 's',
            sound: read('sound') || 'off',
            lines: on('line-numbers'),
            focus: on('focus-mode'),
            markdown: on('preview'),
            contents: on('contents'),
            spellcheck: read('spellcheck') !== 'false',
            ripples: read('ripples') !== 'false',
            counter: read('counter') || 'detailed',
        };
    }

    // A session: one id per tab, as PostHog expects it (a UUIDv7: the time in its
    // first 48 bits, so the service can place the events), renewed after thirty
    // idle minutes. sessionStorage, so it ends with the tab.
    const SESSION_IDLE = 30 * 60 * 1000;

    function session() {
        const now = Date.now();
        let saved = null;

        try {
            saved = JSON.parse(sessionStorage.session || 'null');
        } catch (e) {
            saved = null;
        }

        if (!saved || now - saved.last > SESSION_IDLE) {
            saved = { id: uuid7(now), last: now };
        }

        saved.last = now;

        try {
            sessionStorage.session = JSON.stringify(saved);
        } catch (e) {
            // no storage: the id lives for this page
        }

        return saved.id;
    }

    function uuid7(time) {
        const bytes = crypto.getRandomValues(new Uint8Array(16));

        for (let i = 5; i >= 0; i--) {
            bytes[i] = time % 256;
            time = Math.floor(time / 256);
        }

        bytes[6] = (bytes[6] & 0x0f) | 0x70;   // version 7
        bytes[8] = (bytes[8] & 0x3f) | 0x80;   // variant

        const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    // Where the visit came from: the referring site's domain and the utm_ words in
    // the address (a campaign's own labels, nothing about the person)
    function source() {
        const from = {};
        const params = new URLSearchParams(location.search);

        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((name) => {
            if (params.get(name)) {
                from[name] = params.get(name).slice(0, 100);
            }
        });

        try {
            from.$referring_domain = document.referrer ? new URL(document.referrer).hostname : '$direct';
        } catch (e) {
            from.$referring_domain = '$direct';
        }

        return from;
    }

    // The browser, system and device class as coarse words, the way PostHog's own
    // SDK names them; from the user agent, which the request carries anyway
    function client() {
        const ua = navigator.userAgent || '';
        const data = navigator.userAgentData;
        const match = (re) => (re.exec(ua) || [])[1];
        let browser = 'Other';
        let version = '';

        if (/Edg\//.test(ua)) { browser = 'Microsoft Edge'; version = match(/Edg\/(\d+)/); }
        else if (/OPR\//.test(ua)) { browser = 'Opera'; version = match(/OPR\/(\d+)/); }
        else if (/Firefox\//.test(ua)) { browser = 'Firefox'; version = match(/Firefox\/(\d+)/); }
        else if (/Chrome\//.test(ua)) { browser = 'Chrome'; version = match(/Chrome\/(\d+)/); }
        else if (/Safari\//.test(ua)) { browser = 'Safari'; version = match(/Version\/(\d+)/); }

        let os = 'Other';

        if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
        else if (/Android/.test(ua)) os = 'Android';
        else if (/CrOS/.test(ua)) os = 'Chrome OS';
        else if (/Mac OS X|Macintosh/.test(ua)) os = 'Mac OS X';
        else if (/Windows/.test(ua)) os = 'Windows';
        else if (/Linux/.test(ua)) os = 'Linux';

        const mobile = data ? data.mobile : /Mobi|Android|iPhone/.test(ua);
        const tablet = /iPad|Tablet/.test(ua) || (os === 'Mac OS X' && navigator.maxTouchPoints > 1);

        return {
            $browser: browser,
            $browser_version: version ? parseInt(version, 10) : undefined,
            $os: os,
            $device_type: tablet ? 'Tablet' : mobile ? 'Mobile' : 'Desktop',
        };
    }

    // Only from a site: the dev server (localhost) and a local file send nothing
    function enabled() {
        return /^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    }

    function send(event, data) {
        if (!enabled()) {
            return;
        }

        const body = JSON.stringify({
            api_key: KEY,
            event,
            distinct_id: visitor || `visit-${Date.now().toString(36)}`,
            timestamp: new Date().toISOString(),
            properties: {
                ...(data || {}),
                $current_url: location.origin + location.pathname,   // never the #fragment
                $host: location.host,
                $pathname: location.pathname,
                $referrer: document.referrer || '$direct',
                ...source(),
                ...client(),
                $session_id: session(),
                $lib: 'nanotype',
                $process_person_profile: false,   // events only; no person record is built
            },
        });

        try {
            // text/plain needs no preflight; keepalive lets a last event leave with the page
            fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
        } catch (e) {
            // blocked or offline: nothing to do
        }
    }

    return {
        init,
        track: send,
    };
})();

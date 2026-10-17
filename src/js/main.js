import stats from './components/stats';

import editor from  './components/editor';
import ui from './components/ui';
import move from './components/move';

editor.init();

// On the old address: hand the documents to the new one and forward, before
// anything is painted (see move.js). Otherwise, the app.
const moved = move.start();

// The page is hidden until the interface is up. Whatever goes wrong on the way,
// the text must still appear, with a way out
if (moved !== 'forwarded') {
    try {
        ui.init();
    } catch (error) {
        console.error('Nanotype: could not start the interface', error);
        document.body.style.display = 'block';
        document.querySelector('.status-message').textContent = 'something went wrong while starting · the text is safe; reload, or use "export everything"';
    }
}

if (moved === 'too-big') {
    ui.setStatus(`too much text to move automatically: use "export everything" and import the file at ${move.target().replace(/^https?:\/\//, '')}`, 30000);
}

// Visits and commands are counted (see stats.js for exactly what is sent)
stats.init();

// Ask the browser to keep this site's storage out of eviction (Chrome, Firefox)
if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
}

// Work offline: cache the app shell (see public/sw.js)
if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}

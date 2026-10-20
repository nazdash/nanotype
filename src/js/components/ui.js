import markdown from './markdown';
import util from './utils';
import editor from './editor';
import documents from './documents';
import share from './share';
import backup from './backup';
import move from './move';
import folder from './folder';
import stats from './stats';
import counter from './counter';
import keySounds from './key-sounds';
import contents from './contents';
import ripples from './ripples';
import files from './files';
import sharing from './sharing';
import lines from './lines';
import caret from './caret';
import picker from './picker';
import docs from './docs';
import paste from './paste';
import tidy from './tidy';
import tables from './tables';
import app from './app';
import keys from '../keys';

// ui functions
export default (function () {
    // Base elements
    let body, article, showcase, commandsElement, statusElement, statusTitle, statusMessage, statistic, overlay, descriptionModal, helpModal;

    // Commands (the column of words on the right)
    let screenSizeElement, colorLayoutElement, changeFontElement, sfxMuteElement, markdownElement;

    // A document opened from a share link (the link carries the text). While it is on
    // screen the editor is read-only and the reader's own documents are untouched.
    let shared = { active: false, locked: false, fragment: '', doc: null };

    // Keys are shown the way the platform writes them
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

    // A device without hover: a phone or a tablet. The interface is driven by taps,
    // and the on-screen keyboard takes part of the screen.
    const isTouch = window.matchMedia && window.matchMedia('(hover: none)').matches;

    // Colour schemes, in the order the theme command cycles through them. "system"
    // is light or dark by the operating system's setting, and follows it.
    let colorSchemes = [
        "scheme-system",
        "scheme-light",
        "scheme-dark-and-white",
        "scheme-dark-and-green",
        "scheme-solarized",
        "scheme-night",
    ];
    const SYSTEM_SCHEME = "scheme-system";
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

    // Font schemes for the text, in the order the font command cycles through them.
    // The interface itself is always in Nanotype Mono.
    let fontSchemes = [
        "font-scheme-monospace",    // Nanotype Mono
        "font-scheme-sans-serif",   // Inter
        "font-scheme-serif",        // Literata
    ];

    // Names shown in the commands and the menu
    let fontNames = {
        "font-scheme-monospace": "mono",
        "font-scheme-sans-serif": "sans",
        "font-scheme-serif": "serif",
    };

    let schemeNames = {
        "scheme-system": "system",
        "scheme-light": "light",
        "scheme-dark-and-white": "dark",
        "scheme-dark-and-green": "green",
        "scheme-solarized": "sand",
        "scheme-night": "night",
    };

    // Status line: a hint for what is under the pointer, or a short message
    let statusHint = '';
    let statusNotice = '';
    let statusSticky = '';     // shown while nothing else is, e.g. for a locked shared document
    let statusTimer = null;
    let statusSaid;

    // The three text sizes; the page scales with them (see --scale in the stylesheet)
    const FONT_SIZES = [15, 18, 22];            // px
    const FONT_SIZE_NAMES = ['s', 'm', 'l'];    // how they are shown
    let fontSize = FONT_SIZES[0];
    let fontSizeElement;


    // Default color scheme
    let colorScheme = colorSchemes[0];

    // Default font scheme
    let fontScheme = fontSchemes[0];


    // Is markdown mode on
    let isMarkdownModeOn = false;
    let previewTimer = null;


    // The ripples behind an empty page (ripples.js), on unless turned off
    let isRipplesOn = true;

    // The browser's spelling check, on unless turned off
    let isSpellingOn = true;

    // Contents: see contents.js; its panel is hidden with the rest of the interface while typing
    let contentsPanel;


    function init() {
        // what the other parts of the interface share (see app.js)
        Object.assign(app, {
            shared, picker: picker.state,
            is: { touch: isTouch, markdown: () => isMarkdownModeOn, focus: caret.focusOn, lines: caret.linesOn },
            setStatus, setValue, saveState, loadState, track, openPicker: picker.open, closePicker: picker.close,
            openModal, removeOverlay, bindChoices, selectChoice, visibleChoices,
            counterUpdate: () => counter.update(), counterSchedule: () => counter.schedule(), contentsSchedule: () => contents.schedule(),
            fontScheme: () => fontScheme, formatKeys, countWords: (text) => counter.count(text),
            sticky: (message) => { statusSticky = message; renderStatus(); },
            sayBeside, updateEmptyState, wrapLooseLines: caret.wrapLooseLines, applySharedLook, caretRect: caret.rect,
            filterPicker: picker.filter, setPickerIndex: picker.setIndex, scrollPickerSelection: picker.scrollSelection,
            via: (how) => { via = how; },
            look: () => ({ font: fontNames[fontScheme], size: fontSizeName(fontSize) }),
            scale: () => scale(fontSize),
            caretMoved: () => { caret.wake(); caret.schedule(); if (caret.focusOn()) caret.scheduleFocus(); },
        });

        bindElements();

        // Documents moved from the old address arrive in the fragment (see move.js)
        try {
            sharing.openMovedFromHash();
        } catch (error) {
            console.error('Nanotype: could not take the moved documents', error);
        }

        // A share link shows its document instead of the reader's own
        try {
            sharing.openSharedFromHash();
        } catch (error) {
            console.error('Nanotype: could not open the shared document', error);
        }

        // Whatever goes wrong while restoring saved settings, the page must still appear
        try {
            if (util.supportsHtmlStorage()) {
                loadState();

                window.addEventListener('storage', loadState, false);
            } else {
                applyFontLook();
            }
        } catch (error) {
            console.error('Nanotype: could not restore saved settings', error);
        }

        document.addEventListener('fullscreenchange', () => {
            screenSizeElement.classList.toggle('active', isFullscreen());
            setValue(screenSizeElement, isFullscreen() ? 'on' : 'off');
        });

        // Write every key hint the way this platform shows it
        document.querySelectorAll('kbd[data-keys]').forEach((element) => {
            element.textContent = formatKeys(element.dataset.keys);
        });

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('touchstart', onMouseMove, { passive: true });
        document.addEventListener('mouseover', onHintOver);


        // A share link opened from the page itself only changes the #fragment;
        // start over so it is treated like any other visit
        window.addEventListener('hashchange', () => {
            if (shared.active || share.inspect(location.hash).kind !== 'none' || /^#m=/.test(location.hash)) {
                location.reload();
            }
        });

        editor.onDocumentChange(onDocumentChange);
        editor.onStorageFull(onStorageFull);
        editor.onSave(folder.schedule);
        folder.init();

        updateEmptyState();
        counter.update();
        saveState();

        body.style.display = 'block';

        // the ripples measure the page, so they start once the page is shown
        ripples.init();
        ripples.set(body.classList.contains('is-empty') && isRipplesOn);

        sharing.afterStart();
    }

    function loadState() {
        const colorSchemeFromStorage = localStorage['scheme'];
        const fontSchemeFromStorage = localStorage['font-scheme'];
        const soundFromStorage = localStorage['sound'] || (localStorage[keys.LEGACY_MUTED] === 'false' ? 'typewriter' : localStorage[keys.LEGACY_MUTED] === 'true' ? 'off' : '');
        const focusFromStorage = localStorage['focus-mode'];
        const previewFromStorage = localStorage['preview'];
        const linesFromStorage = localStorage['line-numbers'];
        const contentsFromStorage = localStorage['contents'];
        const spellingFromStorage = localStorage['spellcheck'];
        const ripplesFromStorage = localStorage['ripples'];
        const counterFromStorage = localStorage['counter'];

        try {
            caret.setPrefs(JSON.parse(localStorage['caret-prefs'] || '{}'));
        } catch (e) {
            caret.setPrefs({});
        }
        const sizeFromStorage = parseInt(localStorage['font-size'], 10);

        // a size saved by an earlier version maps to the nearest of the three
        const size = isNaN(sizeFromStorage) ? FONT_SIZES[0] : FONT_SIZES.reduce((nearest, candidate) => (
            Math.abs(candidate - sizeFromStorage) < Math.abs(nearest - sizeFromStorage) ? candidate : nearest
        ));

        if (size !== fontSize) {
            setFontSize(size);
        }


        if (keySounds.SETS.includes(soundFromStorage)) {
            keySounds.set(soundFromStorage);
        }

        setColorScheme(colorSchemes.includes(colorSchemeFromStorage) ? colorSchemeFromStorage : colorSchemes[0]);

        setFontScheme(fontSchemes.includes(fontSchemeFromStorage) ? fontSchemeFromStorage : fontSchemes[0]);

        // a shared document is shown as it is; the reader's modes return after import
        if (focusFromStorage === 'true' && !caret.focusOn() && !shared.active) {
            caret.setFocus(true);
        }

        if ((previewFromStorage === 'true') !== isMarkdownModeOn && !shared.active) {
            setMarkdownMode(previewFromStorage === 'true');
        }

        if ((linesFromStorage === 'true') !== caret.linesOn()) {
            caret.setLines(linesFromStorage === 'true');
        }

        if ((contentsFromStorage === 'true') !== contents.on()) {
            contents.set(contentsFromStorage === 'true');
        }

        if (spellingFromStorage === 'false' && isSpellingOn) {
            setSpelling(false);
        }

        if (ripplesFromStorage === 'false' && isRipplesOn) {
            setRipples(false);
        }

        if (counterFromStorage && counterFromStorage !== counter.mode()) {
            counter.setMode(counterFromStorage);
            counter.update();
        }

        applyFontLook();

        if (shared.active) {
            applySharedLook();
        }

        updateLabels();
    }

    function saveState() {
        // nothing of the reader's is changed while a shared document is shown
        if (util.supportsHtmlStorage() && !shared.active) {
            localStorage['sound'] = keySounds.current();
            localStorage.removeItem(keys.LEGACY_MUTED);
            localStorage['scheme'] = colorScheme;
            localStorage['font-scheme'] = fontScheme;
            localStorage['focus-mode'] = caret.focusOn();
            localStorage['preview'] = isMarkdownModeOn;
            localStorage['line-numbers'] = caret.linesOn();
            localStorage['contents'] = contents.on();
            localStorage['spellcheck'] = isSpellingOn;
            localStorage['ripples'] = isRipplesOn;
            localStorage['caret-prefs'] = JSON.stringify(caret.prefs());
            localStorage.removeItem(keys.LEGACY_CARET);
            localStorage['counter'] = counter.mode();
            localStorage['font-size'] = fontSize;
        }
    }

    function bindElements() {
        // Body element for light/dark styles
        body = document.body;
        app.body = body;

        commandsElement = document.querySelector('.commands');
        statusElement = document.querySelector('.status');
        statusTitle = statusElement.querySelector('.status-title');
        statusMessage = statusElement.querySelector('.status-message');
        statusSaid = statusElement.querySelector('.status-said');

        // Command: all commands (the word in the status line)
        document.querySelector('.palette').onclick = onPaletteClick;

        // Command: theme
        colorLayoutElement = document.querySelector('.color-flip');
        colorLayoutElement.onclick = onColorLayoutClick;
        systemDark.addEventListener('change', onSystemSchemeChange);

        // Command: font
        changeFontElement = document.querySelector('.font-flip');
        changeFontElement.onclick = onChangeFontClick;

        // Command: text size
        fontSizeElement = document.querySelector('.font-size');
        fontSizeElement.onclick = onFontSizeClick;

        // Command: full screen
        screenSizeElement = document.querySelector('.fullscreen');
        screenSizeElement.onclick = onScreenSizeClick;

        // iPhones cannot put a page in fullscreen
        if (!document.fullscreenEnabled) {
            screenSizeElement.style.display = 'none';
        }

        // Contents: in the menu, and a column word in the shared view
        contents.init();
        contentsPanel = contents.panel();
        contentsPanel.addEventListener('click', () => { via = 'contents'; }, true);

        // Command: typewriter sounds
        sfxMuteElement = document.querySelector('.sfx-mute');
        keySounds.init({ element: sfxMuteElement, setValue, setStatus, saveState, track });

        // Command: markdown preview
        markdownElement = document.querySelector('.markdown');
        markdownElement.onclick = onMarkdownClick;

        // Command: documents
        docs.init();

        // Command: new document
        document.querySelector('.new-doc').onclick = docs.create;


        picker.init();

        // Overlay when dialogs are open
        overlay = document.querySelector('.overlay');
        app.overlay = overlay;

        // How a command was reached, for the counts (see track)
        commandsElement.addEventListener('click', () => { via = 'column'; }, true);
        statusElement.addEventListener('click', () => { via = 'status'; }, true);
        overlay.addEventListener('click', () => { via = 'dialog'; }, true);
        overlay.addEventListener('keydown', () => { via = 'dialog'; }, true);
        overlay.onclick = onOverlayClick;

        article = document.querySelector('article.content');
        app.article = article;
        caret.init();
        article.onkeydown = onArticleKeyDown;
        article.onkeyup = onArticleKeyUp;
        article.addEventListener('input', onArticleInput);
        article.addEventListener('mousedown', onArticleModClick);
        article.addEventListener('scroll', onArticleScroll);
        paste.init();

        showcase = document.querySelector('.markdown-showcase');
        app.showcase = showcase;
        showcase.addEventListener('click', () => { via = 'preview'; }, true);
        showcase.addEventListener('click', onShowcaseClick);

        document.onkeydown = onDocumentKeyDown;

        descriptionModal = overlay.querySelector('.description');
        helpModal = overlay.querySelector('.help-modal');
        files.init();
        sharing.init();

        statistic = document.querySelector('.statistic');
        counter.init({ article, statusTitle, statistic, documentsElement: docs.element(), saveState, track, sharedTitle: () => (shared.active ? { title: shared.doc ? 'shared document' : shared.locked ? 'locked link' : 'shared link', counts: !!shared.doc } : null) });

        document.querySelector('.about').onclick = () => openModal(descriptionModal);
        document.querySelector('.status .help').onclick = () => openModal(helpModal);
    }

    /*********************************************
     * LABELS, KEYS AND THE STATUS LINE
     *********************************************/

    // "Mod Shift O" -> "⌘⇧O" on a Mac, "Ctrl+Shift+O" elsewhere
    function formatKeys(keys) {
        const parts = keys.split(' ');

        if (isMac) {
            return parts.map(part => ({ Mod: '⌘', Shift: '⇧', Alt: '⌥' }[part] || part)).join('');
        }

        return parts.map(part => (part === 'Mod' ? 'Ctrl' : part)).join('+');
    }

    // The value shown after a command's name, e.g. "font mono"
    function setValue(button, value) {
        button.querySelector('b').textContent = value;
    }

    function updateLabels() {
        setValue(changeFontElement, fontNames[fontScheme]);
        setValue(fontSizeElement, fontSizeName(fontSize));
        setValue(caret.elements().cursor, caret.isBlock() ? 'block' : 'thin');
        setValue(colorLayoutElement, schemeNames[colorScheme]);
        setValue(sfxMuteElement, keySounds.current());
        setValue(caret.elements().lines, caret.linesOn() ? 'on' : 'off');
        setValue(caret.elements().focus, caret.focusOn() ? 'on' : 'off');
        setValue(markdownElement, isMarkdownModeOn ? 'on' : 'off');
        setValue(screenSizeElement, isFullscreen() ? 'on' : 'off');
    }

    // What the pointer is over: its description and its key
    function onHintOver(event) {
        // a tap is not a hover: on a phone the hint would stay after the tap
        if (isTouch) {
            return;
        }

        const target = event.target.closest ? event.target.closest('[data-hint]') : null;
        const keys = target && target.dataset.keys ? `  ${formatKeys(target.dataset.keys)}` : '';

        statusHint = target ? target.dataset.hint + keys : '';
        renderStatus();
    }

    // A short message, e.g. after a command run from the keyboard
    function setStatus(text, duration) {
        statusNotice = text;
        statusElement.classList.remove('hidden');
        clearTimeout(statusTimer);
        statusTimer = setTimeout(() => {
            statusNotice = '';
            renderStatus();
        }, duration || 1600);
        renderStatus();
    }

    // A refusal is said where the person is looking: to the left of the command
    // they used, for a moment, as well as in the status line
    function sayBeside(button, text) {
        let note = button.querySelector('.note');

        if (!note) {
            note = document.createElement('span');
            note.className = 'note';
            button.prepend(note);
        }

        note.textContent = text;
        note.classList.add('visible');
        commandsElement.classList.remove('hidden');
        clearTimeout(button.noteTimer);
        button.noteTimer = setTimeout(() => note.classList.remove('visible'), 700);   // a glance; the status line keeps it longer
        setStatus(text, 2500);
    }

    // The hidden copy is what a screen reader says: answers and warnings, not hover hints
    function renderStatus() {
        statusMessage.textContent = statusNotice || statusHint || statusSticky;
        statusSaid.textContent = statusNotice || statusSticky;
    }

    // The caret follows the font: block with mono, thin with sans and serif,
    // unless a choice was made by hand for that font
    function applyFontLook() {
        const caretPref = caret.prefs()[fontScheme];

        caret.setBlock(typeof caretPref === 'boolean' ? caretPref : fontScheme === 'font-scheme-monospace');
    }

    // One event per command run (see stats.js for what goes with it), with how the
    // command was reached: the column, a key, the menu, the slash list, a dialog,
    // the status line, the preview, the contents list. Set by the handlers below.
    let via = '';

    function track(name, data) {
        stats.track(name, via ? { ...(data || {}), via } : data);
    }

    // The interface hides while typing and returns when the pointer moves.
    // Browsers also fire mousemove when the page scrolls under a still pointer
    // (focus mode scrolls on every line), so only a real move counts.
    let lastPointer = null;

    function onMouseMove(event) {
        if (event.type === 'mousemove') {
            const at = `${event.screenX},${event.screenY}`;

            if (at === lastPointer) {
                return;
            }

            lastPointer = at;
        }

        commandsElement.classList.remove('hidden');
        statusElement.classList.remove('hidden');
        contentsPanel.classList.remove('hidden');
    }

    function onMarkdownClick() {
        if (shared.active) {
            return;   // a shared document is rendered until it is imported
        }

        setMarkdownMode(!isMarkdownModeOn);
        saveState();
        setStatus(`markdown ${isMarkdownModeOn ? 'on' : 'off'}`);
        track('markdown', { on: isMarkdownModeOn });
    }

    // Markdown mode: the editor and a live preview side by side
    function setMarkdownMode(on) {
        isMarkdownModeOn = on;
        markdownElement.classList.toggle('active', on);
        setValue(markdownElement, on ? 'on' : 'off');
        body.classList.toggle('markdown-mode', on);

        if (on) {
            renderPreview();
        } else {
            showcase.innerHTML = '';
        }

        caret.schedule();

        if (caret.focusOn()) {
            caret.scheduleFocus();
        }
    }

    // An empty preview says what it is, in the welcome block's voice, with the one
    // line of markdown a first-timer needs; gone with the first character typed
    const EMPTY_PREVIEW = '<div class="preview-welcome"><p>Here your text is rendered as you write it.</p>'
        + '<p><code># heading</code>, <code>**bold**</code>, <code>- list</code>, <code>[link](url)</code>.</p></div>';

    function renderPreview() {
        const text = files.getEditorPlainText();

        previewTimer = null;
        showcase.innerHTML = text.trim() ? markdown.render(text) : EMPTY_PREVIEW;
        syncPreviewScroll();
    }

    // "copy" on a code block in the preview: the code as plain text to the clipboard;
    // a task's box ticks the task
    async function onShowcaseClick(event) {
        const checkbox = event.target.closest('.task-list-item-checkbox');

        if (checkbox) {
            event.preventDefault();   // the text decides what the box shows, on the next render

            if (!shared.active) {
                lines.toggleTaskFromPreview(checkbox);
            }

            return;
        }

        const button = event.target.closest('.copy');

        if (!button) {
            return;
        }

        const result = await util.copyText(button.parentNode.querySelector('pre').textContent);

        button.textContent = result;
        setTimeout(() => { button.textContent = 'copy'; }, 1200);
        setStatus(result === 'copied' ? 'copied' : 'could not copy');
        track('copy-code');
    }

    function schedulePreviewRender() {
        if (!isMarkdownModeOn) {
            return;
        }

        clearTimeout(previewTimer);
        previewTimer = setTimeout(renderPreview, 150);
    }

    // Keep the preview roughly at the same relative position as the editor
    function syncPreviewScroll() {
        if (!isMarkdownModeOn) {
            return;
        }

        const editorRange = article.scrollHeight - article.clientHeight;
        const previewRange = showcase.scrollHeight - showcase.clientHeight;

        if (editorRange > 0 && previewRange > 0) {
            showcase.scrollTop = article.scrollTop / editorRange * previewRange;
        }
    }

    function onArticleScroll() {
        syncPreviewScroll();
        caret.schedule();
    }

    function onPrintClick() {
        track('print');
        window.print();
    }

    function isFullscreen() {
        return !!document.fullscreenElement;
    }

    function onScreenSizeClick() {
        (isFullscreen() ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});
    }

    // The page carries the class of a real scheme; "system" resolves to light or dark
    function setColorScheme(scheme) {
        const shown = scheme === SYSTEM_SCHEME ? (systemDark.matches ? 'scheme-dark-and-white' : 'scheme-light') : scheme;

        colorSchemes.forEach((name) => body.classList.remove(name));
        colorScheme = scheme;
        body.classList.add(shown);
        document.documentElement.className = shown;   // the first paint reads it from here (index.html)
        setValue(colorLayoutElement, schemeNames[colorScheme]);
    }

    // The operating system switched between light and dark
    function onSystemSchemeChange() {
        if (colorScheme === SYSTEM_SCHEME) {
            setColorScheme(colorScheme);
        }
    }

    function changeColorScheme(scheme) {
        setColorScheme(scheme);
        saveState();
        setStatus(`theme ${schemeNames[colorScheme]}`);
        track('theme', { scheme: colorScheme });
    }

    function onColorLayoutClick() {
        changeColorScheme(colorSchemes[(colorSchemes.indexOf(colorScheme) + 1) % colorSchemes.length]);
    }

    function setFontScheme(scheme) {
        fontSchemes.forEach((name) => body.classList.remove(name));
        fontScheme = scheme;
        body.classList.add(fontScheme);
        setValue(changeFontElement, fontNames[fontScheme]);
    }

    function changeFontScheme(scheme) {
        setFontScheme(scheme);
        applyFontLook();
        saveState();
        caret.schedule();
        setStatus(`font ${fontNames[fontScheme]}`);
        track('font', { scheme: fontScheme });
    }

    function onChangeFontClick() {
        changeFontScheme(fontSchemes[(fontSchemes.indexOf(fontScheme) + 1) % fontSchemes.length]);
    }

    // The size scales the page, not only the text: the column keeps its measure in
    // characters and the interface words follow (--scale, and a class for the
    // breakpoints, which cannot read a variable)
    function setFontSize(size) {
        fontSize = size;
        body.style.setProperty('--editor-size', `${size}px`);
        body.style.setProperty('--scale', String(scale(size)));
        FONT_SIZE_NAMES.forEach(name => body.classList.toggle(`size-${name}`, name === fontSizeName(size)));
        setValue(fontSizeElement, fontSizeName(size));
        caret.schedule();

        if (caret.focusOn()) {
            caret.scheduleFocus();
        }
    }

    function fontSizeName(size) {
        return FONT_SIZE_NAMES[FONT_SIZES.indexOf(size)];
    }

    // Tidy: the selection through the browser's own edit (its undo knows), or the
    // whole text at once with the big paste's undo step. The status line says what
    // was done, or that there was nothing to do.
    function onTidyClick() {
        if (shared.active) {
            return;
        }

        const selected = selectedPlainText();
        const whole = !selected;
        const text = whole ? files.getEditorPlainText() : selected;
        const result = tidy.tidy(text);
        const done = tidy.describe(result.counts);

        if (!done || result.text === text) {
            setStatus('nothing to tidy', 2000);
            return;
        }

        if (whole) {
            paste.replaceAll(result.text);
        } else {
            article.focus();
            util.replaceText(result.text);
        }

        setStatus(`tidied: ${done} · ${formatKeys('Mod Z')} undoes`, 4000);
        track('tidy', { whole });
    }

    // The selection as the editor's plain text (Selection.toString() collapses runs
    // of spaces, the very thing tidy looks for)
    function selectedPlainText() {
        const selection = window.getSelection();

        if (!selection.rangeCount || selection.isCollapsed || !article.contains(selection.anchorNode)) {
            return '';
        }

        const box = document.createElement('div');

        box.appendChild(selection.getRangeAt(0).cloneContents());

        return util.articleToText(box);
    }

    function onFontSizeClick() {
        changeFontSize(FONT_SIZES[(FONT_SIZES.indexOf(fontSize) + 1) % FONT_SIZES.length]);
    }

    function scale(size) {
        return size / FONT_SIZES[0];
    }

    // The keys step one size up or down; past the ends they are left to the
    // browser, whose zoom carries on from there (false: not handled)
    function stepFontSize(step) {
        const index = FONT_SIZES.indexOf(fontSize) + step;

        if (index < 0 || index >= FONT_SIZES.length) {
            return false;
        }

        changeFontSize(FONT_SIZES[index]);
    }

    function changeFontSize(size) {
        if (size !== fontSize) {
            setFontSize(size);
            saveState();
            setStatus(`size ${fontSizeName(size)}`);
            track('font-size', { size: fontSizeName(size) });
        }
    }

    /*********************************************
     * DIALOGS
     *********************************************/

    function openModal(modal) {
        caret.keep();

        Array.from(overlay.querySelectorAll('.modal')).forEach((element) => {
            element.style.display = element === modal ? 'block' : 'none';
        });

        picker.close(false);
        overlay.style.display = "block";
        modal.focus();
    }

    function closeModal() {
        removeOverlay();
        sharing.onUnlockDismissed();

        if (!isTouch) {
            caret.focusArticle();
        }
    }

    function onOverlayClick(event) {
        if (event.target.className === "overlay") {
            closeModal();
        }
    }

    function removeOverlay() {
        overlay.style.display = "none";
        Array.from(overlay.querySelectorAll('.modal')).forEach((element) => {
            element.style.display = "none";
        });
    }

    // Rows of choices inside a dialog, driven like the picker: arrows, Enter, the pointer
    function bindChoices(modal, onChoose) {
        modal.addEventListener('keydown', (event) => {
            const rows = visibleChoices(modal);
            const index = rows.findIndex(row => row.classList.contains('selected'));

            if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && rows.length > 1) {
                event.preventDefault();
                selectChoice(modal, rows[(index + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length]);
            } else if (event.key === 'Enter' && rows.length) {
                event.preventDefault();
                onChoose(rows[Math.max(0, index)].dataset.choice);
            }
        });

        modal.addEventListener('click', (event) => {
            const row = event.target.closest('.choice');

            if (row) {
                onChoose(row.dataset.choice);
            }
        });

        modal.addEventListener('mousemove', (event) => {
            const row = event.target.closest('.choice');

            if (row && !isTouch) {
                selectChoice(modal, row);
            }
        });
    }

    function visibleChoices(modal) {
        return Array.from(modal.querySelectorAll('.choice')).filter(row => row.offsetParent !== null);
    }

    function selectChoice(modal, row) {
        modal.querySelectorAll('.choice').forEach(element => element.classList.toggle('selected', element === row));
    }

    /*********************************************
     * SPELLING
     * The browser's own check (its dictionaries, its suggestions on right-click),
     * switched on or off on the editor
     *********************************************/

    function setRipples(on) {
        isRipplesOn = on;
        updateEmptyState();
    }

    function onRipplesClick() {
        setRipples(!isRipplesOn);
        saveState();
        setStatus(`ripples ${isRipplesOn ? 'on' : 'off'}`);
        track('ripples', { on: isRipplesOn });
    }

    function onSpellingClick() {
        setSpelling(!isSpellingOn);
        saveState();
        setStatus(`spellcheck ${isSpellingOn ? 'on' : 'off'}`);
        track('spellcheck', { on: isSpellingOn });
    }

    function setSpelling(on) {
        isSpellingOn = on;
        article.spellcheck = on;
    }

    // A shared view's look, for that view only: the writer's font and size from the
    // link, the system's theme, the text rendered. Nothing is saved while shared;
    // the reader's own settings return on import
    function applySharedLook() {
        const doc = shared.doc;
        const font = doc && fontSchemes.find(scheme => fontNames[scheme] === doc.font);
        const size = doc && FONT_SIZES[FONT_SIZE_NAMES.indexOf(doc.size)];

        if (font) {
            setFontScheme(font);
            applyFontLook();
        }

        if (size) {
            setFontSize(size);
        }

        setColorScheme(SYSTEM_SCHEME);

        if (doc && !isMarkdownModeOn) {
            setMarkdownMode(true);
        }
    }

    /*********************************************
     * COMMAND MENU
     *********************************************/

    function onPaletteClick() {
        if (picker.state.kind === 'commands') {
            picker.close();
            return;
        }

        picker.open({
            kind: 'commands',
            items: commandItems(),
            placeholder: isTouch ? 'filter' : 'type a command, or a word from a document',
            foot: '↑↓ select · enter run · esc close',
        });
        track('menu');
    }

    // The menu: every command in groups named for their subject, in the order of
    // the Keys dialog: all the documents, this document, the editor (how the page
    // is shown while you write), appearance (how the app is), help. Settings with
    // values list each value, the current one marked; the key cycles, so it is
    // shown on the current one only.
    function commandItems() {
        const key = isTouch ? () => '' : formatKeys;
        const items = [];
        const add = (group, label, run, more) => items.push({ group, label, run, ...more });

        if (shared.active) {
            if (shared.doc) {
                add('document', 'import to edit', sharing.importShared, { hint: 'a copy of this document among your own', key: key('Mod O') });
                add('document', 'export as .md', () => files.saveText('md'), { hint: 'download', key: key('Mod S') });
                add('document', 'export as .txt', () => files.saveText('txt'), { hint: 'download' });
                add('document', 'print or save as PDF…', onPrintClick, { key: key('Mod P') });
            } else if (shared.locked) {
                add('document', 'unlock with the seed word…', sharing.openUnlock);
            }
        } else {
            add('documents', 'documents…', docs.toggle, { key: key('Mod Shift O') });
            add('documents', 'new document', docs.create, { key: key('Mod Shift D') });
            add('documents', 'today', docs.today, { hint: 'the document for today, opened or started' });
            add('documents', 'import a file (.txt, .md)…', files.openFilePicker, { key: key('Mod O') });
            add('documents', 'import a backup (.json)…', files.openFilePicker);
            add('documents', 'export everything as .md (zip)', files.exportEverythingZip, { hint: 'download every document as a file' });
            add('documents', 'export everything as .json', files.exportEverything, { hint: 'download every document and setting' });
            add('documents', 'backup…', files.openBackup, { hint: 'a copy that outlives this browser' });

            if (documents.trash().length) {
                items.push({ group: 'documents', ...docs.trashItem() });
            }

            add('document', 'share as a link…', sharing.onShareClick, { key: key('Mod Shift S') });
            add('document', 'export as .md', () => files.saveText('md'), { hint: 'download', key: key('Mod S') });
            add('document', 'export as .txt', () => files.saveText('txt'), { hint: 'download' });
            add('document', 'print or save as PDF…', onPrintClick, { key: key('Mod P') });
            add('document', 'tidy', onTidyClick, { hint: 'join broken lines, one blank line, no tabs; the selection, or all', key: key('Mod Alt T') });

            // offered only when a save had shrunk this document and the copy was kept
            if (documents.current() && documents.hasPrevious(documents.current().id)) {
                add('document', 'restore previous version', restorePrevious, { hint: 'the text before it shrank' });
            }

            if (contents.canShowPanel()) {
                add('document', 'go to heading…', contents.openPicker, { hint: 'contents: type part of a heading, enter' });
            }
        }

        // the editor: how this page is shown while you write
        if (shared.active) {
            if (contents.canShowPanel()) {
                add('editor', `contents ${contents.on() ? 'off' : 'on'}`, contents.toggle, { hint: 'the headings, in the margin', key: key('Mod Shift L') });
            } else {
                add('editor', 'contents…', contents.openPicker, { hint: 'the headings, click one to go there', key: key('Mod Shift L') });
            }
        } else {
            add('editor', `lines ${caret.linesOn() ? 'off' : 'on'}`, caret.toggleLines, { hint: 'line numbers', key: key('Mod Shift U') });
            add('editor', `focus ${caret.focusOn() ? 'off' : 'on'}`, caret.toggleFocus, { hint: 'focus mode', key: key('Mod D') });

            // the list in the margin is a view; the picker is a jump (type part of a heading)
            if (contents.canShowPanel()) {
                add('editor', `contents ${contents.on() ? 'off' : 'on'}`, contents.toggle, { hint: 'the headings, in the margin', key: key('Mod Shift L') });
            } else {
                add('editor', 'contents…', contents.openPicker, { hint: 'the headings, click one to go there', key: key('Mod Shift L') });
            }

            add('editor', `markdown ${isMarkdownModeOn ? 'off' : 'on'}`, onMarkdownClick, { hint: 'markdown preview', key: key('Mod Shift M') });
            add('editor', `spellcheck ${isSpellingOn ? 'off' : 'on'}`, onSpellingClick, { key: key('Mod Shift ;') });

            if (document.fullscreenEnabled) {
                add('editor', `fullscreen ${isFullscreen() ? 'off' : 'on'}`, onScreenSizeClick, { key: key('Mod Shift F') });
            }
        }

        // the same order as the column: the page first (size, theme), then the text
        FONT_SIZES.forEach((size) => {
            add('appearance', `size ${fontSizeName(size)}`, () => changeFontSize(size), { current: size === fontSize, key: size === fontSize ? `${key('Mod +')} ${key('Mod -')}`.trim() : '' });
        });
        colorSchemes.forEach((scheme) => {
            add('appearance', `theme ${schemeNames[scheme]}`, () => changeColorScheme(scheme), { current: scheme === colorScheme, key: scheme === colorScheme ? key('Mod Shift E') : '' });
        });
        fontSchemes.forEach((scheme) => {
            add('appearance', `font ${fontNames[scheme]}`, () => changeFontScheme(scheme), { current: scheme === fontScheme, key: scheme === fontScheme ? key('Mod Shift A') : '' });
        });

        if (!shared.active) {
            add('appearance', `cursor ${caret.isBlock() ? 'thin' : 'block'}`, caret.toggleCursor, { key: key('Mod Shift K') });
            keySounds.SETS.forEach((name) => {
                add('appearance', `sound ${name}`, () => keySounds.change(name), { current: name === keySounds.current(), key: name === keySounds.current() ? key('Mod Shift Y') : '' });
            });
            add('appearance', `ripples ${isRipplesOn ? 'off' : 'on'}`, onRipplesClick, { hint: 'the animation on an empty page' });
        }

        if (!isTouch) {
            add('help', 'keys', () => openModal(helpModal), { hint: 'keyboard shortcuts' });
        }

        add('help', 'about', () => openModal(descriptionModal));

        // every document, with its text to search in; read once, while the menu is open
        if (!shared.active) {
            documents.list().forEach((doc) => {
                add('open', documents.titleOf(doc), () => docs.open(doc.id), { text: documents.searchText(doc) });
            });
        }

        return items;
    }


    // The welcome block shows while the document has no text and at most one (empty) line.
    // The text itself is left alone: after deleting everything the browser keeps
    // a <br> or an empty <div> in place, and that is fine.
    function updateEmptyState() {
        const isEmpty = article.childNodes.length <= 1 && util.articleToText(article).trim() === '';

        body.classList.toggle('is-empty', isEmpty);
        ripples.set(isEmpty && isRipplesOn);
    }

    // Storage refused a save: the text is on screen but not kept. Say so until it is.
    function onStorageFull(full) {
        statusSticky = full ? 'storage is full: this text is not being saved · export it, or delete old documents' : '';
        renderStatus();
        track('storage-full', { full });
    }

    function restorePrevious() {
        if (editor.restorePrevious()) {
            setStatus('previous version restored · run again to go back', 4000);
            track('restore-previous');
        }
    }

    // Called by the editor after it shows a different document
    function onDocumentChange() {
        updateEmptyState();

        if (caret.focusOn() || caret.linesOn()) {
            caret.wrapLooseLines();
        }

        if (isMarkdownModeOn) {
            renderPreview();
        }

        caret.schedule();
        counter.update();
        contents.schedule();
    }

    /*********************************************
     * KEYBOARD
     *********************************************/

    function onArticleInput() {
        if (caret.focusOn() || caret.linesOn()) {
            caret.wrapLooseLines();
        }

        if (caret.focusOn()) {
            caret.scheduleFocus();
        } else if (caret.linesOn()) {
            caret.scheduleLines();
        }

        updateEmptyState();
        caret.wake();
        caret.schedule();
        schedulePreviewRender();
        counter.schedule();
        contents.schedule();
        lines.slash.update();
    }

    function onArticleKeyUp() {
        if (caret.focusOn()) {
            caret.scheduleFocus();
        } else if (caret.linesOn()) {
            caret.scheduleLines();
        }

        caret.wake();
        caret.schedule();
    }

    function onArticleKeyDown(event) {
        // Nothing but the text while typing
        commandsElement.classList.add('hidden');
        statusElement.classList.add('hidden');
        contentsPanel.classList.add('hidden');

        // a shortcut is not typing: no key sound for it (the command may play its own)
        if (!event.metaKey && !event.ctrlKey) {
            keySounds.play(event.keyCode);
        }

        if (picker.state.kind === 'slash' && lines.slash.onKeyDown(event)) {
            return;
        }

        if (event.metaKey || event.ctrlKey || event.altKey) {
            via = 'key';
        }

        switch (event.keyCode) {
            case 13: {  // Enter: continue a list, quote or task item; ⌘Enter ticks a task, ⌘⇧Enter makes one
                if ((event.metaKey || event.ctrlKey) && !event.altKey) {
                    if (event.shiftKey ? lines.toggleTaskLine() : lines.toggleTaskAtCaret()) {
                        event.preventDefault();
                    }
                } else if (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
                    lines.continueListOnEnter(event);
                }
                break;
            }

            case 9: {  // Tab: the next cell in a table, else indent
                if (!tables.onTab(event.shiftKey)) {
                    lines.indent(event.shiftKey);
                }

                event.preventDefault();
                return false;
            }

            case 38:    // ⌥↑ / ⌥↓: move the line
            case 40: {
                if (event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey && lines.moveLine(event.keyCode === 38 ? -1 : 1)) {
                    event.preventDefault();
                }
                break;
            }

            default:
        }

        // ⌘] / ⌘[: indent and outdent the line (or the selected lines), as in every editor
        if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && (event.code === 'BracketRight' || event.code === 'BracketLeft')) {
            event.preventDefault();
            event.stopPropagation();

            if (util.getSelectedText().length > 0 || event.code === 'BracketLeft') {
                lines.indent(event.code === 'BracketLeft');
            } else if (lines.caretBlock()) {
                lines.editLineStart(lines.caretBlock(), 0, 0, '\xa0'.repeat(4));
            }

            return;
        }

        // ⌘⌥1–6: a heading of that level; ⌘⌥0: plain text (the usual keys)
        if ((event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey && /^Digit[0-6]$/.test(event.code)) {
            event.preventDefault();
            event.stopPropagation();
            lines.setHeading(parseInt(event.code.slice(5), 10));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey && event.code === 'KeyZ' && paste.onUndoKey(true)) {
            event.preventDefault();
            return;
        }

        // Markdown marks around the selection. Matched on the physical key (event.code),
        // which does not change with ⌥ or the keyboard layout.
        if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
            const selectedText = util.getSelectedText();

            switch (event.code) {
                case 'KeyB':
                    event.preventDefault();
                    util.replaceText(`**${selectedText}**`);
                    break;

                case 'KeyI':
                    event.preventDefault();
                    util.replaceText(`*${selectedText}*`);
                    break;

                case 'KeyE':
                    event.preventDefault();
                    util.replaceText('`' + selectedText + '`');
                    break;

                case 'KeyU':   // the browser would underline; there is no underline here
                    event.preventDefault();
                    break;

                case 'KeyZ':   // a big paste has its own undo step (see onUndoKey)
                    if (paste.onUndoKey(false)) {
                        event.preventDefault();
                    }
                    break;

                // ⌘K on selected text makes a link, as in every writing app; with nothing
                // selected it opens the menu (document handler)
                case 'KeyK':
                    if (selectedText) {
                        event.preventDefault();
                        event.stopPropagation();
                        util.replaceText(`[${selectedText}](https://)`);
                        lines.placeCaretInLink();
                    }
                    break;

                default:
            }
        }
    }

    // ⌘-click on an address in the text opens it in a new tab (the preview's links
    // are clickable; in the text they are characters, so the key says "follow")
    function onArticleModClick(event) {
        if (!(event.metaKey || event.ctrlKey) || event.button !== 0) {
            return;
        }

        const point = document.caretPositionFromPoint
            ? (p => p && { node: p.offsetNode, offset: p.offset })(document.caretPositionFromPoint(event.clientX, event.clientY))
            : (r => r && { node: r.startContainer, offset: r.startOffset })(document.caretRangeFromPoint(event.clientX, event.clientY));

        if (!point || point.node.nodeType !== 3) {
            return;
        }

        const text = point.node.data;
        const url = /https?:\/\/[^\s<>()\[\]"']+/g;
        let match = url.exec(text);

        while (match) {
            if (point.offset >= match.index && point.offset <= match.index + match[0].length) {
                event.preventDefault();
                window.open(match[0].replace(/[.,;:!?]+$/, ''), '_blank', 'noopener');
                track('open-link');
                return;
            }

            match = url.exec(text);
        }
    }

    // Shortcuts that work anywhere on the page. Matched on the physical key
    // (event.code) and always prevented, so the browser never also runs its own.
    // The browser keeps ⌘N, ⌘T, ⌘W, ⌘⇧N and ⌘Q for itself; nothing can take them.
    function onDocumentKeyDown(event) {
        const mod = event.ctrlKey || event.metaKey;

        if (!mod) {
            if (event.key === 'F11') {
                event.preventDefault();
                onScreenSizeClick();
            } else if (event.key === 'Escape') {
                // closes whatever is open; with nothing open it puts the cursor away
                if (picker.state.kind) {
                    picker.close();
                } else if (overlay.style.display === 'block') {
                    closeModal();
                } else {
                    article.blur();
                    window.getSelection().removeAllRanges();
                }
            }

            return;
        }

        const combo = `${event.shiftKey ? 'Shift ' : ''}${event.altKey ? 'Alt ' : ''}${event.code}`;
        const run = {
            // ⌘ + / − / 0: text size instead of page zoom
            'Equal': () => stepFontSize(1),
            'NumpadAdd': () => stepFontSize(1),
            'Minus': () => stepFontSize(-1),
            'NumpadSubtract': () => stepFontSize(-1),
            'Digit0': () => changeFontSize(FONT_SIZES[0]),
            'Shift Equal': () => stepFontSize(1),
            'Shift Minus': () => stepFontSize(-1),

            'KeyK': onPaletteClick,                                     // the menu (a link when text is selected: article handler)
            'KeyO': () => (shared.active ? sharing.importShared() : files.openFilePicker()),
            'KeyS': () => files.saveText('md'),
            'KeyP': onPrintClick,
            'KeyD': caret.toggleFocus,                                       // focus
            'Alt KeyN': docs.create,                                    // ⌘N belongs to the browser; the usual web answer, but Chrome takes it
            'Shift KeyD': docs.create,                                  // new Document: the one that works everywhere

            'Shift KeyO': docs.toggle,
            'Shift KeyS': sharing.onShareClick,
            'Shift KeyP': onPrintClick,
            'Shift KeyM': onMarkdownClick,
            'Shift KeyF': onScreenSizeClick,
            'Shift KeyU': caret.toggleLines,
            'Shift KeyL': contents.toggle,
            'Shift Semicolon': onSpellingClick,
            'Shift KeyA': onChangeFontClick,
            'Shift KeyK': caret.toggleCursor,
            'Shift KeyE': onColorLayoutClick,
            'Shift KeyY': keySounds.next,
            'Alt KeyT': onTidyClick,   // the selection, or all; ⌘K with a selection makes a link, so tidy has its own key
        }[combo];

        if (run) {
            via = 'key';

            if (run() !== false) {
                event.preventDefault();
            }
        }
    }

    return {
        init,
        setStatus,
    }
})();

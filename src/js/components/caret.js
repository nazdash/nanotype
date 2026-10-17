import app from './app';
import util from './utils';
import tables from './tables';

// The caret and the lines around it: the block cursor, focus mode, line numbers,
// and the one rule they share, that every line of the text is a block (wrapLooseLines).
export default (function () {
    // Caret: thin (native) or a terminal-style block drawn by us.
    // Block is the default with the mono font; a choice made by hand is kept per font.
    let caretPrefs = {};
    let isBlockCaret = false;
    let blockCaret;
    let caretFrame = null;

    // The cursor fades out after a pause and returns on the next key, click or caret move
    const CARET_IDLE_MS = 10000;
    let caretIdleTimer = null;

    // Focus mode: dim other paragraphs, keep the caret line centred
    let isFocusModeOn = false;
    const FOCUS_LINE = 0.38;    // how far down the screen the caret line is held (0.5 = middle)
    let focusFrame = null;
    let currentParagraph = null;

    // Line numbers beside the text, as in a code editor
    let isLineNumbersOn = false;
    let lineNumbersElement, focusElement, caretElement;
    let lineFrame = null;

    // The height that is actually visible: on a phone, the part above the keyboard
    function visibleHeight() {
        return app.is.touch && window.visualViewport ? window.visualViewport.height : window.innerHeight;
    }

    // Make the page end at the on-screen keyboard, so the browser scrolls the caret
    // into the part of the page that can be seen
    function fitToVisibleHeight() {
        document.documentElement.style.setProperty('--app-height', `${Math.round(visibleHeight())}px`);
        window.scrollTo(0, 0);
        scheduleCaretUpdate();

        if (isFocusModeOn) {
            scheduleFocusUpdate();
        }
    }

    // LINE NUMBERS: drawn by CSS counters on the paragraphs (see the stylesheet);
    // the line with the caret is marked .current while the text has the focus

    function onLineNumbersClick() {
        setLineNumbers(!isLineNumbersOn);
        app.saveState();
        app.setStatus(`lines ${isLineNumbersOn ? 'on' : 'off'}`);
        app.track('line-numbers', { on: isLineNumbersOn });
    }

    function setLineNumbers(on) {
        isLineNumbersOn = on;
        app.body.classList.toggle('line-numbers', on);
        lineNumbersElement.classList.toggle('active', on);
        app.setValue(lineNumbersElement, on ? 'on' : 'off');

        // every line has to be an element to carry a number
        if (on) {
            wrapLooseLines();
            markCurrentParagraph();
        } else if (!isFocusModeOn) {
            app.article.querySelectorAll('.current').forEach(element => element.classList.remove('current'));
        }

        scheduleCaretUpdate();
    }

    // Keep the highlighted number on the line with the caret
    function scheduleLineUpdate() {
        if (lineFrame) {
            cancelAnimationFrame(lineFrame);
        }

        lineFrame = requestAnimationFrame(() => {
            lineFrame = null;
            markCurrentParagraph();
        });
    }

    // FOCUS MODE: the paragraph with the caret in full, the rest dimmed, the
    // caret line held above the middle of the screen

    function onFocusClick() {
        if (app.shared.active) {
            return;
        }

        setFocusMode(!isFocusModeOn);
        app.saveState();
        app.setStatus(`focus ${isFocusModeOn ? 'on' : 'off'}`);
        app.track('focus', { on: isFocusModeOn });
    }

    function setFocusMode(on) {
        isFocusModeOn = on;
        app.body.classList.toggle('focus-mode', on);
        focusElement.classList.toggle('active', on);
        app.setValue(focusElement, on ? 'on' : 'off');

        if (on) {
            wrapLooseLines();
            updateFocus();
        } else if (currentParagraph && !isLineNumbersOn) {
            currentParagraph.classList.remove('current');
            currentParagraph = null;
        }
    }

    function onSelectionChange() {
        wakeCaret();
        scheduleCaretUpdate();
        app.counterSchedule();
        tables.onCaretMoved();

        if (document.activeElement !== app.article) {
            return;
        }

        if (isFocusModeOn) {
            scheduleFocusUpdate();
        } else if (isLineNumbersOn) {
            scheduleLineUpdate();
        }
    }

    // BLOCK CARET: a terminal-style block drawn behind the character, following
    // the caret; it fades after a pause and wakes on the next key or click

    function onCaretClick() {
        setBlockCaret(!isBlockCaret);
        caretPrefs[app.fontScheme()] = isBlockCaret;
        app.saveState();
        app.setStatus(`cursor ${isBlockCaret ? 'block' : 'thin'}`);
        app.track('caret', { block: isBlockCaret });
    }

    // Show the cursor (block or thin) and start the countdown to fading it out again.
    // Scrolling and resizing only reposition the block; they do not wake it.
    function wakeCaret() {
        if (document.activeElement !== app.article) {
            return;
        }

        app.body.classList.remove('caret-idle');
        clearTimeout(caretIdleTimer);
        caretIdleTimer = setTimeout(() => app.body.classList.add('caret-idle'), CARET_IDLE_MS);
    }

    function setBlockCaret(on) {
        isBlockCaret = on;
        app.body.classList.toggle('caret-block', on);
        app.setValue(caretElement, on ? 'block' : 'thin');
        updateCaret();
    }

    function scheduleCaretUpdate() {
        if (!isBlockCaret) {
            return;
        }

        if (caretFrame) {
            cancelAnimationFrame(caretFrame);
        }

        caretFrame = requestAnimationFrame(updateCaret);
    }

    // Where the caret is on screen: { left, top, height }, or null.
    // The browser reports no box for a caret that is not inside text: on an empty
    // line, in an empty document, or right after a line break made with Shift+Enter.
    // Those cases are worked out from the nodes around the caret.
    function caretRect() {
        const selection = window.getSelection();

        if (!selection.rangeCount) {
            return null;
        }

        const range = selection.getRangeAt(0);

        // Only a caret inside the text has a position. At startup the selection
        // sits on the document itself, which has no box to measure.
        if (!app.article.contains(range.startContainer)) {
            return null;
        }

        const rect = range.getBoundingClientRect();

        if (rect.height > 0) {
            return { left: rect.left, top: rect.top, height: rect.height };
        }

        const lineHeight = parseFloat(getComputedStyle(app.article).lineHeight) || 20;
        const container = range.startContainer;
        const topLineOf = (element) => {
            const box = element.getBoundingClientRect();

            return { left: box.left, top: box.top, height: Math.min(box.height, lineHeight) || lineHeight };
        };

        // An empty text node: the line of its parent
        if (container.nodeType !== 1) {
            return topLineOf(container.parentNode);
        }

        const after = container.childNodes[range.startOffset];
        const before = container.childNodes[range.startOffset - 1];

        // Before an element (a <br> holding an empty line open, or a block): that element's line
        if (after && after.nodeType === 1) {
            const box = after.getBoundingClientRect();

            if (box.height > 0) {
                return { left: box.left, top: box.top, height: Math.min(box.height, lineHeight) };
            }
        }

        // Before text: the first character's position
        if (after && after.nodeType === 3 && after.length > 0) {
            const first = document.createRange();

            first.setStart(after, 0);
            first.setEnd(after, 1);

            const box = first.getBoundingClientRect();

            if (box.height > 0) {
                return { left: box.left, top: box.top, height: box.height };
            }
        }

        // After the last <br> of a block. A trailing <br> does not start a line of its
        // own (it only holds the line open), so the caret is on the <br>'s line.
        if (before && before.nodeName === 'BR') {
            const box = before.getBoundingClientRect();

            if (box.height > 0) {
                return { left: box.left, top: box.top, height: Math.min(box.height, lineHeight) };
            }
        }

        // After a block: the end of that block's last line
        if (before && before.nodeType === 1 && before.nodeName !== 'BR') {
            const contents = document.createRange();

            contents.selectNodeContents(before);

            const boxes = contents.getClientRects();
            const last = boxes[boxes.length - 1];

            if (last && last.height > 0) {
                return { left: last.right, top: last.top, height: last.height };
            }

            return topLineOf(before);
        }

        // After text: the end of its last character
        if (before && before.nodeType === 3 && before.length > 0) {
            const last = document.createRange();

            last.setStart(before, before.length - 1);
            last.setEnd(before, before.length);

            const box = last.getBoundingClientRect();

            if (box.height > 0) {
                return { left: box.right, top: box.top, height: box.height };
            }
        }

        return topLineOf(container);
    }

    // Place the block at the caret
    function updateCaret() {
        caretFrame = null;

        const selection = window.getSelection();
        const show = isBlockCaret
            && document.activeElement === app.article
            && selection.rangeCount > 0
            && selection.isCollapsed;
        const rect = show ? caretRect() : null;

        if (!rect) {
            blockCaret.classList.remove('visible');
            return;
        }

        // In markdown mode the editor scrolls on its own; hide the block once the line leaves it
        const articleRect = app.article.getBoundingClientRect();

        if (rect.top < articleRect.top - 1 || rect.top + rect.height > articleRect.bottom + 1) {
            blockCaret.classList.remove('visible');
            return;
        }

        const parentRect = blockCaret.parentNode.getBoundingClientRect();

        blockCaret.style.left = `${rect.left - parentRect.left}px`;
        blockCaret.style.top = `${rect.top - parentRect.top}px`;
        blockCaret.style.height = `${rect.height}px`;

        // Restart the blink so the block is solid right after it moves
        blockCaret.style.animation = 'none';
        void blockCaret.offsetWidth;
        blockCaret.style.animation = '';
        blockCaret.classList.add('visible');
    }

    // A click on the empty page around the text puts the caret in the text:
    // at the start when the click is above it, at the end otherwise.
    // In focus mode the text box is only as tall as its lines, so most of the page is
    // "around"; so is the preview's empty space and its welcome text (not the rendered
    // text, whose links, boxes and copy words are its own).
    function onBlankMouseDown(event) {
        const target = event.target;
        const isBlank = target === app.body || target === document.documentElement || target.tagName === 'SECTION'
            || target === app.showcase || (target.closest && target.closest('.preview-welcome'));

        if (!isBlank || event.button !== 0 || app.shared.active) {
            return;
        }

        event.preventDefault();
        app.article.focus();
        placeCaretAtEdge(event.clientY < app.article.getBoundingClientRect().top);
        wakeCaret();
        scheduleCaretUpdate();

        if (isFocusModeOn) {
            scheduleFocusUpdate();
        }
    }

    // Put the caret at the very start or the very end of the text. It goes inside the
    // first or last line (not between blocks, and not after a <br> that only holds a
    // line open), which is where the next typed character will land.
    function placeCaretAtEdge(atStart) {
        const range = document.createRange();
        const selection = window.getSelection();
        let node = app.article;

        while (node.nodeType === 1 && node.childNodes.length) {
            const child = atStart ? node.firstChild : node.lastChild;

            if (child.nodeName === 'BR') {
                break;
            }

            node = child;
        }

        if (node.nodeType === 3) {
            range.setStart(node, atStart ? 0 : node.length);
        } else if (atStart || !node.lastChild) {
            range.setStart(node, 0);
        } else {
            range.setStartBefore(node.lastChild);
        }

        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    // Typing does not always fire selectionchange, so input and keyup call this too
    function scheduleFocusUpdate() {
        if (focusFrame) {
            cancelAnimationFrame(focusFrame);
        }

        focusFrame = requestAnimationFrame(updateFocus);
    }

    // Mark the paragraph that holds the caret with the class "current".
    // Focus mode keeps it bright; line numbers highlight its number.
    function markCurrentParagraph() {
        const selection = window.getSelection();

        if (!selection.rangeCount || !app.article.contains(selection.anchorNode)) {
            return false;
        }

        let node = selection.anchorNode;

        // Caret directly inside the app.article: take the child it points at
        if (node === app.article) {
            node = app.article.childNodes[Math.min(selection.anchorOffset, app.article.childNodes.length - 1)];
        }

        while (node && node.parentNode !== app.article) {
            node = node.parentNode;
        }

        currentParagraph = node && node.nodeType === 1 ? node : null;

        // Chrome copies the class onto the new line when Enter splits a paragraph,
        // so clear every marked element rather than only the one we remember
        app.article.querySelectorAll('.current').forEach((element) => {
            if (element !== currentParagraph) {
                element.classList.remove('current');
            }
        });

        if (currentParagraph) {
            currentParagraph.classList.add('current');
        }

        return true;
    }

    function updateFocus() {
        focusFrame = null;

        if (!markCurrentParagraph()) {
            return;
        }

        const rect = caretRect();

        if (rect) {
            // The line sits a little above the middle, where the eye rests
            const scroller = app.is.markdown() ? app.article : app.body;
            const scrollerRect = scroller.getBoundingClientRect();
            const target = app.is.markdown()
                ? scrollerRect.top + scrollerRect.height * FOCUS_LINE
                : visibleHeight() * FOCUS_LINE;
            const delta = rect.top + rect.height / 2 - target;

            if (Math.abs(delta) > 2) {
                scroller.scrollTop += delta;
            }
        }
    }

    // The first line of a contenteditable is a bare text node; wrap such
    // lines in <div>s so every paragraph can be dimmed individually.
    function wrapLooseLines() {
        const selection = window.getSelection();
        const anchor = selection.rangeCount ? selection.anchorNode : null;
        const offset = selection.rangeCount ? selection.anchorOffset : 0;
        let wrapper = null;
        let changed = false;

        Array.from(app.article.childNodes).forEach((node) => {
            const isBlock = node.nodeType === 1 && /^(DIV|P|H[1-6]|UL|OL|PRE|BLOCKQUOTE)$/.test(node.nodeName);

            if (isBlock) {
                wrapper = null;
                return;
            }

            if (!wrapper) {
                wrapper = document.createElement('div');
                app.article.insertBefore(wrapper, node);
            }

            wrapper.appendChild(node);
            changed = true;

            if (node.nodeName === 'BR') {
                wrapper = null;
            }
        });

        if (changed && anchor && anchor !== app.article && app.article.contains(anchor)) {
            const range = document.createRange();

            range.setStart(anchor, Math.min(offset, anchor.length || anchor.childNodes.length));
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    // A dialog or the picker takes the keys (and the screen reader), not the text
    // behind it. The caret's place is kept, so closing returns to it rather than
    // to the start of the text.
    let kept = null;

    function keep() {
        const selection = window.getSelection();

        if (selection.rangeCount && app.article.contains(selection.anchorNode)) {
            kept = selection.getRangeAt(0).cloneRange();
        }
    }

    function focusArticle() {
        app.article.focus();

        if (kept) {
            if (app.article.contains(kept.startContainer)) {
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(kept);
            }

            kept = null;
        }
    }

    function forget() {
        kept = null;
    }

    function init() {
        lineNumbersElement = document.querySelector('.lines');
        lineNumbersElement.onclick = onLineNumbersClick;
        focusElement = document.querySelector('.focus');
        focusElement.onclick = onFocusClick;
        caretElement = document.querySelector('.caret');
        caretElement.onclick = onCaretClick;
        blockCaret = document.querySelector('.block-caret');
        app.body.addEventListener('scroll', scheduleCaretUpdate);
        window.addEventListener('resize', scheduleCaretUpdate);
        document.addEventListener('mousedown', onBlankMouseDown);
        document.addEventListener('selectionchange', onSelectionChange);
        app.article.addEventListener('focus', wakeCaret);
        app.article.addEventListener('mousedown', wakeCaret);
        app.article.addEventListener('focus', scheduleCaretUpdate);
        app.article.addEventListener('blur', scheduleCaretUpdate);

        // On a phone the keyboard takes part of the screen; the page ends above it
        if (app.is.touch && window.visualViewport) {
            window.visualViewport.addEventListener('resize', fitToVisibleHeight);
            fitToVisibleHeight();
        }
    }

    return {
        init,
        linesOn: () => isLineNumbersOn,
        focusOn: () => isFocusModeOn,
        isBlock: () => isBlockCaret,
        prefs: () => caretPrefs,
        setPrefs: (value) => { caretPrefs = value; },
        toggleLines: onLineNumbersClick,
        setLines: setLineNumbers,
        scheduleLines: scheduleLineUpdate,
        toggleFocus: onFocusClick,
        setFocus: setFocusMode,
        scheduleFocus: scheduleFocusUpdate,
        toggleCursor: onCaretClick,
        setBlock: setBlockCaret,
        wake: wakeCaret,
        schedule: scheduleCaretUpdate,
        rect: caretRect,
        placeAtEdge: placeCaretAtEdge,
        wrapLooseLines,
        keep,
        forget,
        focusArticle,
        elements: () => ({ lines: lineNumbersElement, focus: focusElement, cursor: caretElement }),
    };
})();

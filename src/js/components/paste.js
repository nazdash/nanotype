import app from './app';
import util from './utils';
import caret from './caret';
import lines from './lines';
import files from './files';

// Paste, drop, copy and cut: plain text in, plain text out. A big paste lands as
// blocks with its own undo step; a dropped text lands where it was dropped.
export default (function () {
    function init() {
        document.addEventListener('drop', onDrop);
        app.article.addEventListener('paste', onArticlePaste);
        app.article.addEventListener('copy', onArticleCopy);
        app.article.addEventListener('cut', onArticleCopy);
    }

    // Above this many characters a paste is built as DOM in one go: the browser's
    // own insertText takes half a second for 70k characters and grows from there
    // (insertHTML is fast but drops blank lines and merges blocks). The browser's
    // undo cannot see such a change, so the paste keeps its own: the document
    // before and after, restored on ⌘Z / ⌘⇧Z while the document matches.
    const BIG_PASTE = 2000;
    let pasteStep = null;   // { before, after, beforeText, afterText, caretBefore }

    // Text dragged in from another window lands as plain text where it was dropped
    function onDrop(event) {
        if (event.dataTransfer.files.length) {
            return;   // files are imported (files.js)
        }

        event.preventDefault();
        app.body.classList.remove('dragging');

        const text = event.dataTransfer.getData('text/plain');

        if (!text || app.shared.active) {
            return;
        }

        const range = document.caretRangeFromPoint
            ? document.caretRangeFromPoint(event.clientX, event.clientY)
            : null;

        app.article.focus();

        if (range && app.article.contains(range.startContainer)) {
            const selection = window.getSelection();

            selection.removeAllRanges();
            selection.addRange(range);
        }

        if (text.length > BIG_PASTE && text.includes('\n')) {
            pasteAsBlocks(text);
        } else {
            document.execCommand('insertText', false, text);
        }
    }

    // A web address alone, pasted over selected words, links them: [words](address),
    // a known pattern (and what ⌘K does)
    const ADDRESS = /^https?:\/\/\S+$/;

    function onArticlePaste(event) {
        const text = event.clipboardData.getData('text/plain');
        const selected = util.getSelectedText();

        event.preventDefault();

        if (selected && !selected.includes('\n') && ADDRESS.test(text.trim())) {
            document.execCommand('insertText', false, `[${selected}](${text.trim()})`);
            app.track('paste-link');
            return;
        }

        if (text.length <= BIG_PASTE || !text.includes('\n')) {
            document.execCommand('insertText', false, text);
            return;
        }

        const before = app.article.innerHTML;
        const beforeText = files.getEditorPlainText();
        const caretBefore = lines.caretPath();

        pasteAsBlocks(text);
        pasteStep = { before, after: app.article.innerHTML, beforeText, afterText: files.getEditorPlainText(), caretBefore };
        app.setStatus(`pasted ${app.countWords(text).words.toLocaleString()} words`, 2000);
    }


    // The whole text replaced at once (tidy), with the same undo step as a big
    // paste: the browser's undo cannot see a change made to the DOM directly
    function replaceAll(text) {
        const before = app.article.innerHTML;
        const beforeText = files.getEditorPlainText();
        const caretBefore = lines.caretPath();

        app.article.innerHTML = util.textToHtml(text);
        pasteStep = { before, after: app.article.innerHTML, beforeText, afterText: files.getEditorPlainText(), caretBefore };
        caret.placeAtEdge(true);
        app.article.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // ⌘Z / ⌘⇧Z: the big paste's own step, only while the document is exactly as it
    // was after (or before) the paste; otherwise the browser's undo runs as usual
    function onUndoKey(redo) {
        if (!pasteStep) {
            return false;
        }

        // compared as text: the browser may split or join text nodes along the way
        if (!redo && files.getEditorPlainText() === pasteStep.afterText) {
            app.article.innerHTML = pasteStep.before;
            lines.restoreCaret(pasteStep.caretBefore);
            app.article.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
        }

        if (redo && files.getEditorPlainText() === pasteStep.beforeText) {
            app.article.innerHTML = pasteStep.after;
            caret.placeAtEdge(false);
            app.article.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
        }

        return false;
    }

    // Lines after the first become blocks of their own after the caret's block;
    // whatever followed the caret in its block moves to the end of the last new one
    function pasteAsBlocks(text) {
        const selection = window.getSelection();

        if (!selection.rangeCount || !app.article.contains(selection.anchorNode)) {
            return;
        }

        caret.wrapLooseLines();
        selection.getRangeAt(0).deleteContents();

        const range = selection.getRangeAt(0);

        // a range "inside" a <br> cannot take text; put it before the <br>
        if (range.startContainer.nodeName === 'BR') {
            range.setStartBefore(range.startContainer);
            range.collapse(true);
        }

        let block = range.startContainer;

        // the range is between blocks or in an empty app.article: make a block to paste into
        if (block === app.article) {
            block = document.createElement('div');
            range.insertNode(block);
            range.setStart(block, 0);
            range.collapse(true);
        }

        while (block.parentNode !== app.article) {
            block = block.parentNode;
        }

        const rows = text.replace(/\r\n?/g, '\n').split('\n');
        const tail = document.createRange();

        tail.setStart(range.startContainer, range.startOffset);
        tail.setEnd(block, block.childNodes.length);

        const rest = tail.extractContents();

        range.insertNode(range.createContextualFragment(util.textToHtml(rows[0])));

        let last = block;

        rows.slice(1).forEach((line) => {
            const div = document.createElement('div');

            div.innerHTML = util.textToHtml(line) || '<br>';
            last.after(div);
            last = div;
        });

        const end = document.createRange();

        end.selectNodeContents(last);
        end.collapse(false);
        last.appendChild(rest);

        // a <br> that only held an empty block open is not needed once text is there
        [block, last].forEach((element) => {
            const br = element.lastChild;

            if (br && br.nodeName === 'BR' && br.previousSibling) {
                br.remove();
            }

            if (!element.hasChildNodes()) {
                element.innerHTML = '<br>';
            }
        });

        selection.removeAllRanges();
        selection.addRange(end);
        app.article.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Copy and cut put plain text on the clipboard, with the editor's non-breaking
    // spaces (how a run of spaces is kept) turned back into spaces
    function onArticleCopy(event) {
        event.preventDefault();
        event.clipboardData.setData('text/plain', window.getSelection().toString().replace(/\xa0/g, ' '));

        if (event.type === 'cut') {
            document.execCommand('delete');
        }
    }

    return {
        init,
        onUndoKey,
        replaceAll,
    };
})();

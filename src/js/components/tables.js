import app from './app';
import lines from './lines';

// Markdown tables, editable by hand: inside a table Tab moves to the next cell
// (⇧Tab the previous), a Tab in the last cell adds a row, and when the caret
// leaves the table its columns are lined up (every cell padded to its column's
// width, the separator row dashed to match), as table plugins do.
// A row is a line starting with "|"; a table is a run of such lines. Lining up
// is one edit, so ⌘Z takes it back; it never changes a cell's text.
export default (function () {
    const ROW = /^\s*\|/;

    let inside = null;   // the row block the caret was last in, if any

    function isRow(block) {
        return !!block && (block.nodeType === 1 || block.nodeType === 3) && block.parentNode === app.article && ROW.test(lines.lineText(block));
    }

    // The caret's block, read only: this runs on every selection change and must
    // not touch the text (a loose first line is wrapped by Tab, not here)
    function caretRow() {
        const selection = window.getSelection();
        let node = selection.rangeCount && app.article.contains(selection.anchorNode) ? selection.anchorNode : null;

        if (node === app.article) {
            node = app.article.childNodes[Math.max(0, selection.anchorOffset - 1)];
        }

        while (node && node.parentNode !== app.article) {
            node = node.parentNode;
        }

        return isRow(node) ? node : null;
    }

    // The run of rows around one row
    function tableAround(row) {
        const blocks = [row];

        for (let b = row.previousSibling; isRow(b); b = b.previousSibling) blocks.unshift(b);
        for (let b = row.nextSibling; isRow(b); b = b.nextSibling) blocks.push(b);

        return blocks;
    }

    // Called on every caret move: when the caret has left a table, that table is
    // lined up. Only while the text has the focus: with the focus elsewhere (the
    // menu's filter line) an edit would land there, and the table waits for the
    // caret to pass through again.
    function onCaretMoved() {
        if (document.activeElement !== app.article) {
            return;
        }

        const row = caretRow();

        // left the table it was in (which is still a table: an undo may have unmade it)
        if (inside && isRow(inside) && row !== inside && !(row && tableAround(row).includes(inside))) {
            lineUp(tableAround(inside));
        }

        inside = row;
    }

    function cells(text) {
        const trimmed = text.trim().replace(/^\|/, '').replace(/\|$/, '');

        return trimmed.split('|').map(cell => cell.trim());
    }

    function isSeparator(row) {
        return row.length > 0 && row.every(cell => /^:?-+:?$/.test(cell));
    }

    function lineUp(blocks) {
        const rows = blocks.map(block => cells(lines.lineText(block)));
        const width = Math.max(...rows.map(row => row.length));
        const widths = [];

        // a skeleton with nothing typed in it yet (/table) is left as it is; so is a
        // table whose first row is still loose text (Tab wraps it; rewriting a text
        // node is not a line edit)
        if (rows.every(row => isSeparator(row) || row.every(cell => cell === '')) || blocks.some(block => block.nodeType === 3)) {
            return;
        }

        for (let i = 0; i < width; i++) {
            widths[i] = Math.max(3, ...rows.filter(row => !isSeparator(row)).map(row => (row[i] || '').length));
        }

        const text = rows.map((row) => {
            const padded = [];

            for (let i = 0; i < width; i++) {
                const cell = row[i] || '';

                if (isSeparator(row)) {
                    const left = cell.startsWith(':');
                    const right = cell.endsWith(':');

                    padded.push((left ? ':' : '-') + '-'.repeat(Math.max(1, widths[i] - 2)) + (right ? ':' : '-'));
                } else {
                    padded.push(cell + ' '.repeat(widths[i] - cell.length));
                }
            }

            return `| ${padded.join(' | ')} |`;
        });

        if (text.every((line, i) => line === lines.lineText(blocks[i]))) {
            return;
        }

        const caret = lines.caretPath();

        lines.rewriteLines(blocks, (line, i) => text[i]);
        lines.restoreCaret(caret);
        app.track('table-lined-up', { rows: blocks.length });
    }

    // Tab inside a table: the next cell, or a new row after the last; ⇧Tab the previous
    function onTab(back) {
        app.wrapLooseLines();   // a table typed as the first line is loose text until now

        const row = caretRow();

        if (!row) {
            return false;
        }

        const text = lines.lineText(row);
        const selection = window.getSelection();
        const offset = lines.charOffset(row, selection.anchorNode, selection.anchorOffset);
        const pipes = [];

        for (let i = 0; i < text.length; i++) {
            if (text[i] === '|') pipes.push(i);
        }

        // the cell the caret is in: between pipe n and pipe n+1
        let cell = pipes.filter(p => p < offset).length - 1;

        if (back) {
            if (cell > 0) {
                placeInCell(row, text, pipes, cell - 1);
            } else if (isRow(row.previousSibling)) {
                const previous = row.previousSibling;
                const previousText = lines.lineText(previous);
                const previousPipes = [...previousText].map((c, i) => (c === '|' ? i : -1)).filter(i => i >= 0);

                placeInCell(previous, previousText, previousPipes, previousPipes.length - 2);
            }

            return true;
        }

        if (cell < pipes.length - 2) {
            placeInCell(row, text, pipes, cell + 1);
        } else if (isRow(row.nextSibling)) {
            const next = row.nextSibling;
            const nextText = lines.lineText(next);
            const nextPipes = [...nextText].map((c, i) => (c === '|' ? i : -1)).filter(i => i >= 0);

            placeInCell(next, nextText, nextPipes, 0);
        } else {
            // a new row with as many cells as this one, the caret in its first cell
            lines.placeInBlock(row, text.length);
            document.execCommand('insertText', false, '\n' + '| ' + ' | '.repeat(Math.max(0, pipes.length - 2)) + ' |');

            const added = row.nextSibling;

            if (isRow(added)) {
                lines.placeInBlock(added, 2);
            }
        }

        return true;
    }

    // The caret after the pipe that opens cell n (and its one space, if there)
    function placeInCell(row, text, pipes, n) {
        const start = pipes[n] + 1;

        lines.placeInBlock(row, text[start] === ' ' ? start + 1 : start);
    }

    return {
        onTab,
        onCaretMoved,
    };
})();

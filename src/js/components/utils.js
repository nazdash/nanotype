// Utility functions
export default (function() {

    function supportsHtmlStorage() {
        try {
            return 'localStorage' in window && window['localStorage'] !== null;
        } catch (e) {
            return false;
        }
    }

    // A file to the person's downloads: the browser's own link with a download name
    function download(blob, name) {
        const link = document.createElement('a');

        link.href = URL.createObjectURL(blob);
        link.download = name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }

    function getSelectedText() {
        if (window.getSelection) {
            return window.getSelection().toString();
        }

        return '';
    }

    function replaceText(text) {
        document.execCommand('delete', false);
        document.execCommand('insertText', false, text);
    }

    // Remove up to `indent` leading spaces (regular or non-breaking) from a line
    function trimTabs(text, indent = 4) {
        let i = 0;

        while (i < indent && (text[i] === '\xa0' || text[i] === ' ')) {
            i++;
        }

        return text.substring(i);
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Plain text -> the HTML shape the contenteditable article produces:
    // first line bare, every following line in a <div>, empty lines as <div><br></div>
    function textToHtml(text) {
        const lines = text.replace(/\r\n?/g, '\n').split('\n');

        return lines
            .map((line, index) => {
                const html = escapeHtml(line)
                    .replace(/\t/g, ' '.repeat(4))
                    .replace(/^ +/, (spaces) => '\xa0'.repeat(spaces.length))  // leading spaces would collapse
                    .replace(/ {2}/g, ' \xa0');

                if (index === 0) {
                    return html;
                }

                return `<div>${html || '<br>'}</div>`;
            })
            .join('');
    }

    // Stored HTML with anything but lines in it (a <u> from the browser's own ⌘U,
    // tags from an older version) is rebuilt from its text: lines only
    function plainHtml(html) {
        return /<(?!\/?(div|br|p)\b)/i.test(html) ? textToHtml(htmlToText(html)) : html;
    }

    // Article DOM -> plain text, one line per block. innerText would give
    // two newlines for every empty <div><br></div> line.
    function articleToText(element) {
        const lines = [];
        let inline = null;

        const blockText = (block) => {
            let text = '';

            block.childNodes.forEach((child) => {
                if (child.nodeName === 'BR') {
                    text += '\n';
                } else if (child.nodeType === 1 && /^(DIV|P)$/.test(child.nodeName)) {
                    text += '\n' + blockText(child);
                } else {
                    text += child.textContent;
                }
            });

            return text.replace(/\n$/, '');
        };

        element.childNodes.forEach((node) => {
            if (node.nodeType === 1 && /^(DIV|P)$/.test(node.nodeName)) {
                if (inline !== null) {
                    lines.push(inline);
                    inline = null;
                }

                lines.push(blockText(node));
            } else if (node.nodeName === 'BR') {
                lines.push(inline || '');
                inline = null;
            } else {
                inline = (inline || '') + node.textContent;
            }
        });

        if (inline !== null) {
            lines.push(inline);
        }

        return lines.join('\n').replace(/\xa0/g, ' ');
    }

    // Article HTML -> plain text, without needing the element to be rendered
    function htmlToText(html) {
        const element = document.createElement('div');

        // a block starts a new line; a <br> alone in a block is that line's only content
        element.innerHTML = html
            .replace(/<(div|p)[^>]*>\s*<br\s*\/?>\s*<\/(div|p)>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<(div|p)[^>]*>/gi, '\n')
            .replace(/<\/(div|p)>/gi, '');

        return element.textContent.replace(/\xa0/g, ' ');
    }

    // A document's name is its first line with text, as a label: a frontmatter block
    // at the top is skipped (its `title:` is the name if it has one); heading marks,
    // list markers and task boxes are dropped; it is cut at a word to NAME_LENGTH.
    // Everything that names a document (the list, files, the folder copy) uses this.
    const NAME_LENGTH = 50;

    function firstLine(text) {
        let lines = (text || '').replace(/\xa0/g, ' ').split('\n');

        if (lines[0].trim() === '---') {
            const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---');

            if (end > 0) {
                const title = lines.slice(1, end).map(line => line.match(/^\s*title\s*:\s*(.+)$/i)).find(Boolean);

                if (title) {
                    return asName(title[1].replace(/^(["'])(.*)\1$/, '$2'));
                }

                lines = lines.slice(end + 1);
            }
        }

        return asName(lines.find(line => line.trim()) || '');
    }

    function asName(line) {
        const bare = line.trim().replace(/^(#{1,6}\s+|[-*+]\s+(\[[ xX]\]\s+)?|\d+[.)]\s+|>\s*)+/, '').trim() || line.trim();

        if (bare.length <= NAME_LENGTH) {
            return bare;
        }

        const cut = bare.slice(0, NAME_LENGTH);
        const space = cut.lastIndexOf(' ');

        return (space > NAME_LENGTH / 2 ? cut.slice(0, space) : cut).trim();
    }

    // The same, read from the first blocks of the article only: this runs on every
    // save and must not touch the whole document
    function firstLineOf(element) {
        const lines = [];

        for (let node = element.firstChild, i = 0; node && i < 20; i++, node = node.nextSibling) {
            lines.push(node.textContent || '');
        }

        return firstLine(lines.join('\n'));
    }

    // The name made safe for a file system, with `extension`; unique among `taken`
    // when the caller keeps that Set (the folder copy, the zip export)
    function fileName(name, extension, taken) {
        const base = (name || '').replace(/[\\/:*?"<>|]/g, '').trim() || 'untitled';
        let candidate = `${base}.${extension}`;

        for (let i = 2; taken && taken.has(candidate); i++) {
            candidate = `${base} (${i}).${extension}`;
        }

        if (taken) {
            taken.add(candidate);
        }

        return candidate;
    }

    // To the clipboard: 'copied', or 'failed' where the browser refuses
    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return 'copied';
        } catch (error) {
            return 'failed';
        }
    }

    return {
        supportsHtmlStorage,
        download,
        getSelectedText,
        replaceText,
        trimTabs,
        escapeHtml,
        textToHtml,
        plainHtml,
        articleToText,
        htmlToText,
        firstLine,
        firstLineOf,
        fileName,
        copyText,
    }

})();

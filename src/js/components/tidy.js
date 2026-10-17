// Tidy: text pasted from a PDF, an email or a web page comes with lines broken
// mid-sentence, tabs, runs of spaces and stacks of blank lines. A fixed set of
// rules, nothing guessed:
//
//   1. a line that does not end a sentence (. ! ? : and a closing quote or bracket)
//      followed by a line starting with a lowercase letter (after any indent) is one
//      line: a hard wrap. A list item or a quote takes its continuation too, as
//      markdown reads it; a heading or a table never does
//   2. tabs and runs of spaces inside a line become one space; non-breaking spaces
//      become spaces; an indent goes (in markdown four spaces or a tab make a code
//      block) unless it is in front of a list item, where it nests the list
//   3. spaces at the end of a line go; two or more blank lines become one
//   4. •, ·, ◦, ▪, – or — at the start of a line become "- ", a markdown list
//   5. code fences and tables are left exactly as they are
//
// Never: quotes, punctuation, a line that ends with punctuation (poetry, lists,
// addresses), the indent of a list. Pure: text in, text and counts out.
export default (function () {
    const ENDS_SENTENCE = /[.!?:…]["'”’)\]]*$/;
    const STARTS_LOWER = /^\p{Ll}/u;
    const FENCE = /^\s*(```|~~~)/;
    const TABLE = /^\s*\|/;
    // a line nothing is joined onto
    const CLOSED = /^\s*(#{1,6}\s|\|)/;
    const BULLET = /^(\s*)[•·◦▪–—]\s+/;
    const LIST_ITEM = /^\s*([-*+]|\d+[.)])\s/;

    function tidy(text) {
        const counts = { joined: 0, blanks: 0, tabs: 0, bullets: 0, spaces: 0 };
        const lines = [];
        let fenced = false;

        text.replace(/\r\n?/g, '\n').split('\n').forEach((raw) => {
            if (FENCE.test(raw)) {
                fenced = !fenced;
                lines.push({ text: raw, keep: true });
                return;
            }

            if (fenced || TABLE.test(raw)) {
                lines.push({ text: raw, keep: true });
                return;
            }

            let line = raw.replace(/\xa0/g, ' ');

            if (/\t/.test(line)) {
                counts.tabs++;
                line = line.replace(/^\t+/, '').replace(/\t+/g, ' ');
            }

            if (BULLET.test(line)) {
                counts.bullets++;
                line = line.replace(BULLET, '$1- ');
            }

            // runs of spaces; the indent too, unless it nests a list item
            const evened = (LIST_ITEM.test(line) ? line : line.replace(/^\s+/, '')).replace(/(\S) {2,}/g, '$1 ').replace(/\s+$/, '');

            if (evened !== line) {
                counts.spaces++;
            }

            line = evened;

            lines.push({ text: line, keep: false });
        });

        // rule 1: joined into the line before, as many times as it continues
        const joined = [];

        lines.forEach((line) => {
            const previous = joined[joined.length - 1];

            if (previous && !previous.keep && !line.keep && previous.text.trim() && !ENDS_SENTENCE.test(previous.text)
                && STARTS_LOWER.test(line.text.trim()) && !CLOSED.test(previous.text)) {
                previous.text += ' ' + line.text.trim();
                counts.joined++;
            } else {
                joined.push(line);
            }
        });

        // rule 3: one blank line at most
        const result = [];

        joined.forEach((line, index) => {
            if (!line.keep && line.text === '' && index > 0 && joined[index - 1].text === '') {
                counts.blanks++;
                return;
            }

            result.push(line.text);
        });

        return { text: result.join('\n'), counts };
    }

    // What the status line says: the counts that are not zero, in order
    function describe(counts) {
        const parts = [];

        if (counts.joined) parts.push(`${counts.joined} ${counts.joined === 1 ? 'line' : 'lines'} joined`);
        if (counts.blanks) parts.push(`${counts.blanks} blank ${counts.blanks === 1 ? 'line' : 'lines'} removed`);
        if (counts.tabs) parts.push('tabs gone');
        if (counts.bullets) parts.push(`${counts.bullets} ${counts.bullets === 1 ? 'bullet' : 'bullets'} made markdown`);
        if (counts.spaces) parts.push('spaces evened');

        return parts.join(', ');
    }

    return {
        tidy,
        describe,
    };
})();

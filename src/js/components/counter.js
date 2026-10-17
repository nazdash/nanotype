import documents from './documents';
import util from './utils';

// The count in the status line: words (and characters, and a reading time from
// 100 words) of the text, or of the selection; "detailed" or "compact" by a click.
// Also the number of documents beside "docs", and the name of a shared document.
export default (function () {
    const READING_SPEED = 200;   // words per minute, for the reading time

    let ctx = null;              // article, statusTitle, statistic, documentsElement, isShared, sharedTitle, saveState, track
    let mode = 'detailed';
    let timer = null;

    function init(context) {
        ctx = context;
        ctx.statistic.onclick = onStatisticClick;
    }

    function onStatisticClick() {
        mode = mode === 'compact' ? 'detailed' : 'compact';
        ctx.saveState();
        update();
        ctx.track('counter', { mode });
    }

    function schedule() {
        clearTimeout(timer);
        timer = setTimeout(update, 120);
    }

    // Words are runs of non-space characters that contain a letter or digit,
    // so markdown markers like "#", "-" or "---" are not counted
    function count(text) {
        const tokens = text.match(/\S+/g) || [];

        return {
            words: tokens.filter(token => /[\p{L}\p{N}]/u.test(token)).length,
            characters: text.replace(/\r?\n|\r/g, '').length,
        };
    }

    function update() {
        timer = null;

        const { article, statusTitle, statistic } = ctx;
        const selection = window.getSelection();
        const selected = selection.rangeCount > 0
            && !selection.isCollapsed
            && article.contains(selection.anchorNode)
            && article.contains(selection.focusNode);
        const counts = count(selected ? selection.toString() : util.articleToText(article));
        const words = counts.words.toLocaleString();
        const characters = counts.characters.toLocaleString();
        const parts = [`${words} ${counts.words === 1 ? 'word' : 'words'}`];

        if (selected) {
            parts.push(`${characters} chars selected`);
        } else if (mode === 'detailed') {
            parts.push(`${characters} chars`);

            if (counts.words >= 100) {
                parts.push(`${Math.max(1, Math.round(counts.words / READING_SPEED))} min read`);
            }
        }

        // A document's name is its first line, already on screen: the status line
        // names only a shared document
        statusTitle.textContent = '';
        statistic.textContent = parts.join(' · ');
        ctx.documentsElement.querySelector('.count').textContent = documents.list().length;

        const shared = ctx.sharedTitle();

        if (shared) {
            statusTitle.textContent = shared.title;
            statistic.textContent = shared.counts ? parts.join(' · ') : '';
        }

        statistic.classList.toggle('selection', selected);
    }

    return {
        init,
        update,
        schedule,
        count,
        mode: () => mode,
        setMode: (value) => { mode = value === 'compact' ? 'compact' : 'detailed'; },
    };
})();

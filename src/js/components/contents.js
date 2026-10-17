import app from './app';
import util from './utils';

// Contents: the headings (# to ######) of the document. A panel in the left
// margin on a wide screen with a pointer, outside the markdown split view;
// elsewhere the same command opens the picker with the headings as rows.
export default (function () {
    let on = false;
    let element = null;   // the column word (shown in a shared view only)
    let panel = null;
    let timer = null;

    function init() {
        element = document.querySelector('.contents');
        element.onclick = toggle;
        panel = document.querySelector('.contents-panel');
        panel.addEventListener('click', onPanelClick);
        window.addEventListener('resize', () => { if (on) render(); });
    }

    // Room for the list in the margin: beside the text from 1280 px, beside the
    // markdown split from 1760 px, times the size's scale (the same numbers as the
    // CSS above the panel)
    function canShowPanel() {
        return window.matchMedia(`(min-width: ${Math.round((app.is.markdown() && !app.shared.active ? 1760 : 1280) * app.scale())}px) and (hover: hover)`).matches;
    }

    // Every heading line: its level, text and block element
    function headings() {
        const list = [];

        Array.from(app.article.childNodes).forEach((node) => {
            const text = (node.textContent || '').replace(/\xa0/g, ' ');
            const match = /^(#{1,6})\s+(.+)$/.exec(text.split('\n')[0].trim());

            if (match) {
                list.push({ level: match[1].length, text: match[2].trim(), node });
            }
        });

        return list;
    }

    function toggle() {
        if (canShowPanel()) {
            set(!on);
            app.saveState();
            app.setStatus(`contents ${on ? 'on' : 'off'}`);
            app.track('contents', { on });
            return;
        }

        openPicker();
    }

    function set(value) {
        on = value;
        app.setValue(element, on ? 'on' : 'off');
        app.body.classList.toggle('contents-on', on);

        if (on) {
            render();
        }
    }

    function schedule() {
        if (!on) {
            return;
        }

        clearTimeout(timer);
        timer = setTimeout(render, 200);
    }

    function render() {
        const list = headings();

        panel.innerHTML = list.length
            ? list.map((h, i) => `<button data-index="${i}" style="padding-left:${(h.level - 1) * 2}ch">${util.escapeHtml(h.text)}</button>`).join('')
            : '<p class="empty">no headings</p>';
    }

    function onPanelClick(event) {
        const button = event.target.closest('button');

        if (button) {
            goToHeading(headings()[parseInt(button.dataset.index, 10)]);
        }
    }

    // Scroll the heading to the top and put the caret at its start
    function goToHeading(heading) {
        if (!heading) {
            return;
        }

        // in a shared view the rendered text is what is shown: its n-th heading
        if (app.shared.active && app.is.markdown()) {
            const index = headings().indexOf(heading);
            const rendered = app.showcase.querySelectorAll('h1, h2, h3, h4, h5, h6')[index];

            if (rendered) {
                rendered.scrollIntoView({ block: 'start' });
            }

            return;
        }

        const range = document.createRange();

        range.setStart(heading.node, 0);
        range.collapse(true);
        app.article.focus();
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        heading.node.scrollIntoView({ block: 'start' });
        app.caretMoved();
    }

    function openPicker() {
        if (app.picker.kind === 'contents') {
            app.closePicker();
            return;
        }

        const list = headings();

        app.openPicker({
            kind: 'contents',
            filter: list.length > 8,
            placeholder: 'filter headings',
            items: list.length
                ? list.map(h => ({ label: `${'  '.repeat(h.level - 1)}${h.text}`, hint: '', run: () => goToHeading(h) }))
                : [{ label: 'no headings', hint: 'lines that start with # are headings', run: () => {} }],
        });
        app.track('contents', { picker: true });
    }

    return {
        init,
        toggle,
        set,
        schedule,
        render,
        canShowPanel,
        openPicker,
        goToHeading,
        headings,
        on: () => on,
        panel: () => panel,
    };
})();

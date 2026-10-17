import app from './app';
import util from './utils';
import caret from './caret';

    // Picker: one list used for the command menu, the documents, the trash and the
    // contents. A row is { label, hint, key, group, current, run, actions, text }: the
    // hint sits after the label, muted; the key alone goes on the right; rows with a
    // group get a heading when the group changes.
export default (function () {
    const picker = { element: null, input: null, list: null, foot: null, items: [], shown: [], index: 0, kind: null };

    function init() {
        picker.element = document.querySelector('.picker');
        picker.input = picker.element.querySelector('input');
        picker.list = picker.element.querySelector('.picker-list');
        picker.foot = picker.element.querySelector('.picker-foot');
        picker.input.addEventListener('input', onPickerInput);
        picker.element.addEventListener('keydown', onPickerKeyDown);
        picker.list.addEventListener('click', onPickerClick);
        picker.list.addEventListener('mousemove', onPickerMouseMove);
        document.addEventListener('mousedown', onOutsidePickerMouseDown);
    }


    function openPicker(options) {
        closePicker(false);

        if (options.at) {
            caret.forget();   // the caret is where it is; nothing to return to
        } else {
            caret.keep();
        }

        picker.kind = options.kind;
        picker.items = options.items;
        picker.input.value = '';
        picker.input.placeholder = options.placeholder || '';
        picker.foot.textContent = options.foot || '';
        picker.element.classList.toggle('plain', options.filter === false);
        picker.element.classList.toggle('at-caret', !!options.at);
        picker.element.dataset.kind = options.kind;

        // Under the caret (the slash commands), or in the middle of the page
        if (options.at) {
            picker.element.style.top = `${options.at.top}px`;
            picker.element.style.left = `${Math.max(16, Math.min(options.at.left, window.innerWidth - 420 * app.scale() - 16))}px`;   // the .at-caret width
        } else {
            picker.element.style.top = '';
        }

        picker.index = Math.max(0, picker.items.findIndex(item => item.current && options.startOnCurrent));
        filterPicker(false);
        picker.element.classList.add('visible');

        // Driven from the text: the text keeps the focus and the keys (see onArticleKeyDown).
        // Under the caret, or above it when the bottom of the window is too close.
        if (options.at) {
            const roomBelow = window.innerHeight - 16 - options.at.top;
            const roomAbove = options.at.above - 16;
            const chrome = picker.element.offsetHeight - picker.list.offsetHeight;   // the foot and the frame

            if (picker.element.offsetHeight > roomBelow && roomAbove > roomBelow) {
                picker.list.style.maxHeight = `${roomAbove - chrome}px`;
                picker.element.style.top = `${options.at.above - picker.element.offsetHeight}px`;
            } else {
                picker.list.style.maxHeight = `${roomBelow - chrome}px`;
            }

            return;
        }

        // With a keyboard the filter line takes the keys at once. On a phone, focusing it
        // would raise the on-screen keyboard over half the list, so the list is shown
        // first and the filter is there to tap.
        if (app.is.touch) {
            if (document.activeElement && document.activeElement.blur) {
                document.activeElement.blur();
            }
        } else {
            (options.filter === false ? picker.element : picker.input).focus();
        }
    }

    function closePicker(refocus) {
        if (!picker.kind) {
            return;
        }

        picker.element.classList.remove('visible');
        picker.element.style.left = '';
        picker.list.style.maxHeight = '';
        picker.kind = null;
        picker.input.blur();

        // On a phone, going back to the text would raise the keyboard after every command
        if (refocus !== false && !app.is.touch) {
            caret.focusArticle();
        }
    }

    // Rows whose label or hint has every term; then, for rows that carry a document's
    // text, rows whose text has every term (the menu finds a document by a word in it)
    function filterPicker(resetIndex) {
        const terms = picker.input.value.toLowerCase().split(/\s+/).filter(Boolean);
        const byText = [];

        const matched = picker.items.filter((item) => {
            const text = `${item.label} ${item.hint || ''}`.toLowerCase();

            if (terms.every(term => text.includes(term))) {
                return true;
            }

            if (terms.length && item.text && terms.every(term => item.text.includes(term))) {
                byText.push({ ...item, hint: 'in the text' });
            }

            return false;
        });

        // rows whose name begins with the typed word first ("/im" is /image before
        // /time; "theme" the themes before rows that mention one), the rest in order
        const begins = item => terms.length > 0 && item.label.toLowerCase().replace(/^\//, '').startsWith(terms[0]);

        picker.shown = matched.filter(begins).concat(matched.filter(item => !begins(item)), byText);

        if (resetIndex !== false) {
            picker.index = 0;
        }

        picker.index = Math.min(picker.index, Math.max(0, picker.shown.length - 1));
        renderPicker();
    }

    function renderPicker() {
        if (picker.shown.length === 0) {
            picker.list.innerHTML = '<li class="picker-empty">nothing matches</li>';
            return;
        }

        let group = null;

        picker.list.innerHTML = picker.shown.map((item, index) => {
            const names = Object.keys(item.actions || {});
            const actions = names.length
                ? `<span class="acts">${names.map(name => `<button class="act" data-act="${name}">${name}</button>`).join('')}</span>`
                : '';
            const hint = item.hint ? `<span class="hint">${util.escapeHtml(item.hint)}</span>` : '';
            const key = item.key ? `<span class="key">${util.escapeHtml(item.key)}</span>` : '';
            const classes = `picker-item${index === picker.index ? ' selected' : ''}${item.current ? ' current' : ''}`;
            let heading = '';

            if (item.group && item.group !== group) {
                group = item.group;
                heading = `<li class="picker-heading">${group}</li>`;
            }

            return `${heading}<li class="${classes}" data-index="${index}" role="option"><span class="label">${util.escapeHtml(item.label)}</span>${actions}${hint}${key}</li>`;
        }).join('');

        scrollPickerSelection();
    }

    // Move the selection without rebuilding the list (a rebuild under the pointer would eat clicks)
    function setPickerIndex(index) {
        const rows = picker.list.querySelectorAll('.picker-item');

        if (!rows.length) {
            return;
        }

        picker.index = (index + rows.length) % rows.length;
        rows.forEach((row, rowIndex) => row.classList.toggle('selected', rowIndex === picker.index));
    }

    function scrollPickerSelection() {
        const selected = picker.list.querySelector('.selected');

        if (selected && selected.scrollIntoView) {
            selected.scrollIntoView({ block: 'nearest' });
        }
    }

    function runPickerItem(item, action) {
        if (!item) {
            return;
        }

        app.via(picker.kind === 'slash' ? 'slash' : 'menu');

        if (action) {
            item.actions[action]();
            return;
        }

        closePicker();
        item.run();
    }

    function onPickerInput() {
        filterPicker();
    }

    function onPickerKeyDown(event) {
        const item = picker.shown[picker.index];

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setPickerIndex(picker.index + 1);
                scrollPickerSelection();
                break;

            case 'ArrowUp':
                event.preventDefault();
                setPickerIndex(picker.index - 1);
                scrollPickerSelection();
                break;

            case 'Enter':
                event.preventDefault();
                runPickerItem(item);
                break;

            case 'Tab':
                event.preventDefault();
                break;

            case 'Backspace':
                if ((event.metaKey || event.ctrlKey) && item && item.actions && item.actions.delete) {
                    event.preventDefault();
                    runPickerItem(item, 'delete');
                }
                break;

            case 'd':
            case 'D':
                if ((event.metaKey || event.ctrlKey) && !event.shiftKey && item && item.actions && item.actions.duplicate) {
                    event.preventDefault();
                    event.stopPropagation();
                    runPickerItem(item, 'duplicate');
                }
                break;

            default:
        }
    }

    function onPickerClick(event) {
        const row = event.target.closest('.picker-item');

        if (!row) {
            return;
        }

        const action = event.target.closest('.act');

        runPickerItem(picker.shown[parseInt(row.dataset.index, 10)], action ? action.dataset.act : null);
    }

    function onPickerMouseMove(event) {
        const row = event.target.closest('.picker-item');

        if (row && parseInt(row.dataset.index, 10) !== picker.index) {
            setPickerIndex(parseInt(row.dataset.index, 10));
        }
    }

    function onOutsidePickerMouseDown(event) {
        // the docs word closes its own list on click, so its mousedown is left to it
        if (picker.kind && !picker.element.contains(event.target) && !app.documentsElement.contains(event.target)) {
            closePicker(false);
        }
    }

    return {
        init,
        state: picker,
        open: openPicker,
        close: closePicker,
        filter: filterPicker,
        setIndex: setPickerIndex,
        scrollSelection: scrollPickerSelection,
        run: runPickerItem,
    };
})();

import app from './app';
import util from './utils';
import editor from './editor';
import documents from './documents';
import share from './share';
import move from './move';
import files from './files';
import keys from '../keys';

// Sharing: the share dialog (a public or a private link), the shared view a link
// opens (read-only, rendered, the reader's commands only), the locked link's
// dialog, and the hand-over from the old address.
export default (function () {
    // Above this many characters the link may be cut by some messengers
    const LONG_LINK = 30000;

    let shareModal, unlockModal, movedModal, shareElement, importSharedElement;

    function init() {
        shareElement = document.querySelector('.share');
        shareElement.onclick = onShareClick;
        importSharedElement = document.querySelector('.import-shared');
        importSharedElement.onclick = importShared;
        shareModal = app.overlay.querySelector('.share-modal');
        unlockModal = app.overlay.querySelector('.unlock-modal');
        movedModal = app.overlay.querySelector('.moved-modal');
        app.bindChoices(shareModal, onShareChoice);
        app.bindChoices(unlockModal, tryUnlock);
        app.bindChoices(movedModal, app.removeOverlay);
        shareModal.addEventListener('keydown', onShareModalKeyDown);
    }

    // After the page is up: a locked link asks for its seed word (the field can
    // only take focus now); a visitor from the old address is told, once
    function afterStart() {
        if (app.shared.locked) {
            openUnlock();
        }

        if (movedMessage) {
            app.setStatus(movedMessage, 15000);

            if (!app.shared.active && !localStorage[keys.MOVED_SEEN]) {
                localStorage[keys.MOVED_SEEN] = '1';
                app.openModal(movedModal);
                app.selectChoice(movedModal, app.visibleChoices(movedModal)[0]);
                movedModal.focus();
            }
        }
    }

    // SHARE: the document travels inside the link, after the #.

    function onShareClick() {
        if (app.shared.active) {
            return;
        }

        if (files.getEditorPlainText().trim() === '') {
            app.sayBeside(shareElement, 'nothing to share');
            return;
        }

        // said before the choice when this text makes a link some messengers would cut
        const long = shareModal.querySelector('.share-long');
        const length = linkFor(share.encode(sharedDocument())).length;

        long.hidden = length <= LONG_LINK;
        long.textContent = long.hidden ? '' : `This text makes a link of about ${sizeOf(length)} characters; some messengers cut links this long. It still opens in a browser.`;

        app.openModal(shareModal);
        showShareStep('choose');
        app.track('share-dialog');
    }

    function showShareStep(step) {
        shareModal.querySelectorAll('.share-step').forEach((element) => {
            element.classList.toggle('visible', element.dataset.step === step);
        });
        app.selectChoice(shareModal, app.visibleChoices(shareModal)[0]);

        if (step === 'seed') {
            shareModal.querySelector('.seed-input').focus();
        } else {
            shareModal.focus();
        }
    }

    function onShareModalKeyDown(event) {
        // Esc on the seed step goes back to the choice; elsewhere it closes (document handler)
        if (event.key === 'Escape' && shareModal.querySelector('[data-step="seed"]').classList.contains('visible')) {
            event.stopPropagation();
            showShareStep('choose');
        }
    }

    function sharedDocument() {
        return {
            text: files.getEditorPlainText(),
            ...app.look(),
        };
    }

    function linkFor(fragment) {
        return `${location.origin}${location.pathname}#${fragment}`;
    }

    function sizeOf(length) {
        return length >= 1000 ? `${(length / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${length}`;
    }

    // Under the link field: its length, and a warning when some messengers would cut it
    function sizeNote(link) {
        return `${sizeOf(link.length)} characters${link.length > LONG_LINK ? ' · some messengers cut links this long' : ''}`;
    }

    function sizeBucket(link) {
        return link.length < 2000 ? '<2k' : link.length < 10000 ? '<10k' : link.length <= LONG_LINK ? '<30k' : '30k+';
    }

    // The share sheet on a phone, the clipboard elsewhere.
    // 'shared', 'copied', 'cancelled', or 'failed' when neither was allowed
    async function deliverLink(link) {
        if (app.is.touch && navigator.share) {
            try {
                await navigator.share({ url: link });
                return 'shared';
            } catch (error) {
                if (error && error.name === 'AbortError') {
                    return 'cancelled';
                }
            }
        }

        try {
            await navigator.clipboard.writeText(link);
            return 'copied';
        } catch (error) {
            return 'failed';
        }
    }

    async function onShareChoice(choice) {
        const ready = shareModal.querySelector('[data-step="ready"]');

        switch (choice) {
            case 'public': {
                const link = linkFor(share.encode(sharedDocument()));

                app.track('share', { kind: 'public', size: sizeBucket(link) });
                showReady(link, '', await deliverLink(link));
                break;
            }

            case 'private':
                shareModal.querySelector('.seed-input').value = await share.suggestSeed();
                showShareStep('seed');
                break;

            case 'make': {
                // shown as typed; case, spacing and hyphens do not matter for the lock
                const typed = shareModal.querySelector('.seed-input').value.trim();
                const seed = share.normaliseSeed(typed);
                const hint = shareModal.querySelector('[data-step="seed"] .hint');

                if (!seed) {
                    hint.textContent = 'the seed word is empty';
                    return;
                }

                hint.textContent = 'locking…';

                let link;

                try {
                    link = linkFor(await share.encrypt(sharedDocument(), seed));
                } catch (e) {
                    hint.textContent = 'locking needs https';   // crypto.subtle exists in secure contexts only
                    return;
                }

                hint.textContent = 'The seed word is not kept anywhere. Lost means lost.';
                app.track('share', { kind: 'private', size: sizeBucket(link) });
                showReady(link, typed, null);
                break;
            }

            case 'copy-link':
                markCopied(ready.querySelector('[data-choice="copy-link"]'), await util.copyText(ready.querySelector('.link-output').value));
                break;

            case 'copy-seed':
                markCopied(ready.querySelector('[data-choice="copy-seed"]'), await util.copyText(ready.querySelector('.seed-output').value));
                break;

            case 'share-link':
                try {
                    await navigator.share({ url: ready.querySelector('.link-output').value });
                    markCopied(ready.querySelector('[data-choice="share-link"]'), 'shared');
                } catch (error) {
                    // stayed on the page; the link is still there to copy
                }
                break;

            default:
        }
    }

    // The row says what happened, for a moment
    function markCopied(row, result) {
        const hint = row.querySelector('.hint');

        hint.textContent = result === 'failed' ? 'not allowed, select and copy the field' : result;
        clearTimeout(row.copiedTimer);
        row.copiedTimer = setTimeout(() => { hint.textContent = ''; }, 2500);
    }

    // The last step: the link, and for a private link the seed word beside it, each
    // with its own copy. A public link is already on the clipboard when it is reached;
    // `result` says so. A private link is never copied on its own, so copying the seed
    // word cannot lose it, and the other way round.
    function showReady(link, seed, result) {
        const ready = shareModal.querySelector('[data-step="ready"]');
        const isPrivate = !!seed;


        ready.classList.toggle('private', isPrivate);
        ready.querySelector('.link-output').value = link;
        ready.querySelector('.seed-output').value = seed;
        ready.querySelector('.share-size').textContent = sizeNote(link);
        ready.querySelectorAll('.hint').forEach((hint) => { hint.textContent = ''; });

        if (result === 'shared') {
            app.removeOverlay();
            app.setStatus('link shared', 2000);
            return;
        }

        if (isPrivate) {
            ready.querySelector('h1').textContent = 'Private link ready';
            ready.querySelector('.share-note').textContent = `Copy both. Send the link one way and the seed word another. Nanotype keeps neither.`;
        } else if (result === 'copied') {
            ready.querySelector('h1').textContent = 'Link copied';
            ready.querySelector('.share-note').textContent = `It is on the clipboard. Anyone who has the link can read the text.`;
            ready.querySelector('[data-choice="copy-link"] .hint').textContent = 'copied';
        } else {
            ready.querySelector('h1').textContent = 'Link ready';
            ready.querySelector('.share-note').textContent = `Copy it below. Anyone who has the link can read the text.`;
        }

        ready.querySelector('.foot').textContent = isPrivate ? '↑↓ select · enter copy · esc close' : 'enter copy again · esc close';
        showShareStep('ready');
    }

    // THE MOVE TO THE NEW ADDRESS (see move.js)

    let movedMessage = '';

    function openMovedFromHash() {
        const result = move.receiveFromHash();

        if (result) {
            editor.reload();
        }

        if (location.hash === '#moved') {
            history.replaceState(null, '', location.pathname + location.search);
            movedMessage = result && result.failed
                ? 'your documents did not come along: on the old address use "export everything" and import the file here'
                : documents.isBlank() ? 'Zen has moved here. It is Nanotype now.' : 'Zen has moved here as Nanotype. Your documents came with you.';
            app.track('moved', { ok: !(result && result.failed), added: result ? result.added : 0 });
        }

        // the new address, empty, reached directly: say where the old documents are.
        // Not after a forward from an old address: that visit was the "open it once".
        if (move.isNewAddress() && documents.isBlank() && !movedMessage) {
            app.body.classList.add('new-address');
        }
    }

    /*********************************************
     * SHARED DOCUMENT
     * Opened from a share link: read-only, the reader's own documents untouched
     *********************************************/

    function openSharedFromHash() {
        const info = share.inspect(location.hash);

        if (info.kind === 'none') {
            return;
        }

        app.shared.active = true;
        app.shared.fragment = location.hash.slice(1);
        editor.lock();
        app.body.classList.add('shared');
        app.article.contentEditable = 'false';
        app.article.innerHTML = '';
        app.track('share-open', { kind: info.kind });

        if (info.kind === 'public') {
            const doc = share.decode(app.shared.fragment);

            if (doc) {
                showShared(doc);
            } else {
                showSharedProblem('this link is incomplete');
            }
        } else if (info.kind === 'private') {
            app.shared.locked = true;   // the seed dialog opens once the page is shown
        } else {
            showSharedProblem(info.kind === 'newer' ? 'this link needs a newer Nanotype' : 'this link is incomplete');
        }
    }

    function showShared(doc) {
        app.shared.doc = doc;
        app.shared.locked = false;
        app.sticky('');
        app.article.innerHTML = util.textToHtml(doc.text);
        app.updateEmptyState();
        app.applySharedLook();

        if (app.is.lines()) {
            app.wrapLooseLines();
        }

        app.counterUpdate();
    }

    function showSharedProblem(message) {
        app.shared.doc = null;
        app.sticky(message);
        app.counterUpdate();
    }

    function openUnlock() {
        const input = unlockModal.querySelector('.unlock-input');

        unlockModal.querySelector('.unlock-error').textContent = '';
        app.openModal(unlockModal);
        app.selectChoice(unlockModal, app.visibleChoices(unlockModal)[0]);
        app.sticky('');
        app.counterUpdate();
        input.focus();
    }

    async function tryUnlock() {
        const input = unlockModal.querySelector('.unlock-input');
        const error = unlockModal.querySelector('.unlock-error');
        const seed = share.normaliseSeed(input.value);

        if (!seed) {
            error.textContent = 'the seed word is empty';
            return;
        }

        error.textContent = 'unlocking…';

        const doc = await share.decrypt(app.shared.fragment, seed);

        if (!doc) {
            error.textContent = 'wrong seed word';
            input.select();
            return;
        }

        error.textContent = '';
        input.value = '';
        app.removeOverlay();
        showShared(doc);
    }

    // Esc or a click outside closed the seed dialog: say how to get back to it
    function onUnlockDismissed() {
        if (app.shared.active && app.shared.locked) {
            app.sticky('locked link · the seed word unlocks the text');
        }
    }

    // The shared text becomes a document of the reader's own
    function importShared() {
        if (!app.shared.active) {
            return;
        }

        if (!app.shared.doc) {
            if (app.shared.locked) {
                openUnlock();
            }
            return;
        }

        const doc = app.shared.doc;

        // created while the editor is still locked, so the shared text is not saved
        // over the reader's current document on the way
        editor.createDocument(util.textToHtml(doc.text));
        leaveSharedView();
        editor.reload();
        history.replaceState(null, '', location.pathname + location.search);
        app.loadState();
        app.setStatus('imported');
        app.track('share-import');

        if (!app.is.touch) {
            app.article.focus();
        }
    }

    function leaveSharedView() {
        app.shared.active = false;
        app.shared.locked = false;
        app.shared.doc = null;
        app.shared.fragment = '';
        app.sticky('');
        editor.unlock();
        app.body.classList.remove('shared');
        app.article.contentEditable = 'true';
        app.removeOverlay();
        app.closePicker(false);
    }

    return {
        init,
        afterStart,
        onShareClick,
        openSharedFromHash,
        openMovedFromHash,
        openUnlock,
        onUnlockDismissed,
        importShared,
    };
})();

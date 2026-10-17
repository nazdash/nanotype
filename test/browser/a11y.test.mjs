// Reduce motion and increase contrast from the OS; the text, status and dialogs
// named for a screen reader; the caret kept across the menu and a dialog; a new
// document in focus mode takes typing
export const expect = {
    textbox: 'textbox Text true', live: 'polite', dialogs: 6, aboutFocus: 'description modal', afterEsc: 'content', typed: 'hello again',
    reduced: 'none / 0s', normal: 'caret-blink / 0.075s', contrast: '0.55', normalOpacity: '0.16', focusNewDoc: 'abc',
};

export default async (t) => {
    await t.open('/');
    const out = {};
    await t.focus(); await t.insert('hello');
    out.textbox = await t.ev(`(a => a.getAttribute('role') + ' ' + a.getAttribute('aria-label') + ' ' + a.getAttribute('aria-multiline'))(document.querySelector('article'))`);
    out.live = await t.ev(`document.querySelector('.status-said').getAttribute('aria-live')`);
    out.dialogs = await t.ev(`[...document.querySelectorAll('.modal')].filter(m => m.getAttribute('role') === 'dialog' && m.getAttribute('aria-label')).length`);
    await t.key('k', 'KeyK', 4); await t.filter('about'); await t.key('Enter'); await t.sleep(200);
    out.aboutFocus = await t.ev(`document.activeElement.className`);
    await t.key('Escape', 'Escape'); out.afterEsc = await t.ev(`document.activeElement.className`);
    await t.insert(' again'); out.typed = await t.text();

    await t.media([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await t.sleep(100); await t.focus();
    out.reduced = await t.ev(`getComputedStyle(document.querySelector('.block-caret')).animationName + ' / ' + getComputedStyle(document.querySelector('.commands button')).transitionDuration`);
    await t.media([]); await t.sleep(100);
    out.normal = await t.ev(`getComputedStyle(document.querySelector('.block-caret')).animationName + ' / ' + getComputedStyle(document.querySelector('.commands button')).transitionDuration`);
    await t.media([{ name: 'prefers-contrast', value: 'more' }]); await t.sleep(100);
    out.contrast = await t.ev(`getComputedStyle(document.querySelector('.commands button')).opacity`);
    await t.media([]); await t.sleep(100);
    out.normalOpacity = await t.ev(`getComputedStyle(document.querySelector('.commands button')).opacity`);

    await t.key('d', 'KeyD', 4); await t.key('D', 'KeyD', 12); await t.sleep(300); await t.type('abc');
    out.focusNewDoc = await t.text();

    return out;
};

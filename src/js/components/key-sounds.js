import sounds from './sounds';

// Key sounds: 'off', the recorded 'typewriter' (public/sfx), or a synthesised
// set from sounds.js. Which sound a key makes is decided here; the column word
// cycles the sets, a chosen set plays a sample of itself.
export default (function () {
    const SETS = ['off', ...sounds.names, 'typewriter'];
    const clip = (name) => new Audio(`sfx/manual_${name}.mp3`);
    const sfx = { key: clip('key'), space: clip('space'), return: clip('return') };

    let ctx = null;   // element (the column word), setValue, setStatus, saveState, track
    let current = 'off';

    function init(context) {
        ctx = context;
        ctx.element.onclick = next;
    }

    function set(name) {
        current = name;
        ctx.setValue(ctx.element, name);
    }

    function next() {
        change(SETS[(SETS.indexOf(current) + 1) % SETS.length]);
    }

    function change(name) {
        set(name);
        ctx.saveState();
        ctx.setStatus(`sound ${name}`);
        ctx.track('sound', { set: name });

        // a sample of what was chosen: a key and, a moment later, the return,
        // so every set is clearly heard
        play(65);
        setTimeout(() => play(13), 140);
    }

    // Which sound a key makes. Modifiers alone make none, as on a real keyboard.
    // Moving the cursor (arrows, Home, End, Page Up/Down) is a quieter key in the
    // synthesised sets and nothing on the typewriter, which had no such keys.
    function play(keyCode) {
        let sound = 'key';

        switch (keyCode) {
            case 13:    // enter
                sound = 'return';
                break;

            case 9:     // tab
            case 32:    // space
                sound = 'space';
                break;

            case 8:     // backspace
            case 46:    // delete
                sound = 'backspace';
                break;

            case 33:    // page up
            case 34:    // page down
            case 35:    // end
            case 36:    // home
            case 37:    // left
            case 38:    // up
            case 39:    // right
            case 40:    // down
                sound = 'move';
                break;

            case 0:     // unknown
            case 16:    // shift
            case 17:    // ctrl
            case 18:    // alt
            case 20:    // caps lock
            case 27:    // esc
            case 91:    // command
            case 93:    // command (right)
                sound = null;
                break;

            default:
        }

        if (!sound || current === 'off') {
            return;
        }

        if (current === 'typewriter') {
            const clip = sound === 'backspace' ? 'key' : sound;

            if (clip === 'move') {
                return;
            }

            // from the start each time, so fast typing never waits for the last press
            sfx[clip].currentTime = 0;
            sfx[clip].play().catch(() => {});   // before the first interaction the browser refuses: silence is right
            return;
        }

        sounds.play(current, sound, keyCode);
    }

    return {
        SETS,
        init,
        set,
        next,
        change,
        play,
        current: () => current,
    };
})();

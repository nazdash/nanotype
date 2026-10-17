// Key sounds made with the Web Audio API: no files, no licences, and every press
// varies a little in pitch so typing never sounds like a loop. The typewriter set
// is recorded (see key-sounds.js); these are the synthesised ones.
//
//   soft   a quiet thock, like a good laptop keyboard
//   click  a thin crisp tick, like a mechanical switch at a distance
//   blip   a short tone with a note per key, a terminal feel
//
// Kinds: 'key', 'space', 'return', 'backspace', 'move' (arrows and the like: quieter).
export default (function () {
    let context = null;
    let noise = null;

    // Browsers allow sound only after the user has interacted with the page,
    // which a key press is; so the context is made on the first sound, not at load
    function getContext() {
        if (!context) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;

            if (!AudioContext) {
                return null;
            }

            context = new AudioContext();
        }

        if (context.state === 'suspended') {
            context.resume();
        }

        return context;
    }

    // One second of white noise, made once
    function noiseBuffer(ctx) {
        if (!noise) {
            noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);

            const data = noise.getChannelData(0);

            for (let i = 0; i < data.length; i++) {
                data[i] = Math.random() * 2 - 1;
            }
        }

        return noise;
    }

    // ±spread around 1, e.g. jitter(0.05) is 0.95…1.05
    function jitter(spread) {
        return 1 + (Math.random() * 2 - 1) * spread;
    }

    // A burst of filtered noise with a fast decay
    function thud(ctx, { type, frequency, q, gain, decay, when }) {
        const source = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const envelope = ctx.createGain();
        const start = when || ctx.currentTime;

        source.buffer = noiseBuffer(ctx);
        filter.type = type;
        filter.frequency.value = frequency;
        filter.Q.value = q || 1;
        envelope.gain.setValueAtTime(gain, start);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + decay);

        source.connect(filter);
        filter.connect(envelope);
        envelope.connect(ctx.destination);
        source.start(start);
        source.stop(start + decay + 0.02);
    }

    // A short tone with a fast decay
    function tone(ctx, { wave, frequency, gain, decay, when, slide }) {
        const oscillator = ctx.createOscillator();
        const envelope = ctx.createGain();
        const start = when || ctx.currentTime;

        oscillator.type = wave;
        oscillator.frequency.setValueAtTime(frequency, start);

        if (slide) {
            oscillator.frequency.exponentialRampToValueAtTime(slide, start + decay);
        }

        envelope.gain.setValueAtTime(gain, start);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + decay);

        oscillator.connect(envelope);
        envelope.connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + decay + 0.02);
    }

    const sets = {
        soft(ctx, kind) {
            switch (kind) {
                case 'return':
                    thud(ctx, { type: 'lowpass', frequency: 420 * jitter(0.05), q: 0.8, gain: 0.9, decay: 0.07 });
                    break;

                case 'space':
                    thud(ctx, { type: 'lowpass', frequency: 520 * jitter(0.05), q: 0.6, gain: 0.7, decay: 0.05 });
                    break;

                case 'backspace':
                    thud(ctx, { type: 'bandpass', frequency: 900 * jitter(0.05), q: 1.2, gain: 0.6, decay: 0.035 });
                    break;

                case 'move':
                    thud(ctx, { type: 'lowpass', frequency: 1100 * jitter(0.08), q: 0.8, gain: 0.3, decay: 0.025 });
                    break;

                default:
                    thud(ctx, { type: 'lowpass', frequency: 1100 * jitter(0.08), q: 0.8, gain: 0.65, decay: 0.035 });
            }
        },

        click(ctx, kind) {
            const pitch = jitter(0.06);

            switch (kind) {
                case 'return':
                    thud(ctx, { type: 'highpass', frequency: 1800 * pitch, q: 1, gain: 0.3, decay: 0.02 });
                    tone(ctx, { wave: 'sine', frequency: 1500 * pitch, gain: 0.12, decay: 0.05 });
                    break;

                case 'space':
                    thud(ctx, { type: 'bandpass', frequency: 2200 * pitch, q: 2, gain: 0.25, decay: 0.02 });
                    break;

                case 'move':
                    thud(ctx, { type: 'highpass', frequency: 3000 * pitch, q: 1, gain: 0.11, decay: 0.012 });
                    break;

                default:
                    thud(ctx, { type: 'highpass', frequency: 3000 * pitch, q: 1, gain: 0.22, decay: 0.012 });
                    tone(ctx, { wave: 'sine', frequency: 2400 * pitch, gain: 0.06, decay: 0.025 });
            }
        },

        // a pentatonic note per key, so typing makes a faint tune
        blip(ctx, kind, keyCode) {
            const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
            const note = scale[(keyCode || 0) % scale.length] * jitter(0.01);

            switch (kind) {
                case 'return':
                    tone(ctx, { wave: 'triangle', frequency: 659.25, gain: 0.12, decay: 0.06 });
                    tone(ctx, { wave: 'triangle', frequency: 523.25, gain: 0.12, decay: 0.09, when: ctx.currentTime + 0.06 });
                    break;

                case 'space':
                    tone(ctx, { wave: 'triangle', frequency: 392, gain: 0.08, decay: 0.05 });
                    break;

                case 'backspace':
                    tone(ctx, { wave: 'triangle', frequency: 440, gain: 0.1, decay: 0.05, slide: 330 });
                    break;

                case 'move':   // a tick, no note: nothing was written
                    thud(ctx, { type: 'highpass', frequency: 2500, q: 1, gain: 0.08, decay: 0.012 });
                    break;

                default:
                    tone(ctx, { wave: 'triangle', frequency: note, gain: 0.1, decay: 0.045 });
            }
        },
    };

    function play(set, kind, keyCode) {
        const ctx = sets[set] ? getContext() : null;

        if (ctx) {
            sets[set](ctx, kind, keyCode);
        }
    }

    return {
        names: Object.keys(sets),
        play,
    };
})();

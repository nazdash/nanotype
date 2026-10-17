import app from './app';

// The ripples: while the page has no text, slow waves of grey characters drift
// across a clean screen, the characters inside them changing now and then.
// Under it is water: a click drops a stone, and where the wave passes a run of
// characters lights along the row in the accent, soft on every side, tailing
// off to the right, the characters inside it changing fast. The first
// keystroke fades it (CSS); it never shows over text.
//
// Two canvases, no dependency: the grey, redrawn only at the cells whose level
// changes, ten times a second; and the light over it, drawn only while the water
// moves. The water is the classic two-buffer ripple on a square grid. Nothing
// moves under reduced motion but the grey.
export default (function () {
    const FONT = 12;            // px
    const GREY = 0.12;          // the grey characters, at their fullest
    const TIDE = 0.9;           // the grey waves' sum reaches full grey here; higher means less grey
    const LEVELS = 8;           // steps of grey across an edge
    const TICK = 6;             // frames between steps of the grey: slow, and cheap
    const PACE = 2;             // frames between steps of the water: its speed
    const LINGER = 0.88;        // how much of a cell's light stays to the next frame
    const REACH = 3;            // cells of water read around a character, so the ring is one soft band
    const BRIGHT = 14;          // the water's height that is full light
    const CLEARANCE = 56;       // px: the ripples fade to nothing this far before a word
    const DAMPING = 0.99;       // how long a ripple lives
    const CALM = 0.3;           // below this the water is still
    const STIRRED = 0.3;        // a character's chance to change, a frame, under a full wave
    const CHURN = 0.02;         // a grey character's chance to change, a step
    const STONE = 7;            // cells: how wide a click presses the water
    const TAIL = 0.9;           // how much of the light a cell passes to the next along the row
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');

    let canvas, context;            // the light
    let layer, layerContext;        // the grey, under it
    let scale = 1;
    let columns = 0;            // character cells
    let rows = 0;
    let cellWidth = 0;
    let cellHeight = 0;
    let waterRows = 0;          // the water's grid is columns wide and square-celled, so taller
    let chars, sample;          // per cell: its character, and its cell of water
    let light;                  // per cell: the light on it this frame
    let grey;                   // per cell: its level of grey now, 0 to LEVELS
    let shade;                  // per cell: 1 in the open, 0 under a word, eased between
    let ticks = 0;
    let ink = '';               // the grey's colour as last drawn: the theme may change under the ripples
    let height, previous;       // the water now and a step ago
    let shore;                  // per water cell: 1 inside, falling towards the edges, where waves die instead of bouncing
    let on = false;
    let moving = false;         // the water has a wave in it
    let queued = false;         // a frame is requested
    let timer = null;           // the resting loop's wait, and the frame request after it
    let request = 0;

    function init() {
        canvas = document.createElement('canvas');
        layer = document.createElement('canvas');
        canvas.className = layer.className = 'ripples';
        canvas.setAttribute('aria-hidden', 'true');
        layer.setAttribute('aria-hidden', 'true');
        app.body.prepend(canvas);
        app.body.prepend(layer);   // under the light
        context = canvas.getContext('2d');
        layerContext = layer.getContext('2d');

        window.addEventListener('resize', () => { if (on) { layout(); } });
        document.addEventListener('visibilitychange', () => { if (on && !document.hidden) { queue(); } });
        // a click on the page, not on a word, a menu or a dialog
        document.addEventListener('click', (event) => {
            if (on && !still.matches && !event.target.closest('button, a, input, .ui, .status, .picker, .overlay')) {
                dent(event.clientX / cellWidth, event.clientY / cellWidth, 60);

                // the resting loop is waiting for its next step: the water cannot.
                // Whatever is pending, the wait or the frame after it, is dropped
                // for a fresh frame, so there is never a second loop
                if (!moving) {
                    clearTimeout(timer);
                    cancelAnimationFrame(request);
                    queued = false;
                    moving = true;
                    queue();
                }
            }
        });
    }

    // On while the page is empty and shown, and not a shared document
    function set(empty) {
        const next = empty && !!canvas && !app.shared.active && app.body.style.display !== 'none';

        if (next && !on) {
            layout();
            queue();
        } else if (!next && on) {
            // off (the setting, a shared document, text): nothing may stay on screen
            context.clearRect(0, 0, window.innerWidth, window.innerHeight);
            layerContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }

        on = next;
    }

    // One frame at a time: at the screen's rate while a wave moves, else only
    // when the grey is due to step, so resting ripples cost next to nothing
    function queue() {
        if (queued) {
            return;
        }

        queued = true;

        if (moving) {
            request = requestAnimationFrame(frame);
        } else {
            timer = setTimeout(() => { request = requestAnimationFrame(frame); }, 1000 / 60 * TICK);
        }
    }

    // The canvases and the grid for the viewport, then the grid filled in
    function layout() {
        scale = window.devicePixelRatio || 1;
        canvas.width = layer.width = window.innerWidth * scale;
        canvas.height = layer.height = window.innerHeight * scale;

        for (const target of [context, layerContext]) {
            target.setTransform(scale, 0, 0, scale, 0, 0);
            target.font = `${FONT}px 'Nanotype Mono', monospace`;
            target.textBaseline = 'top';
        }

        cellWidth = layerContext.measureText('M').width || FONT * 0.6;
        cellHeight = FONT * 1.3;
        columns = Math.ceil(window.innerWidth / cellWidth);
        rows = Math.ceil(window.innerHeight / cellHeight);
        waterRows = Math.ceil(window.innerHeight / cellWidth);
        fill();
    }

    // Every cell of the grid and of the water, from nothing: characters, the
    // the shore, which water cell each character reads; then the
    // first grey
    function fill() {
        chars = new Uint8Array(columns * rows);
        grey = new Uint8Array(columns * rows);
        shade = new Float32Array(columns * rows);
        light = new Float32Array(columns * rows);
        sample = new Uint32Array(columns * rows);
        height = new Float32Array(columns * waterRows);
        previous = new Float32Array(columns * waterRows);
        shore = new Float32Array(columns * waterRows);

        for (let i = 0; i < shore.length; i++) {
            const toEdge = Math.min(i % columns, columns - 1 - i % columns, Math.floor(i / columns), waterRows - 1 - Math.floor(i / columns));

            shore[i] = toEdge >= 12 ? 1 : 0.8 + 0.2 * toEdge / 12;
        }
        moving = false;

        for (let i = 0; i < chars.length; i++) {
            chars[i] = Math.floor(Math.random() * CHARS.length);
            sample[i] = Math.min(waterRows - 1, Math.floor((Math.floor(i / columns) + 0.5) * cellHeight / cellWidth)) * columns + (i % columns);
        }

        ink = '';   // sizing a canvas resets its ink along with everything else on it
        tide(0);
    }

    function draw(target, i) {
        target.fillText(CHARS[chars[i]], (i % columns) * cellWidth, Math.floor(i / columns) * cellHeight);
    }

    function clear(i) {
        layerContext.clearRect((i % columns) * cellWidth, Math.floor(i / columns) * cellHeight, cellWidth, cellHeight);
    }

    // Where the words are: the welcome's lines (both sides in markdown mode), the
    // column's groups, the status line's halves. A cell under one is dark; the
    // grey and the light ease in over CLEARANCE from their edges, so nothing runs under a word
    // and nothing has an edge
    function clearance() {
        const rects = [...document.querySelectorAll('.welcome .wordmark, .welcome .divider, .welcome p, .preview-welcome p, .ui .group, .status-left, .status-right')]
            .map(element => element.getBoundingClientRect())
            .filter(rect => rect.width > 0 && rect.height > 0);

        for (let i = 0; i < shade.length; i++) {
            const x = (i % columns + 0.5) * cellWidth;
            const y = (Math.floor(i / columns) + 0.5) * cellHeight;

            let near = CLEARANCE;

            for (const rect of rects) {
                const dx = Math.max(rect.left - x, 0, x - rect.right);
                const dy = Math.max(rect.top - y, 0, y - rect.bottom);

                near = Math.min(near, Math.hypot(dx, dy));
            }

            const t = near / CLEARANCE;

            shade[i] = t * t * (3 - 2 * t);
        }
    }

    // The grey waves: four slow sheets of sine crossing the screen at different
    // angles and speeds (the short fourth gives the edges their rounded lobes);
    // where the sum is high the cell is grey, rising through a few levels at the
    // edge, so the grey drifts as soft, rounded shapes. Only a cell whose level changed, or that changes
    // its character, is redrawn, so a step costs little
    function tide(t) {
        clearance();

        // a new theme: every grey cell is drawn again in the new ink
        const colour = getComputedStyle(app.body).color;

        if (colour !== ink) {
            ink = layerContext.fillStyle = colour;
            grey.fill(255);
        }

        for (let i = 0; i < chars.length; i++) {
            const x = i % columns;
            const y = Math.floor(i / columns) * cellHeight / cellWidth;   // in square cells, like x
            const sum = Math.sin(x / 30 + y / 60 + t * 0.3) + 0.7 * Math.sin(x / 50 - y / 35 - t * 0.2) + 0.5 * Math.sin(y / 20 + x / 80 + t * 0.13) + 0.5 * Math.sin(x / 14 - y / 17 + t * 0.21);
            const level = Math.round(Math.max(0, Math.min(1, (sum - TIDE + 0.8) / 0.8)) * shade[i] * LEVELS);

            if (level !== grey[i] || (level && Math.random() < CHURN)) {
                grey[i] = level;
                clear(i);

                if (level) {
                    chars[i] = Math.floor(Math.random() * CHARS.length);
                    layerContext.globalAlpha = GREY * level / LEVELS;
                    draw(layerContext, i);
                }
            }
        }
    }

    // A stone in the water: the cells around a point pressed down, deepest in the
    // middle and easing out, so the ring that follows is broad and soft
    function dent(column, row, depth) {
        for (let r = Math.max(1, Math.floor(row) - STONE); r <= Math.min(waterRows - 2, Math.floor(row) + STONE); r++) {
            for (let c = Math.max(1, Math.floor(column) - STONE); c <= Math.min(columns - 2, Math.floor(column) + STONE); c++) {
                const d = Math.hypot(c - column, r - row) / STONE;

                if (d < 1) {
                    height[r * columns + c] -= depth * (1 - d) * (1 - d);
                }
            }
        }
    }

    // One step of the water: each cell takes the mean of its neighbours' height,
    // minus its own a step ago, damped. Near the edges the damping grows, so a
    // wave runs off the screen instead of bouncing back from it.
    function step() {
        let loudest = 0;

        for (let row = 1; row < waterRows - 1; row++) {
            for (let column = 1; column < columns - 1; column++) {
                const i = row * columns + column;

                previous[i] = ((height[i - 1] + height[i + 1] + height[i - columns] + height[i + columns]) / 2 - previous[i]) * DAMPING * shore[i];
                loudest = Math.max(loudest, Math.abs(previous[i]));
            }
        }

        [height, previous] = [previous, height];
        moving = loudest >= CALM;
    }

    // The wave as light: each character reads the water around it (REACH cells
    // each way, the middle counting double), keeps some of last frame's light,
    // and passes most of it to the right, so a ring is one soft band with a tail;
    // eased in from nothing, so the light has no hard edge
    function shine() {
        context.fillStyle = getComputedStyle(app.body).getPropertyValue('--accent');

        for (let i = 0; i < chars.length; i++) {
            const w = sample[i];

            let depth = Math.abs(height[w]) * 2;

            for (let d = 1; d <= REACH; d++) {
                depth += Math.abs(height[w - d]) + Math.abs(height[w + d]) + Math.abs(height[w - d * columns] || 0) + Math.abs(height[w + d * columns] || 0);
            }

            const lit = Math.max(Math.min(1, depth / (2 + REACH * 4) / BRIGHT), light[i] * LINGER, i % columns ? light[i - 1] * TAIL : 0);

            light[i] = lit;

            if (lit > 0.03) {
                if (Math.random() < lit * STIRRED) {
                    chars[i] = Math.floor(Math.random() * CHARS.length);
                }

                context.globalAlpha = Math.min(0.65, lit * lit) * shade[i];
                draw(context, i);
            }
        }

        context.globalAlpha = 1;
    }

    function frame(now) {
        queued = false;

        if (!on || document.hidden) {
            return;
        }

        if (!moving || ++ticks % TICK === 0) {
            tide(now / 1000);
        }

        if (moving) {
            context.clearRect(0, 0, window.innerWidth, window.innerHeight);

            if (ticks % PACE === 0) {
                step();
            }

            shine();

            // the water went still: the last of the light goes with it
            if (!moving) {
                context.clearRect(0, 0, window.innerWidth, window.innerHeight);
                light.fill(0);
            }
        }

        queue();
    }

    return {
        init,
        set,
    };
})();

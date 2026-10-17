// node --test test/
// tidy: fixed rules on pasted text; what it joins, what it leaves alone
import test from 'node:test';
import assert from 'node:assert/strict';
import tidy from '../src/js/components/tidy.js';

const run = (text) => tidy.tidy(text).text;

test('hard-wrapped sentences from a PDF become one line each', () => {
    const pdf = 'The quick brown fox jumps over the\nlazy dog and keeps on running until\nthe evening comes. Then it sleeps.\nThe next morning it starts again.';
    assert.equal(run(pdf), 'The quick brown fox jumps over the lazy dog and keeps on running until the evening comes. Then it sleeps.\nThe next morning it starts again.');
    assert.equal(tidy.tidy(pdf).counts.joined, 2);
});

test('a line that ends a sentence is never joined, nor one followed by a capital', () => {
    assert.equal(run('Roses are red,\nViolets are blue.'), 'Roses are red,\nViolets are blue.');
    assert.equal(run('First line.\nsecond starts low'), 'First line.\nsecond starts low');
    assert.equal(run('He said "no."\nthen left'), 'He said "no."\nthen left');
    assert.equal(run('Dear Sam,\nthanks for the note'), 'Dear Sam, thanks for the note');
});

test('headings and tables stand on their own; a list item or a quote takes its continuation', () => {
    assert.equal(run('# Title\nnot joined'), '# Title\nnot joined');
    assert.equal(run('| a |  b |\n| - | - |'), '| a |  b |\n| - | - |');
    assert.equal(run('- one item that wraps\n  onto the next line\n- two'), '- one item that wraps onto the next line\n- two');
    assert.equal(run('1. first\nsecond'), '1. first second');
    assert.equal(run('> quoted\nmore'), '> quoted more');
});

test('an indented continuation (copied from a list or a chat) joins too', () => {
    assert.equal(run('a browser suite for the command and\n    both undo paths.'), 'a browser suite for the command and both undo paths.');
    assert.equal(run('a line\n\tTabbed next'), 'a line\nTabbed next');
});

test('code fences are untouched, including tabs and blank lines inside', () => {
    const code = 'text\n```\n\tif (x)\n\n\n\t\treturn   y\n```\nafter';
    assert.equal(run(code), code);
});

test('tabs, runs of spaces, non-breaking spaces and trailing spaces', () => {
    assert.equal(run('\t\tIndented  with   tabs\tand   runs  '), 'Indented with tabs and runs');
    assert.equal(run('a b  c'), 'a b c');
    assert.equal(run('  - nested item\n    - deeper'), '  - nested item\n    - deeper');
    assert.equal(run(' one leading space.\n    Four, which markdown would make code.'), 'one leading space.\nFour, which markdown would make code.');
    assert.equal(tidy.tidy('a\tb\nc\td').counts.tabs, 2);
    assert.equal(tidy.tidy('a  b\nc d \ne f').counts.spaces, 2);
});

test('stacks of blank lines become one', () => {
    assert.equal(run('one\n\n\n\ntwo\n\n\nthree'), 'one\n\ntwo\n\nthree');
    assert.equal(tidy.tidy('one\n\n\n\ntwo').counts.blanks, 2);
    assert.equal(run('one\n\ntwo'), 'one\n\ntwo');
});

test('bullets become markdown', () => {
    assert.equal(run('• milk\n· eggs\n  ◦ brown\n– bread'), '- milk\n- eggs\n  - brown\n- bread');
    assert.equal(run('a – b'), 'a – b');   // a dash inside a line is a dash
});

test('cyrillic lowercase joins too', () => {
    assert.equal(run('Быстрая лиса прыгает через\nленивую собаку. Конец.'), 'Быстрая лиса прыгает через ленивую собаку. Конец.');
});

test('nothing to do leaves the text as it is', () => {
    const clean = '# Notes\n\nOne sentence. Another one.\n\n- a\n- b\n';
    assert.equal(run(clean), clean);
    assert.equal(tidy.describe(tidy.tidy(clean).counts), '');
});

test('the description names what was done', () => {
    assert.equal(tidy.describe({ joined: 1, blanks: 2, tabs: 1, bullets: 0 }), '1 line joined, 2 blank lines removed, tabs gone');
    assert.equal(tidy.describe({ joined: 0, blanks: 0, tabs: 0, bullets: 3 }), '3 bullets made markdown');
    assert.equal(tidy.describe({ joined: 0, blanks: 0, tabs: 0, bullets: 0, spaces: 1 }), 'spaces evened');
});

// node --test test/
// A document is named by its first line (util.firstLine) and files after that name
import test from 'node:test';
import assert from 'node:assert/strict';
import util from '../src/js/components/utils.js';

const long = 'word '.repeat(30).trim();   // 149 characters

test('the first line with text names the document', () => {
    assert.equal(util.firstLine('Shopping\n\nmilk'), 'Shopping');
    assert.equal(util.firstLine('\n\n  \nSecond block first'), 'Second block first');
    assert.equal(util.firstLine('  padded line  '), 'padded line');
    assert.equal(util.firstLine(''), '');
    assert.equal(util.firstLine(undefined), '');
});

test('markdown marks are not part of the name', () => {
    assert.equal(util.firstLine('# Heading'), 'Heading');
    assert.equal(util.firstLine('### deep'), 'deep');
    assert.equal(util.firstLine('- milk'), 'milk');
    assert.equal(util.firstLine('* [ ] buy milk'), 'buy milk');
    assert.equal(util.firstLine('1. first'), 'first');
    assert.equal(util.firstLine('> quoted'), 'quoted');
    assert.equal(util.firstLine('#hashtag not a heading'), '#hashtag not a heading');
    assert.equal(util.firstLine('---'), '---');
});

test('a frontmatter block is skipped, its title used', () => {
    assert.equal(util.firstLine('---\ntitle: Notes\ntags: a\n---\n# Hi'), 'Notes');
    assert.equal(util.firstLine('---\nTitle: "Quoted"\n---\nbody'), 'Quoted');
    assert.equal(util.firstLine('---\ntags: a\n---\n\n# After'), 'After');
    assert.equal(util.firstLine('---\ntitle:\n---\nbody'), 'body');
    assert.equal(util.firstLine('---\nunclosed\nblock'), '---');
});

test('a long line is cut at a word', () => {
    const name = util.firstLine(long);
    assert.ok(name.length <= 50 && name.length > 40, name);
    assert.ok(!name.endsWith(' ') && long.startsWith(name));
    assert.equal(util.firstLine('x'.repeat(100)).length, 50);
});

test('file names are the name made safe, unique when asked', () => {
    assert.equal(util.fileName('Notes', 'md'), 'Notes.md');
    assert.equal(util.fileName('a/b:c*d? "quoted"', 'txt'), 'abcd quoted.txt');
    assert.equal(util.fileName('', 'md'), 'untitled.md');
    const taken = new Set();
    assert.equal(util.fileName('Notes', 'md', taken), 'Notes.md');
    assert.equal(util.fileName('Notes', 'md', taken), 'Notes (2).md');
    assert.equal(util.fileName('Notes', 'md', taken), 'Notes (3).md');
});

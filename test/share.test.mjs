// node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import share from '../src/js/components/share.js';

const words = readFileSync(new URL('../public/words.txt', import.meta.url), 'utf8').split('\n').filter(Boolean);
const story = Array.from({ length: 15000 }, (_, i) => `word${i % 977}`).join(' ');
const docs = {
    ascii: { text: 'first line\nsecond\n\nfourth after a blank' },
    cyrillic: { text: 'Привет, мир.\nВторая строка.' },
    emoji: { text: 'done ✅ 🎉\n\ttabbed\n   three leading spaces' },
    odd: { text: 'a #title. with=dots&more' },
    story: { text: story },
    empty: { text: '' },
};

test('public link round trip', () => {
    for (const [name, doc] of Object.entries(docs)) {
        const fragment = share.encode(doc);

        assert.match(fragment, /^s=1\.[A-Za-z0-9_-]+$/, name);
        assert.deepEqual(share.decode(fragment), doc, name);
        assert.deepEqual(share.decode('#' + fragment), doc, `${name} with #`);
    }
});

test('a story of 15,000 words compresses to a link under 40k characters', () => {
    assert.ok(share.encode(docs.story).length < 40000);
});

test('inspect', () => {
    assert.equal(share.inspect('').kind, 'none');
    assert.equal(share.inspect('#').kind, 'none');
    assert.equal(share.inspect('#other=1').kind, 'none');
    assert.equal(share.inspect(share.encode(docs.ascii)).kind, 'public');
    assert.equal(share.inspect('#s=1.').kind, 'incomplete');
    assert.equal(share.inspect('#s=1e.').kind, 'incomplete');
    assert.equal(share.inspect('#s=2.abc').kind, 'newer');
    assert.equal(share.inspect('#s=1.ab+c').kind, 'none');
});

test('damaged public links decode to null, never throw', () => {
    const fragment = share.encode(docs.ascii);

    assert.equal(share.decode(fragment.slice(0, -5)), null);
    assert.equal(share.decode('s=1.' + fragment.slice(4, 10)), null);
    assert.equal(share.decode('s=1.AAAA'), null);
    assert.equal(share.decode('s=1.' + Buffer.from('{"nope":1}').toString('base64url')), null);
    assert.equal(share.decode('#s=2.abc'), null);
    assert.equal(share.decode('nothing'), null);
});

test('seed normalisation', () => {
    assert.equal(share.normaliseSeed('  Amber-Lantern quiet  fox '), 'amber lantern quiet fox');
    assert.equal(share.normaliseSeed('amber\tlantern\nquiet---fox'), 'amber lantern quiet fox');
    assert.equal(share.normaliseSeed('Ключ Дверь'), 'ключ дверь');
    assert.equal(share.normaliseSeed(''), '');
    assert.equal(share.normaliseSeed(undefined), '');
});

test('private link round trip, seed in odd spacing and capitals', async () => {
    for (const [name, doc] of Object.entries(docs)) {
        const fragment = await share.encrypt(doc, 'amber lantern quiet fox');

        assert.match(fragment, /^s=1e\.[A-Za-z0-9_-]+$/, name);
        assert.deepEqual(await share.decrypt(fragment, 'amber lantern quiet fox'), doc, name);
        assert.deepEqual(await share.decrypt('#' + fragment, '  Amber-Lantern  QUIET fox'), doc, `${name} odd seed`);
    }
});

test('a seed in Russian works', async () => {
    const fragment = await share.encrypt(docs.cyrillic, 'ключ дверь окно');

    assert.deepEqual(await share.decrypt(fragment, 'Ключ Дверь Окно'), docs.cyrillic);
});

test('wrong seed, changed link and truncated link stay closed', async () => {
    const fragment = await share.encrypt(docs.ascii, 'amber lantern quiet fox');

    assert.equal(await share.decrypt(fragment, 'amber lantern quiet cat'), null);
    assert.equal(await share.decrypt(fragment, ''), null);
    assert.equal(await share.decrypt(fragment.slice(0, -3), 'amber lantern quiet fox'), null);
    assert.equal(await share.decrypt(fragment.slice(0, 20), 'amber lantern quiet fox'), null);
    const tampered = fragment.slice(0, -2) + (fragment.endsWith('A') ? 'B' : 'A') + fragment.slice(-1);
    assert.equal(await share.decrypt(tampered, 'amber lantern quiet fox'), null);
    assert.equal(await share.decrypt(share.encode(docs.ascii), 'amber lantern quiet fox'), null);
});

test('two links for the same document differ (fresh salt and nonce)', async () => {
    const a = await share.encrypt(docs.ascii, 'seed');
    const b = await share.encrypt(docs.ascii, 'seed');

    assert.notEqual(a, b);
});

test('suggested seed: four words from the list, random each time', async () => {
    const seed = await share.suggestSeed(words);
    const parts = seed.split(' ');

    assert.equal(parts.length, 4);
    parts.forEach(word => assert.ok(words.includes(word), word));
    assert.notEqual(seed, await share.suggestSeed(words));
});

test('suggested seed without the list: ten letters and digits', async () => {
    const seed = await share.suggestSeed();   // fetch('/words.txt') fails in node

    assert.match(seed, /^[a-z2-9]{10}$/);
});

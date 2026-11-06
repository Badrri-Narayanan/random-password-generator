const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../generator.js');
const WORDLIST = require('../wordlist.js');

const RUNS = 300;

test('password has the requested length and only allowed characters', () => {
  for (let i = 0; i < RUNS; i++) {
    const { value } = G.generatePassword({ length: 20, symbols: false });
    assert.equal(value.length, 20);
    assert.match(value, /^[A-Za-z0-9]+$/);
  }
});

test('requireEach guarantees one character from every selected type', () => {
  for (let i = 0; i < RUNS; i++) {
    const { value } = G.generatePassword({ length: 4 });
    assert.match(value, /[a-z]/);
    assert.match(value, /[A-Z]/);
    assert.match(value, /[0-9]/);
    assert.match(value, /[^A-Za-z0-9]/);
  }
});

test('excluded and ambiguous characters never appear', () => {
  const exclude = 'aeiouAEIOU$"\'';
  for (let i = 0; i < RUNS; i++) {
    const { value } = G.generatePassword({ length: 64, exclude, excludeAmbiguous: true });
    for (const c of exclude + G.AMBIGUOUS) assert.ok(!value.includes(c), `found ${c} in ${value}`);
  }
});

test('numbers-only password works', () => {
  const { value, entropy } = G.generatePassword({ length: 10, lower: false, upper: false, symbols: false });
  assert.match(value, /^\d{10}$/);
  assert.ok(Math.abs(entropy - 10 * Math.log2(10)) < 1e-9);
});

test('clear errors for impossible configurations', () => {
  assert.throws(() => G.generatePassword({ length: 12, lower: false, upper: false, digits: false, symbols: false }), G.GeneratorError);
  assert.throws(() => G.generatePassword({ length: 12, lower: true, upper: false, digits: false, symbols: false, exclude: G.CHARSETS.lower }), G.GeneratorError);
  assert.throws(() => G.generatePassword({ length: 3 }), G.GeneratorError);
  assert.throws(() => G.generatePassword({ length: 999 }), G.GeneratorError);
});

test('randomInt is roughly uniform', () => {
  const counts = new Array(6).fill(0);
  const n = 60000;
  for (let i = 0; i < n; i++) counts[G.randomInt(6)]++;
  for (const c of counts) assert.ok(Math.abs(c - n / 6) < n / 6 * 0.08, `skewed counts ${counts}`);
});

test('passphrase has the right shape', () => {
  for (let i = 0; i < RUNS; i++) {
    const { value } = G.generatePassphrase({ words: 5, wordlist: WORDLIST, separator: 'dash', capitalize: true, includeNumber: true });
    const parts = value.split('-');
    assert.equal(parts.length, 5);
    assert.ok(parts.every((p) => /^[A-Z][a-z]+\d?$/.test(p)), value);
    assert.equal((value.match(/\d/g) || []).length, 1);
  }
});

test('passphrase with random-digit separators', () => {
  const { value } = G.generatePassphrase({ words: 4, wordlist: WORDLIST, separator: 'digits', capitalize: false, includeNumber: false });
  assert.match(value, /^[a-z]+\d[a-z]+\d[a-z]+\d[a-z]+$/);
});

test('word list has no duplicates and enough words', () => {
  assert.equal(new Set(WORDLIST).size, WORDLIST.length);
  assert.ok(WORDLIST.length >= 500, `only ${WORDLIST.length} words`);
});

test('PIN avoids weak patterns', () => {
  for (const weak of ['0000', '1234', '9876', '890123', '111111']) assert.ok(G.isWeakPin(weak), weak);
  for (const ok of ['1357', '2048', '9182']) assert.ok(!G.isWeakPin(ok), ok);
  for (let i = 0; i < RUNS; i++) {
    const { value } = G.generatePin({ length: 4 });
    assert.match(value, /^\d{4}$/);
    assert.ok(!G.isWeakPin(value));
  }
});

test('tokens have the right format', () => {
  assert.match(G.generateToken({ format: 'hex', bytes: 32 }).value, /^[0-9a-f]{64}$/);
  assert.match(G.generateToken({ format: 'base64url', bytes: 32 }).value, /^[A-Za-z0-9_-]{43}$/);
  assert.match(
    G.generateToken({ format: 'uuid' }).value,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test('strength labels and crack time', () => {
  assert.equal(G.assessStrength(20).label, 'Very weak');
  assert.equal(G.assessStrength(104).label, 'Very strong');
  assert.equal(G.assessStrength(20).crackTime, 'instantly');
  assert.equal(G.assessStrength(256).crackTime, 'longer than the age of the universe');
});

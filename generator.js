/*
 * Pure generation logic. No DOM access, so it runs in the browser (window.PwGen)
 * and in Node for tests (module.exports).
 * All randomness comes from crypto.getRandomValues; never Math.random.
 */
(function (global) {
  'use strict';

  const CHARSETS = {
    lower: 'abcdefghijklmnopqrstuvwxyz',
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    digits: '0123456789',
    symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~',
  };

  // Characters that are easy to confuse when read aloud or typed from a screen.
  const AMBIGUOUS = 'Il1|O0o';

  const LIMITS = {
    passwordLength: [4, 256],
    passphraseWords: [3, 16],
    pinLength: [4, 16],
    tokenBytes: [8, 128],
  };

  class GeneratorError extends Error {}

  function requireIntInRange(value, [min, max], name) {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new GeneratorError(`${name} must be a whole number between ${min} and ${max}.`);
    }
    return value;
  }

  // Unbiased integer in [0, max) using rejection sampling (avoids modulo bias).
  function randomInt(max) {
    if (!Number.isInteger(max) || max <= 0 || max > 2 ** 32) {
      throw new RangeError(`randomInt: max out of range: ${max}`);
    }
    const limit = Math.floor(2 ** 32 / max) * max;
    const buf = new Uint32Array(1);
    let x;
    do {
      global.crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % max;
  }

  function randomBytes(n) {
    const b = new Uint8Array(n);
    global.crypto.getRandomValues(b);
    return b;
  }

  function pick(arr) {
    return arr[randomInt(arr.length)];
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildPools(o) {
    const excluded = new Set(o.exclude || '');
    if (o.excludeAmbiguous) for (const c of AMBIGUOUS) excluded.add(c);
    const pools = [];
    for (const key of ['lower', 'upper', 'digits', 'symbols']) {
      if (!o[key]) continue;
      const chars = [...CHARSETS[key]].filter((c) => !excluded.has(c));
      if (chars.length) pools.push(chars);
    }
    return pools;
  }

  function generatePassword(opts) {
    const o = { lower: true, upper: true, digits: true, symbols: true, requireEach: true, ...opts };
    const length = requireIntInRange(o.length, LIMITS.passwordLength, 'Length');
    const pools = buildPools(o);
    if (!pools.length) {
      throw new GeneratorError('Pick at least one character type, and don\'t exclude every character in it.');
    }
    if (o.requireEach && length < pools.length) {
      throw new GeneratorError(`Length must be at least ${pools.length} to include every selected type.`);
    }
    const all = pools.flat();
    const out = o.requireEach ? pools.map(pick) : [];
    while (out.length < length) out.push(pick(all));
    return { value: shuffle(out).join(''), entropy: length * Math.log2(all.length) };
  }

  const SEPARATORS = { dash: '-', dot: '.', underscore: '_', space: ' ', none: '' };

  function generatePassphrase(opts) {
    const o = { separator: 'dash', capitalize: true, includeNumber: true, ...opts };
    const count = requireIntInRange(o.words, LIMITS.passphraseWords, 'Word count');
    const list = o.wordlist;
    if (!Array.isArray(list) || list.length < 2) throw new GeneratorError('Word list is missing.');

    const words = Array.from({ length: count }, () => pick(list));
    const shaped = o.capitalize ? words.map((w) => w[0].toUpperCase() + w.slice(1)) : words;
    let entropy = count * Math.log2(list.length);

    if (o.includeNumber) {
      const i = randomInt(shaped.length);
      shaped[i] += String(randomInt(10));
      entropy += Math.log2(10 * count);
    }

    let value;
    if (o.separator === 'digits') {
      value = shaped.reduce((acc, w, i) => (i === 0 ? w : acc + randomInt(10) + w), '');
      entropy += (count - 1) * Math.log2(10);
    } else {
      const sep = SEPARATORS[o.separator];
      if (sep === undefined) throw new GeneratorError(`Unknown separator: ${o.separator}`);
      value = shaped.join(sep);
    }
    return { value, entropy };
  }

  // Rejects PINs that are trivially guessable: all one digit, or a straight run (1234, 9876, 8901).
  function isWeakPin(pin) {
    const d = [...pin].map(Number);
    const same = d.every((x) => x === d[0]);
    const asc = d.every((x, i) => i === 0 || x === (d[i - 1] + 1) % 10);
    const desc = d.every((x, i) => i === 0 || x === (d[i - 1] + 9) % 10);
    return same || asc || desc;
  }

  function generatePin(opts) {
    const o = { avoidWeak: true, ...opts };
    const length = requireIntInRange(o.length, LIMITS.pinLength, 'PIN length');
    let pin;
    do {
      pin = Array.from({ length }, () => randomInt(10)).join('');
    } while (o.avoidWeak && isWeakPin(pin));
    return { value: pin, entropy: length * Math.log2(10) };
  }

  function toHex(bytes) {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function generateToken(opts) {
    const o = { format: 'hex', bytes: 32, ...opts };
    if (o.format === 'uuid') {
      const b = randomBytes(16);
      b[6] = (b[6] & 0x0f) | 0x40; // version 4
      b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
      const h = toHex(b);
      const value = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
      return { value, entropy: 122 };
    }
    const n = requireIntInRange(o.bytes, LIMITS.tokenBytes, 'Byte count');
    const b = randomBytes(n);
    if (o.format === 'hex') return { value: toHex(b), entropy: n * 8 };
    if (o.format === 'base64url') {
      const value = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return { value, entropy: n * 8 };
    }
    throw new GeneratorError(`Unknown token format: ${o.format}`);
  }

  // Offline attack against a fast hash: ~10 billion guesses per second.
  const GUESSES_PER_SECOND = 1e10;

  function formatDuration(seconds) {
    if (seconds < 1) return 'instantly';
    const units = [
      ['year', 31557600],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
      ['second', 1],
    ];
    if (seconds > 1.4e10 * 31557600) return 'longer than the age of the universe';
    if (seconds > 1e6 * 31557600) return 'millions of years';
    for (const [name, size] of units) {
      if (seconds >= size) {
        const n = Math.round(seconds / size);
        return `${n.toLocaleString('en-US')} ${name}${n === 1 ? '' : 's'}`;
      }
    }
    return 'instantly';
  }

  function assessStrength(entropy) {
    const levels = [
      [28, 'Very weak'],
      [36, 'Weak'],
      [60, 'Fair'],
      [80, 'Strong'],
      [Infinity, 'Very strong'],
    ];
    const level = levels.findIndex(([max]) => entropy < max);
    const seconds = 2 ** (entropy - 1) / GUESSES_PER_SECOND;
    return { level, label: levels[level][1], crackTime: formatDuration(seconds) };
  }

  const api = {
    CHARSETS,
    AMBIGUOUS,
    LIMITS,
    GeneratorError,
    randomInt,
    isWeakPin,
    generatePassword,
    generatePassphrase,
    generatePin,
    generateToken,
    assessStrength,
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else global.PwGen = api;
})(globalThis);

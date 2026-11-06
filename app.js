(function () {
  'use strict';

  const { generatePassword, generatePassphrase, generatePin, generateToken, assessStrength } = window.PwGen;
  const STORAGE_KEY = 'pwgen.settings.v1';
  const HISTORY_LIMIT = 15;

  const DEFAULTS = {
    mode: 'password',
    password: {
      length: 16,
      lower: true,
      upper: true,
      digits: true,
      symbols: true,
      exclude: '',
      excludeAmbiguous: false,
      requireEach: true,
    },
    passphrase: { words: 6, separator: 'dash', capitalize: true, includeNumber: true },
    pin: { length: 6, avoidWeak: true },
    token: { format: 'hex', bytes: 32 },
    count: 1,
    autoClear: 0,
  };

  const PRESETS = {
    balanced: { ...DEFAULTS.password },
    wifi: { ...DEFAULTS.password, length: 20, symbols: false, excludeAmbiguous: true },
    env: { ...DEFAULTS.password, length: 32, exclude: '"\'`\\$!&;|<>(){}[]#*?~' },
    url: { ...DEFAULTS.password, length: 24, exclude: '!@#$%^&*()=+[]{};:,<>?/' },
    legacy: { ...DEFAULTS.password, length: 12, exclude: '()[]{};:,.<>?/~-_=+' },
    max: { ...DEFAULTS.password, length: 64 },
  };

  const BUTTON_LABELS = {
    password: 'Generate me a password',
    passphrase: 'Generate me a passphrase',
    pin: 'Generate me a PIN',
    token: 'Generate me a token',
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  const els = {
    result: $('#result'),
    error: $('#error'),
    strength: $('#strength'),
    strengthText: $('#strength-text'),
    generate: $('#generate'),
    history: $('#history'),
    toast: $('#toast'),
    tokBytesField: $('#tok-bytes-field'),
  };

  let state = loadSettings();
  let current = [];
  let history = [];
  let clipboardTimer = null;
  let toastTimer = null;


  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function loadSettings() {
    const base = clone(DEFAULTS);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) return base;
      for (const key of Object.keys(base)) {
        if (!(key in saved)) continue;
        base[key] = typeof base[key] === 'object' ? { ...base[key], ...saved[key] } : saved[key];
      }
    } catch {
      /* storage unavailable or corrupt: fall back to defaults */
    }
    return base;
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* private mode etc. */
    }
  }

  function getPath(path) {
    return path.split('.').reduce((o, k) => o[k], state);
  }

  function setPath(path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    keys.reduce((o, k) => o[k], state)[last] = value;
  }

  function readInput(input) {
    if (input.type === 'checkbox') return input.checked;
    if (input.type === 'number' || input.type === 'range') return input.valueAsNumber;
    if (input.dataset.setting === 'token.bytes' || input.dataset.setting === 'autoClear') return Number(input.value);
    return input.value;
  }

  function syncInputs() {
    for (const input of $$('[data-setting]')) {
      const value = getPath(input.dataset.setting);
      if (input.type === 'checkbox') input.checked = value;
      else if (input !== document.activeElement || input.type !== 'number') input.value = value;
    }
    els.tokBytesField.hidden = state.token.format === 'uuid';
  }


  function generateOne() {
    switch (state.mode) {
      case 'password':
        return generatePassword(state.password);
      case 'passphrase':
        return generatePassphrase({ ...state.passphrase, wordlist: window.WORDLIST });
      case 'pin':
        return generatePin(state.pin);
      case 'token':
        return generateToken(state.token);
      default:
        throw new Error(`Unknown mode ${state.mode}`);
    }
  }

  function generate({ copy }) {
    const count = Number.isInteger(state.count) ? Math.min(Math.max(state.count, 1), 50) : 1;
    try {
      current = Array.from({ length: count }, generateOne);
    } catch (err) {
      current = [];
      showError(err.message);
      return;
    }
    showError('');
    renderResult();
    if (copy) {
      copyValues(current.map((r) => r.value));
      addToHistory(current);
    }
  }


  function charClass(c) {
    if (/[0-9]/.test(c)) return 'c-digit';
    if (/[A-Za-z]/.test(c)) return '';
    if (c === ' ') return 'c-space';
    return 'c-symbol';
  }

  function colorized(value) {
    const frag = document.createDocumentFragment();
    for (const c of value) {
      const cls = charClass(c);
      if (!cls) {
        frag.append(c);
        continue;
      }
      const span = document.createElement('span');
      span.className = cls;
      span.textContent = c === ' ' ? '·' : c;
      frag.append(span);
    }
    return frag;
  }

  function renderResult() {
    els.result.replaceChildren();
    els.result.classList.toggle('multi', current.length > 1);
    if (current.length === 1) {
      els.result.append(colorized(current[0].value));
    } else {
      const ol = document.createElement('ol');
      for (const r of current) {
        const li = document.createElement('li');
        li.append(colorized(r.value));
        ol.append(li);
      }
      els.result.append(ol);
    }

    const entropy = current[0].entropy;
    els.strength.hidden = false;
    if (state.mode === 'pin') {
      // Offline crack time is meaningless for PINs; their security comes from attempt limits.
      const odds = Math.round(2 ** entropy).toLocaleString('en-US');
      delete els.strength.dataset.level;
      els.strengthText.textContent = `1 in ${odds} chance per guess. Only use PINs where wrong attempts trigger a lockout, like phones, cards and alarms.`;
      return;
    }
    const s = assessStrength(entropy);
    els.strength.dataset.level = s.level;
    els.strengthText.textContent = `${s.label} · about ${Math.round(entropy)} bits · ${
      s.crackTime === 'instantly' ? 'cracked instantly' : `${s.crackTime} to crack`
    } offline at 10 billion guesses/sec`;
  }

  function showError(message) {
    els.error.textContent = message;
    els.error.hidden = !message;
    if (message) {
      els.result.replaceChildren();
      els.strength.hidden = true;
    }
  }

  function renderMode() {
    for (const tab of $$('[role="tab"]')) {
      const selected = tab.dataset.mode === state.mode;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    for (const panel of $$('[role="tabpanel"]')) panel.hidden = panel.id !== `panel-${state.mode}`;
    els.generate.textContent = BUTTON_LABELS[state.mode];
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }


  async function writeClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.append(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      ta.remove();
      return ok;
    }
  }

  async function copyValues(values) {
    const ok = await writeClipboard(values.join('\n'));
    if (!ok) {
      toast('Could not copy automatically. Select the text and copy it yourself.');
      return;
    }
    const what = values.length > 1 ? `${values.length} items` : 'Copied';
    toast(values.length > 1 ? `${what} copied to clipboard` : `${what} to clipboard`);
    scheduleClipboardClear();
  }

  function scheduleClipboardClear() {
    clearTimeout(clipboardTimer);
    if (!state.autoClear) return;
    clipboardTimer = setTimeout(async () => {
      try {
        await navigator.clipboard.writeText('');
        toast('Clipboard cleared');
      } catch {
        /* tab not focused; nothing we can do */
      }
    }, state.autoClear * 1000);
  }


  function addToHistory(results) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    for (const r of results) history.unshift({ value: r.value, mode: state.mode, time });
    history = history.slice(0, HISTORY_LIMIT);
    renderHistory();
  }

  function renderHistory() {
    els.history.replaceChildren();
    if (!history.length) {
      const li = document.createElement('li');
      li.className = 'muted small';
      li.textContent = 'Nothing yet.';
      els.history.append(li);
      return;
    }
    for (const item of history) {
      const li = document.createElement('li');
      const code = document.createElement('code');
      code.className = 'masked';
      code.textContent = '•'.repeat(Math.min(item.value.length, 24));

      const meta = document.createElement('span');
      meta.className = 'muted small';
      meta.textContent = `${item.mode} · ${item.time}`;

      const show = document.createElement('button');
      show.className = 'link';
      show.textContent = 'Show';
      show.addEventListener('click', () => {
        const hidden = code.classList.toggle('masked');
        code.textContent = hidden ? '•'.repeat(Math.min(item.value.length, 24)) : item.value;
        show.textContent = hidden ? 'Show' : 'Hide';
      });

      const copy = document.createElement('button');
      copy.className = 'link';
      copy.textContent = 'Copy';
      copy.addEventListener('click', () => copyValues([item.value]));

      li.append(code, meta, show, copy);
      els.history.append(li);
    }
  }


  function onSettingChange(e) {
    const input = e.target;
    const value = readInput(input);
    if (typeof value === 'number' && Number.isNaN(value)) return; // half-typed number
    setPath(input.dataset.setting, value);
    saveSettings();
    syncInputs();
    generate({ copy: false });
  }

  for (const input of $$('[data-setting]')) {
    input.addEventListener('input', onSettingChange);
  }

  for (const tab of $$('[role="tab"]')) {
    tab.addEventListener('click', () => {
      state.mode = tab.dataset.mode;
      saveSettings();
      renderMode();
      generate({ copy: false });
    });
  }

  $('.tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs = $$('[role="tab"]');
    const i = tabs.findIndex((t) => t.dataset.mode === state.mode);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    next.click();
    next.focus();
  });

  for (const chip of $$('[data-preset]')) {
    chip.addEventListener('click', () => {
      state.password = clone(PRESETS[chip.dataset.preset]);
      saveSettings();
      syncInputs();
      generate({ copy: false });
      toast(`Preset: ${chip.textContent}`);
    });
  }

  els.generate.addEventListener('click', () => generate({ copy: true }));

  function copyCurrent() {
    if (current.length) copyValues(current.map((r) => r.value));
  }
  els.result.addEventListener('click', () => {
    if (!window.getSelection().toString()) copyCurrent();
  });
  els.result.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      copyCurrent();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'g' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, select, textarea')) return;
    e.preventDefault();
    generate({ copy: true });
  });

  $('#reset').addEventListener('click', () => {
    state = clone(DEFAULTS);
    saveSettings();
    syncInputs();
    renderMode();
    generate({ copy: false });
    toast('Settings reset');
  });

  $('#clear-history').addEventListener('click', () => {
    history = [];
    renderHistory();
  });

  syncInputs();
  renderMode();
  renderHistory();
  generate({ copy: false });
})();

// Run with: node theme.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const source = readFileSync(`${__dirname}/theme.js`, 'utf8');

function page({ saved = null, dark = false, blocked = false } = {}) {
  const events = {};
  const dataset = {};
  const button = {
    hidden: true,
    setAttribute(name, value) { this[name] = value; },
    addEventListener(name, handler) { this[name] = handler; }
  };
  let ready = false;
  const system = { matches: dark, addEventListener(name, handler) { this[name] = handler; } };
  const storage = {
    value: saved,
    getItem() { if (blocked) throw Error('Storage blocked'); return this.value; },
    setItem(key, value) { if (blocked) throw Error('Storage blocked'); this.value = value; }
  };
  runInNewContext(source, {
    localStorage: storage,
    window: { matchMedia: () => system, addEventListener(name, handler) { events[name] = handler; } },
    document: {
      documentElement: { dataset },
      querySelectorAll: () => ready ? [button] : [],
      addEventListener(name, handler) { events[name] = handler; }
    }
  });
  return { dataset, button, events, system, storage, ready() { ready = true; events.DOMContentLoaded(); } };
}

for (const dark of [false, true]) {
  for (const saved of [null, 'invalid', 'light', 'dark']) {
    const p = page({ saved, dark });
    const expected = ['light', 'dark'].includes(saved) ? saved : dark ? 'dark' : 'light';
    assert.equal(p.dataset.theme, expected, 'Theme must be set before the body exists');
    p.ready();
    assert.equal(p.button.hidden, false);
    assert.equal(p.button['aria-checked'], String(expected === 'dark'));
    p.button.click();
    assert.equal(p.dataset.theme, expected === 'dark' ? 'light' : 'dark');
    assert.equal(p.storage.value, p.dataset.theme);
    assert.equal(p.button['aria-checked'], String(p.dataset.theme === 'dark'));
    assert.equal(page({ saved: p.storage.value, dark }).dataset.theme, p.dataset.theme, 'Choice persists on navigation');
  }
}

const p = page();
p.ready();
p.system.matches = true;
p.system.change();
assert.equal(p.dataset.theme, 'dark', 'Follow system changes before a choice');
p.button.click();
p.system.change();
assert.equal(p.dataset.theme, 'light', 'Explicit choice overrides the system');
p.storage.value = 'dark';
p.events.storage({ key: 'color-theme' });
assert.equal(p.dataset.theme, 'dark', 'Synchronize other tabs');
p.storage.value = 'light';
p.events.pageshow({ persisted: true });
assert.equal(p.dataset.theme, 'light', 'Refresh the choice after browser Back');
p.storage.value = null;
p.events.storage({ key: null });
assert.equal(p.dataset.theme, 'dark', 'Cleared storage restores the system default');

const blocked = page({ blocked: true });
blocked.ready();
blocked.button.click();
blocked.events.pageshow({ persisted: true });
assert.equal(blocked.dataset.theme, 'dark', 'Blocked storage must not break the switch');
blocked.button.click();
assert.equal(blocked.dataset.theme, 'light');
console.log('Theme checks passed: first paint, system preference, saved choice, tabs, Back, and blocked storage.');

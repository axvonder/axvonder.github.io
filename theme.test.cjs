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
    assert.equal(p.dataset.theme, 'light', 'Start light before the body exists, regardless of system or stored choice');
    p.ready();
    assert.equal(p.button.hidden, false);
    assert.equal(p.dataset.themeMotion, undefined, 'Page loads do not replay the sunglasses drop');
    assert.equal(p.button['aria-checked'], 'false');
    p.button.click();
    assert.equal(p.dataset.themeMotion, 'on', 'A manual toggle enables the sunglasses animation');
    assert.equal(p.dataset.theme, 'dark', 'Only the toggle enables dark mode');
    assert.equal(p.button['aria-checked'], 'true');
    assert.equal(p.button.title, 'Switch to light mode');
    assert.equal(page({ saved: p.storage.value, dark }).dataset.theme, 'light', 'Navigation starts in light mode');
    p.button.click();
    assert.equal(p.dataset.theme, 'light');
    assert.equal(p.button['aria-checked'], 'false');
  }
}

const p = page();
p.ready();
p.system.matches = true;
p.system.change?.();
assert.equal(p.dataset.theme, 'light', 'System changes must not enable dark mode');
p.button.click();
p.storage.value = 'light';
p.events.storage?.({ key: 'color-theme' });
assert.equal(p.dataset.theme, 'dark', 'Other tabs must not change this page');
p.events.pageshow({ persisted: true });
assert.equal(p.dataset.theme, 'light', 'Browser Back restores light mode');
assert.equal(p.dataset.themeMotion, undefined, 'Browser Back does not replay an animation');

const blocked = page({ blocked: true });
blocked.ready();
blocked.button.click();
assert.equal(blocked.dataset.theme, 'dark', 'Blocked storage must not break the switch');
blocked.button.click();
assert.equal(blocked.dataset.theme, 'light');
console.log('Theme checks passed: light by default, manual toggle, navigation, Back, and blocked storage.');

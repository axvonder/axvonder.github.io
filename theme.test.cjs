// Run with: node theme.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const source = readFileSync(`${__dirname}/theme.js`, 'utf8');

function page({ saved = null, dark = false, blocked = false, portrait = true, viewportTop = 0 } = {}) {
  const events = {};
  const dataset = {};
  const makeButton = () => ({
    hidden: true,
    setAttribute(name, value) { this[name] = value; },
    click() { events.click({ target: { closest: () => this } }); }
  });
  let button = makeButton();
  let ready = false;
  const imageStyle = {};
  const sunglasses = {
    offsetTop: 57,
    parentElement: { getBoundingClientRect: () => ({ top: 118 }) },
    style: { setProperty(name, value) { imageStyle[name] = value; } },
    addEventListener(name, handler) { this[name] = handler; }
  };
  const system = { matches: dark, addEventListener(name, handler) { this[name] = handler; } };
  const storage = {
    value: saved,
    getItem() { if (blocked) throw Error('Storage blocked'); return this.value; },
    setItem(key, value) { if (blocked) throw Error('Storage blocked'); this.value = value; }
  };
  runInNewContext(source, {
    localStorage: storage,
    window: { visualViewport: { offsetTop: viewportTop }, matchMedia: () => system, addEventListener(name, handler) { events[name] = handler; } },
    document: {
      documentElement: { dataset },
      querySelector: () => portrait ? sunglasses : null,
      querySelectorAll: () => ready ? [button] : [],
      addEventListener(name, handler) { events[name] = handler; }
    }
  });
  return { dataset, get button() { return button; }, events, system, storage, sunglasses, imageStyle, ready() { ready = true; events.DOMContentLoaded(); }, replaceButton() { button = makeButton(); } };
}

for (const dark of [false, true]) {
  for (const saved of [null, 'invalid', 'light', 'dark']) {
    const p = page({ saved, dark });
    const initialTheme = saved === 'dark' ? 'dark' : 'light';
    const nextTheme = initialTheme === 'dark' ? 'light' : 'dark';
    assert.equal(p.dataset.theme, initialTheme, 'Restore a saved choice before the body exists, otherwise start light');
    assert.equal(p.storage.value, saved, 'Do not save a preference until the visitor chooses one');
    p.ready();
    assert.equal(p.button.hidden, false);
    assert.equal(p.dataset.themeMotion, undefined, 'Page loads do not replay the sunglasses drop');
    assert.equal(p.button['aria-label'], `Switch to ${nextTheme} mode`);
    p.button.click();
    assert.equal(p.dataset.themeMotion, 'on', 'A manual toggle enables the sunglasses animation');
    assert.equal(p.dataset.theme, nextTheme, 'The toggle changes the theme');
    assert.equal(p.storage.value, nextTheme, 'Remember the visitor\'s choice');
    assert.equal(p.imageStyle['--sunglasses-start-y'], '-175px', 'The drop starts at the visible top edge');
    p.sunglasses.animationend();
    assert.equal(p.dataset.themeMotion, undefined, 'Release the animation after landing');
    assert.equal(p.dataset.theme, nextTheme, 'The theme stays selected after the animation ends');
    assert.equal(p.button['aria-label'], `Switch to ${initialTheme} mode`);
    assert.equal(p.button.title, `Switch to ${initialTheme} mode`);
    assert.equal(page({ saved: p.storage.value, dark }).dataset.theme, nextTheme, 'A full reload or new page restores the selected theme');
    p.button.click();
    assert.equal(p.dataset.theme, initialTheme);
    assert.equal(p.storage.value, initialTheme, 'Switching back also updates the saved choice');
    assert.equal(p.button['aria-label'], `Switch to ${nextTheme} mode`);
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
assert.equal(p.dataset.theme, 'light', 'Browser Back restores the latest saved choice');
assert.equal(p.dataset.themeMotion, undefined, 'Browser Back does not replay an animation');
p.button.click();
p.replaceButton();
p.events['site:navigated']();
assert.equal(p.button.hidden, false, 'Show the replacement portrait button');
assert.equal(p.dataset.theme, 'dark', 'Internal navigation retains the selected theme');
assert.equal(p.dataset.themeMotion, undefined, 'Internal navigation clears the previous animation');
p.button.click();
assert.equal(p.dataset.theme, 'light', 'The replacement toggle works after internal navigation');
p.events.click({ target: { closest: () => null } });
assert.equal(p.dataset.theme, 'light', 'Unrelated clicks do not change the theme');
p.sunglasses.animationend();
assert.equal(p.dataset.themeMotion, undefined);

const blocked = page({ blocked: true });
blocked.ready();
blocked.button.click();
assert.equal(blocked.dataset.theme, 'dark', 'Blocked storage must not break the switch');
blocked.events['site:navigated']();
assert.equal(blocked.dataset.theme, 'dark', 'Internal navigation retains the choice even with blocked storage');
blocked.events.pageshow({ persisted: true });
assert.equal(blocked.dataset.theme, 'dark', 'Browser Back keeps the current theme if storage cannot be read');
blocked.button.click();
assert.equal(blocked.dataset.theme, 'light');

const music = page({ portrait: false });
music.ready();
music.button.click();
assert.equal(music.dataset.theme, 'dark', 'Pages without sunglasses still toggle');

const zoomed = page({ viewportTop: 120 });
zoomed.ready();
zoomed.button.click();
assert.equal(zoomed.imageStyle['--sunglasses-start-y'], '-55px', 'Pinch zoom uses the visible viewport edge');
console.log('Theme checks passed: first-visit light default, saved choices, reloads, navigation, Back, blocked storage, and animations.');

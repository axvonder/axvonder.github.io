// Run with: node site-navigation.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const source = readFileSync(`${__dirname}/site-navigation.js`, 'utf8');

async function check() {
  const documentEvents = {}, windowEvents = {}, requests = [], fallbacks = [];
  const location = new URL('https://axvonder.com/');
  location.assign = url => fallbacks.push(url);
  const audio = { paused: false, currentTime: 135 };
  const player = { audio };
  let nodes, focused, scrolled, notifications = 0;
  const selectors = ['.site-header > nav', 'main', 'footer', 'meta[name="description"]', 'link[rel="canonical"]'];
  function page(path) {
    const parts = Object.fromEntries(selectors.map(selector => [selector, {
      path,
      replaceWith(replacement) { nodes[selector] = replacement; },
      setAttribute() {},
      focus() { focused = this; }
    }]));
    return {
      parts, title: path, body: { className: path },
      querySelector: selector => selector === '.music-player' ? { audio: {} } : parts[selector]
    };
  }
  nodes = page('/').parts;
  const document = {
    body: { className: '/' }, title: '/',
    querySelector: selector => selector === '.music-player' ? player : nodes[selector],
    getElementById: id => id === 'research' ? { scrollIntoView() { scrolled = id; } } : null,
    addEventListener(name, handler) { documentEvents[name] = handler; },
    dispatchEvent(event) { if (event.type === 'site:navigated') notifications++; }
  };
  const window = {
    scrollX: 0, scrollY: 400,
    scrollTo(position) { scrolled = [position.left, position.top]; },
    addEventListener(name, handler) { windowEvents[name] = handler; }
  };
  const history = {
    state: null, pushes: 0,
    pushState(state, title, url) { this.state = state; this.pushes++; location.href = url; },
    replaceState(state) { this.state = state; }
  };
  runInNewContext(source, {
    document, window, history, location, URL, AbortController, Event,
    DOMParser: class { parseFromString(path) { return page(path); } },
    fetch: (url, options) => new Promise((resolve, reject) => requests.push({ url, ...options, resolve, reject }))
  });
  function click(href, options = {}) {
    const link = { href: new URL(href, location).href, target: '', hasAttribute: () => false, ...options.link };
    const event = {
      button: 0, target: { closest: () => link },
      preventDefault() { this.defaultPrevented = true; }, ...options.event
    };
    documentEvents.click(event);
    return event;
  }
  async function finish(request, ok = true) {
    request.resolve({ ok, text: async () => request.url.pathname });
    await new Promise(resolve => setImmediate(resolve));
  }

  assert.equal(click('music.html').defaultPrevented, true);
  assert.equal(history.state.siteScroll[1], 400);
  await finish(requests.at(-1));
  assert.equal(location.pathname, '/music.html');
  assert.equal(document.title, '/music.html');
  assert.equal(document.body.className, '/music.html');
  assert.equal(focused, nodes.main, 'Focus follows the new content');
  assert.deepEqual(scrolled, [0, 0]);
  assert.equal(document.querySelector('.music-player'), player, 'Never replace the attached player');
  assert.equal(player.audio, audio);
  assert.equal(audio.currentTime, 135);
  assert.equal(audio.paused, false);

  click('index.html#research');
  await finish(requests.at(-1));
  assert.equal(scrolled, 'research');
  const pushes = history.pushes;
  location.href = 'https://axvonder.com/music.html';
  windowEvents.popstate({ state: { siteScroll: [0, 275] } });
  await finish(requests.at(-1));
  assert.equal(nodes.main.path, '/music.html');
  assert.equal(history.pushes, pushes, 'Back/Forward must not add history entries');
  assert.deepEqual(scrolled, [0, 275]);
  assert.equal(player.audio, audio);

  audio.paused = true;
  click('index.html');
  await finish(requests.at(-1));
  assert.equal(audio.paused, true, 'Navigation must not resume paused audio');
  assert.equal(audio.currentTime, 135);

  const count = requests.length;
  click('#research');
  assert.equal(requests.length, count, 'A same-page anchor needs no fetch');
  assert.equal(scrolled, 'research');
  click('#%malformed');
  assert.deepEqual(scrolled, [0, 0]);
  for (const options of [{ event: { metaKey: true } }, { event: { ctrlKey: true } }, { event: { button: 1 } }, { link: { target: '_blank' } }, { link: { hasAttribute: () => true } }]) {
    assert.ok(!click('music.html', options).defaultPrevented, 'Preserve ordinary browser link actions');
  }
  assert.ok(!click('https://example.org/').defaultPrevented);
  assert.equal(requests.length, count);

  click('music.html');
  const slow = requests.at(-1);
  click('index.html#research');
  assert.equal(slow.signal.aborted, true);
  await finish(slow);
  assert.equal(nodes.main.path, '/index.html', 'A cancelled response cannot overwrite newer content');
  assert.equal(location.hash, '#research');

  click('missing.html');
  await finish(requests.at(-1), false);
  assert.equal(fallbacks.at(-1), 'https://axvonder.com/missing.html', 'Failed fetches fall back to normal navigation');
  assert.equal(notifications, 4);
  console.log('Navigation checks passed: attached audio, page content, history, anchors, pause state, cancellation, and fallback.');
}
check().catch(error => { console.error(error); process.exitCode = 1; });

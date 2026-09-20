// Run with: node music-player.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const invitation = "some music while you're here?";
const label = { textContent: invitation };
const button = Object.assign(new EventTarget(), {
  hidden: true,
  querySelector: () => label,
  setAttribute(name, value) { this[name] = value; }
});
const audio = Object.assign(new EventTarget(), {
  paused: true, currentTime: 0, plays: 0, loads: 0, error: null,
  play() {
    this.plays++;
    this.paused = false;
    this.dispatchEvent(new Event('play'));
    return this.pending || Promise.resolve();
  },
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); },
  load() { this.loads++; this.error = null; }
});
const window = new EventTarget();
runInNewContext(readFileSync(`${__dirname}/music-player.js`, 'utf8'), {
  window,
  document: { querySelector: selector => selector === '.music-toggle' ? button : audio }
});
const click = () => button.dispatchEvent(new Event('click'));
const stopped = () => {
  assert.equal(audio.paused, true);
  assert.equal(audio.currentTime, 0);
  assert.equal(button['aria-pressed'], 'false');
};

(async () => {
  assert.equal(button.hidden, false);
  assert.equal(audio.plays, 0, 'Do not autoplay');
  assert.equal(audio.loads, 0, 'Do not load the file before a click');
  click();
  assert.equal(audio.paused, false);
  assert.equal(button['aria-pressed'], 'true');
  assert.equal(label.textContent, 'Bach BWV 1080');
  audio.currentTime = 42;
  click();
  stopped();
  assert.equal(label.textContent, invitation);

  click();
  audio.dispatchEvent(new Event('ended'));
  stopped();
  click();
  window.dispatchEvent(new Event('pagehide'));
  stopped();

  let cancel;
  audio.pending = new Promise((resolve, reject) => { cancel = reject; });
  click();
  click();
  cancel({ name: 'AbortError' });
  await new Promise(setImmediate);
  stopped();
  assert.equal(label.textContent, invitation, 'A quick second click is not a playback failure');

  audio.pending = Promise.reject({ name: 'NotSupportedError' });
  click();
  await new Promise(setImmediate);
  stopped();
  assert.equal(label.textContent, 'Unable to play. Try again?');
  audio.pending = null;
  audio.error = new Error('Network failure');
  audio.dispatchEvent(new Event('error'));
  stopped();
  click();
  assert.equal(audio.loads, 1, 'Retry reloads a failed file');
  assert.equal(audio.paused, false);
  click();
  console.log('Music checks passed: no autoplay, play/stop, reset, navigation, cancellation, and retry.');
})().catch(error => { console.error(error); process.exitCode = 1; });

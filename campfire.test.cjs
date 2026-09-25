// Run with: node campfire.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const emit = (target, event) => target.dispatchEvent(new Event(event));
const button = Object.assign(new EventTarget(), {
  hidden: true,
  setAttribute(name, value) { this[name] = value; }
});
const audio = Object.assign(new EventTarget(), {
  paused: true, muted: false, currentTime: 0, error: null, denial: 'NotAllowedError', loads: 0,
  play() {
    if (this.denial) return Promise.reject({ name: this.denial });
    this.paused = false;
    emit(this, 'play');
    return Promise.resolve();
  },
  pause() { this.paused = true; emit(this, 'pause'); },
  load() { this.loads++; this.error = null; }
});
const window = new EventTarget();
runInNewContext(readFileSync(`${__dirname}/campfire.js`, 'utf8'), {
  window, document: { querySelector: selector => selector === '#campfire-music' ? audio : button }
});

(async () => {
  await new Promise(setImmediate);
  assert.equal(button.hidden, false);
  assert.equal(button['aria-label'], 'Unmute Tristram music', 'Offer unmute when autoplay is blocked');
  assert.equal(button['aria-pressed'], 'true');
  audio.denial = null;
  emit(button, 'click');
  assert.equal(audio.paused, false);
  assert.equal(audio.muted, false);
  assert.equal(button['aria-label'], 'Mute Tristram music');
  assert.equal(button['aria-pressed'], 'false');
  audio.currentTime = 42;
  emit(button, 'click');
  assert.equal(audio.paused, false, 'Muting must keep the track playing');
  assert.equal(audio.muted, true);
  assert.equal(button['aria-pressed'], 'true');
  audio.currentTime = 45;
  emit(button, 'click');
  assert.equal(audio.currentTime, 45, 'Unmuting must not seek or restart');
  assert.equal(audio.muted, false);
  assert.equal(audio.paused, false);
  audio.muted = true;
  emit(audio, 'volumechange');
  assert.equal(button['aria-pressed'], 'true', 'Reflect volume changes outside the button');
  emit(window, 'pagehide');
  assert.equal(audio.paused, true, 'Leaving the scene stops its audio');
  audio.error = new Error('Failed to load');
  emit(audio, 'error');
  assert.equal(button['aria-label'], 'Retry Tristram music');
  emit(button, 'click');
  assert.equal(audio.loads, 1);
  assert.equal(audio.paused, false);
  assert.equal(audio.muted, false);
  const html = readFileSync(`${__dirname}/campfire.html`, 'utf8');
  assert.match(html, /<audio\b[^>]*\bloop\b/);
  const gif = readFileSync(`${__dirname}/assets/campfire/campfire-loop.gif`);
  const loop = gif.indexOf('NETSCAPE2.0');
  assert.ok(loop >= 0);
  assert.equal(gif.readUInt16LE(loop + 13), 0, 'GIF repeats indefinitely');
  assert.equal(gif[gif.length - 1], 0x3b, 'Keep the GIF trailer');
  console.log('Campfire checks passed: autoplay fallback, mute/unmute without pausing or seeking, volume changes, navigation, retry, audio loop, GIF loop.');
})().catch(error => { console.error(error); process.exitCode = 1; });

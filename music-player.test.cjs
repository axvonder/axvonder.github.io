// Run with: node music-player.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const source = readFileSync(`${__dirname}/music-player.js`, 'utf8');
const invitation = "some music while you're here?";
const emit = (target, name) => target.dispatchEvent(new Event(name));

function page(readyState = 'loading') {
  const label = { textContent: invitation };
  const button = Object.assign(new EventTarget(), {
    hidden: true, querySelector: () => label,
    setAttribute(name, value) { this[name] = value; }
  });
  const progress = Object.assign(new EventTarget(), {
    hidden: true, disabled: true, value: '0', max: '100',
    setAttribute(name, value) { this[name] = value; },
    style: { setProperty(name, value) { this[name] = value; } }
  });
  const audio = Object.assign(new EventTarget(), {
    paused: true, ended: false, currentTime: 0, duration: NaN, preload: 'none', plays: 0, loads: 0, error: null,
    play() { this.plays++; this.paused = false; this.ended = false; emit(this, 'play'); return this.pending || Promise.resolve(); },
    pause() { this.paused = true; emit(this, 'pause'); },
    load() { this.loads++; this.error = null; this.currentTime = 0; }
  });
  const window = new EventTarget();
  runInNewContext(source, {
    window,
    document: {
      readyState,
      querySelector: selector => ({ '.music-toggle': button, '#background-music': audio, '.music-progress': progress })[selector]
    }
  });
  return { button, progress, audio, window, label, click: () => emit(button, 'click') };
}

(async () => {
  const p = page();
  const { button, progress, audio, window, label, click } = p;
  assert.equal(button.hidden, false);
  assert.equal(progress.hidden, true, 'Hide the bar before playback');
  assert.equal(progress.disabled, true, 'Cannot seek before the duration is known');
  assert.equal(audio.loads, 0, 'Wait for the rest of the page to load');
  emit(window, 'load');
  assert.equal(audio.loads, 1, 'Preload once the page has loaded');
  assert.equal(audio.preload, 'auto');
  assert.equal(audio.plays, 0, 'Preloading must not autoplay');
  emit(window, 'load');
  assert.equal(audio.loads, 1);

  audio.duration = 659.3;
  emit(audio, 'loadedmetadata');
  assert.equal(audio.currentTime, 7.3, 'Buffer the first note instead of the silent opening');
  assert.equal(progress.disabled, false);
  assert.equal(Number(progress.max), 659.3);
  assert.equal(progress.hidden, true, 'Preloading must not show the bar');
  click();
  assert.equal(progress.hidden, false, 'Show the bar during playback');
  assert.equal(label.textContent, 'Bach BWV 1080');
  assert.equal(button['aria-pressed'], 'true');
  assert.match(button['aria-label'], /^Pause /);
  audio.currentTime = 42;
  emit(audio, 'loadedmetadata');
  assert.equal(audio.currentTime, 42, 'Metadata updates must not reset playback');
  emit(audio, 'timeupdate');
  assert.equal(progress.value, '42');
  assert.equal(progress['aria-valuetext'], '0:42 of 10:59');
  click();
  assert.equal(audio.paused, true);
  assert.equal(progress.hidden, true, 'Hide the bar when paused');
  assert.equal(audio.currentTime, 42, 'Pausing must keep the position');
  click();
  assert.equal(progress.hidden, false, 'Show the bar again when resumed');
  assert.equal(audio.currentTime, 42, 'Resume from the paused position');
  progress.value = '400';
  emit(progress, 'input');
  assert.equal(audio.currentTime, 400);
  assert.equal(audio.paused, false, 'Seeking during playback must keep playing');
  emit(window, 'pagehide');
  assert.equal(audio.paused, true);
  assert.equal(progress.hidden, true, 'Hide the bar when navigation pauses playback');
  assert.equal(audio.currentTime, 400);

  let cancel;
  audio.pending = new Promise((resolve, reject) => { cancel = reject; });
  click();
  click();
  cancel({ name: 'AbortError' });
  await new Promise(setImmediate);
  assert.equal(label.textContent, invitation, 'A quick second click is not a playback failure');
  assert.equal(audio.currentTime, 400);
  audio.pending = Promise.reject({ name: 'NotSupportedError' });
  click();
  await new Promise(setImmediate);
  assert.equal(audio.paused, true);
  assert.equal(progress.hidden, true, 'Hide the bar after a playback failure');
  assert.equal(label.textContent, 'Unable to play. Try again?');
  audio.pending = null;
  audio.error = new Error('Network failure');
  emit(audio, 'error');
  click();
  assert.equal(audio.loads, 2, 'Retry reloads a failed file');
  assert.equal(audio.currentTime, 7.3, 'Retry skips the silent opening');
  assert.equal(audio.paused, false);
  assert.equal(progress.hidden, false);
  audio.paused = true;
  audio.ended = true;
  audio.currentTime = audio.duration;
  emit(audio, 'ended');
  assert.equal(progress.hidden, true, 'Hide the bar at the end of the track');
  click();
  assert.equal(audio.currentTime, 7.3, 'Replay starts at the first note');

  const early = page();
  early.click();
  assert.equal(early.audio.currentTime, 7.3, 'An early click also skips the silence');
  early.audio.currentTime = 42;
  emit(early.window, 'load');
  assert.equal(early.audio.loads, 0, 'Do not interrupt playback started before the load event');
  assert.equal(early.audio.currentTime, 42);
  assert.equal(early.audio.paused, false);
  const loaded = page('complete');
  assert.equal(loaded.audio.loads, 1, 'Handle a page that has already finished loading');
  assert.equal(loaded.audio.plays, 0);
  console.log('Music checks passed: deferred loading, silent opening skipped, no autoplay, early clicks, pause/resume, seeking, replay, navigation, cancellation, and retry.');
})().catch(error => { console.error(error); process.exitCode = 1; });

(() => {
  const button = document.querySelector('.music-toggle');
  const audio = document.querySelector('#background-music');
  const progress = document.querySelector('.music-progress');
  if (!button || !audio || !progress) return;

  const label = button.querySelector('.music-label');
  const invitation = label.textContent;

  function update() {
    const playing = !audio.paused;
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} Bach BWV 1080, performed by Daniil Trifonov`);
    label.textContent = playing ? 'Bach BWV 1080' : invitation;
    progress.hidden = !playing;
  }

  function pause() {
    audio.pause();
    update();
  }

  function showError() {
    pause();
    label.textContent = 'Unable to play. Try again?';
  }

  function timeLabel(seconds) {
    const whole = Math.floor(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  }

  function updateProgress() {
    const duration = audio.duration;
    progress.disabled = !Number.isFinite(duration) || duration <= 0;
    if (progress.disabled) return;
    progress.max = String(duration);
    progress.value = String(audio.currentTime);
    progress.style.setProperty('--progress', `${audio.currentTime / duration * 100}%`);
    progress.setAttribute('aria-valuetext', `${timeLabel(audio.currentTime)} of ${timeLabel(duration)}`);
  }

  function preload() {
    // An early play click has already started loading. Do not restart it.
    if (audio.preload !== 'none') return;
    audio.preload = 'auto';
    audio.load();
  }

  if (document.readyState === 'complete') preload();
  else window.addEventListener('load', preload, { once: true });

  button.addEventListener('click', () => {
    if (!audio.paused) {
      pause();
      return;
    }
    audio.preload = 'auto';
    if (audio.error) audio.load();
    audio.play().catch(error => {
      // Pausing while the file loads cancels play normally.
      if (error.name !== 'AbortError') showError();
    });
  });
  audio.addEventListener('play', update);
  audio.addEventListener('pause', update);
  audio.addEventListener('ended', update);
  audio.addEventListener('error', showError);
  ['loadedmetadata', 'durationchange', 'timeupdate', 'seeked', 'ended'].forEach(event => {
    audio.addEventListener(event, updateProgress);
  });
  progress.addEventListener('input', () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = Math.max(0, Math.min(Number(progress.value), audio.duration));
    updateProgress();
  });
  window.addEventListener('pagehide', pause);
  update();
  updateProgress();
  button.hidden = false;
})();

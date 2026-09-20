(() => {
  const button = document.querySelector('.music-toggle');
  const audio = document.querySelector('#background-music');
  if (!button || !audio) return;

  const label = button.querySelector('.music-label');
  const invitation = label.textContent;

  function update() {
    const playing = !audio.paused;
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} Bach BWV 1080, performed by Daniil Trifonov`);
    label.textContent = playing ? 'Bach BWV 1080' : invitation;
  }

  function pause() {
    audio.pause();
    update();
  }

  function showError() {
    pause();
    label.textContent = 'Unable to play. Try again?';
  }

  button.addEventListener('click', () => {
    if (!audio.paused) {
      pause();
      return;
    }
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
  window.addEventListener('pagehide', pause);
  update();
  button.hidden = false;
})();

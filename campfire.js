(() => {
  const audio = document.querySelector('#campfire-music');
  const button = document.querySelector('#campfire-toggle');
  function update() {
    const silent = audio.muted || audio.paused;
    button.setAttribute('aria-pressed', String(silent));
    button.setAttribute('aria-label', audio.error ? 'Retry Tristram music' : `${silent ? 'Unmute' : 'Mute'} Tristram music`);
  }

  function play() {
    if (audio.error) audio.load();
    // A blocked autoplay attempt leaves the speaker ready for an unmute click.
    audio.play().catch(update);
  }

  button.addEventListener('click', () => {
    if (audio.paused || audio.error) {
      audio.muted = false;
      play();
    } else {
      audio.muted = !audio.muted;
    }
    update();
  });
  ['play', 'pause', 'volumechange', 'error'].forEach(event => audio.addEventListener(event, update));
  window.addEventListener('pagehide', () => audio.pause());
  update();
  button.hidden = false;
  play();
})();

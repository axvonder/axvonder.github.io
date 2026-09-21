(() => {
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('.theme-toggle').forEach(button => {
      button.setAttribute('aria-checked', String(theme === 'dark'));
      button.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
    });
  }

  // Every page starts in light mode, before the first paint.
  applyTheme('light');

  function bindPortrait() {
    const sunglasses = document.querySelector('.portrait-sunglasses');
    sunglasses?.addEventListener('animationend', () => {
      // Release the animated layer so Safari can redraw the full-resolution image.
      delete document.documentElement.dataset.themeMotion;
    });
  }

  document.addEventListener('site:navigated', () => {
    bindPortrait();
    delete document.documentElement.dataset.themeMotion;
    applyTheme('light');
  });

  document.addEventListener('DOMContentLoaded', () => {
    bindPortrait();
    document.querySelectorAll('.theme-toggle').forEach(button => {
      button.hidden = false;
      button.addEventListener('click', () => {
        const sunglasses = document.querySelector('.portrait-sunglasses');
        if (sunglasses) {
          const top = sunglasses.parentElement.getBoundingClientRect().top + sunglasses.offsetTop;
          const viewportTop = window.visualViewport?.offsetTop || 0;
          sunglasses.style.setProperty('--sunglasses-start-y', `${viewportTop - top}px`);
        }
        document.documentElement.dataset.themeMotion = 'on';
        applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
      });
    });
    applyTheme(document.documentElement.dataset.theme);
  });

  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      delete document.documentElement.dataset.themeMotion;
      applyTheme('light');
    }
  });
})();

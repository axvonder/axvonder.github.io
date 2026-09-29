(() => {
  function savedTheme(fallback = 'light') {
    try {
      const theme = localStorage.getItem('color-theme');
      return theme === 'light' || theme === 'dark' ? theme : fallback;
    } catch {
      return fallback;
    }
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('.theme-toggle').forEach(button => {
      button.hidden = false;
      button.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
      button.setAttribute('aria-label', button.title);
    });
  }

  // Restore the visitor's choice before the first paint.
  applyTheme(savedTheme());

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
    applyTheme(document.documentElement.dataset.theme);
  });

  document.addEventListener('DOMContentLoaded', () => {
    bindPortrait();
    applyTheme(document.documentElement.dataset.theme);
  });

  document.addEventListener('click', event => {
    if (!event.target.closest?.('.theme-toggle')) return;
    const sunglasses = document.querySelector('.portrait-sunglasses');
    if (sunglasses) {
      const top = sunglasses.parentElement.getBoundingClientRect().top + sunglasses.offsetTop;
      const viewportTop = window.visualViewport?.offsetTop || 0;
      sunglasses.style.setProperty('--sunglasses-start-y', `${viewportTop - top}px`);
    }
    document.documentElement.dataset.themeMotion = 'on';
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    try {
      localStorage.setItem('color-theme', document.documentElement.dataset.theme);
    } catch { /* The toggle still works when browser storage is blocked. */ }
  });

  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      delete document.documentElement.dataset.themeMotion;
      applyTheme(savedTheme(document.documentElement.dataset.theme));
    }
  });
})();

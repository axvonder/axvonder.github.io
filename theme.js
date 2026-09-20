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

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.theme-toggle').forEach(button => {
      button.hidden = false;
      button.addEventListener('click', () => {
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

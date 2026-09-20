(() => {
  const key = 'color-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = null;

  function readPreference() {
    try {
      const value = localStorage.getItem(key);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return preference;
    }
  }

  function applyTheme() {
    const theme = preference || (system.matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('.theme-toggle').forEach(button => {
      button.setAttribute('aria-checked', String(theme === 'dark'));
      button.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
    });
  }

  // Run in the head so the saved theme is applied before the page is painted.
  preference = readPreference();
  applyTheme();

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.theme-toggle').forEach(button => {
      button.hidden = false;
      button.addEventListener('click', () => {
        preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(key, preference); } catch { /* The toggle still works when storage is blocked. */ }
        applyTheme();
      });
    });
    applyTheme();
  });

  system.addEventListener('change', applyTheme);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      preference = readPreference();
      applyTheme();
    }
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      preference = readPreference();
      applyTheme();
    }
  });
})();

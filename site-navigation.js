(() => {
  if (!document.querySelector('.music-player')) return;

  let currentPage = location.pathname + location.search;
  let pending;
  history.scrollRestoration = 'manual';

  function scrollToPage(url, position) {
    if (position) {
      window.scrollTo({ left: position[0], top: position[1], behavior: 'instant' });
      return;
    }
    let id = url.hash.slice(1);
    try { id = decodeURIComponent(id); } catch { /* Keep malformed fragments literal. */ }
    const target = id && document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'instant' });
    else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  async function navigate(url, fromHistory = false, position) {
    pending?.abort();
    const request = new AbortController();
    pending = request;

    if (url.pathname + url.search === currentPage) {
      if (!fromHistory && url.href !== location.href) history.pushState(null, '', url);
      scrollToPage(url, position);
      return;
    }

    try {
      const response = await fetch(url, { signal: request.signal });
      if (!response.ok) throw new Error('Page could not be loaded');
      const next = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (request.signal.aborted) return;
      const selectors = ['.site-header > nav', 'main', 'footer'];
      const parts = selectors.map(selector => [document.querySelector(selector), next.querySelector(selector)]);
      if (!next.querySelector('.music-player') || parts.some(([current, replacement]) => !current || !replacement)) {
        throw new Error('Page needs a full navigation');
      }

      // Keep the audio element attached. Removing it interrupts playback in Safari.
      for (const [current, replacement] of parts) current.replaceWith(replacement);
      document.body.className = next.body.className;
      document.title = next.title;
      for (const selector of ['meta[name="description"]', 'link[rel="canonical"]']) {
        const current = document.querySelector(selector);
        const replacement = next.querySelector(selector);
        if (current && replacement) current.replaceWith(replacement);
      }
      if (!fromHistory) history.pushState(null, '', url);
      currentPage = url.pathname + url.search;
      document.dispatchEvent(new Event('site:navigated'));
      const main = document.querySelector('main');
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
      scrollToPage(url, position);
    } catch (error) {
      if (!request.signal.aborted) location.assign(url.href);
    }
  }

  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[data-site-page]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin) return;
    event.preventDefault();
    history.replaceState({ ...history.state, siteScroll: [window.scrollX, window.scrollY] }, '', location.href);
    navigate(url);
  });

  window.addEventListener('popstate', event => {
    navigate(new URL(location.href), true, event.state?.siteScroll);
  });
})();

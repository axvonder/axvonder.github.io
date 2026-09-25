document.addEventListener('click', event => {
  const button = event.target.closest?.('.abstract-toggle, .publications-toggle');
  if (!button) return;
  const expanded = button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', String(expanded));
  for (const id of button.getAttribute('aria-controls').split(' ')) {
    document.getElementById(id).hidden = !expanded;
  }
  const isList = button.classList.contains('publications-toggle');
  button.querySelector('.action-label').textContent = isList
    ? `Show ${expanded ? 'less' : 'more'}`
    : `${expanded ? 'Collapse' : 'Expand'} ${button.dataset.content}`;
  button.querySelector('.action-symbol').textContent = isList
    ? (expanded ? '↑' : '↓')
    : (expanded ? '−' : '+');
});

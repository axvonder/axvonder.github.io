document.addEventListener('click', event => {
  const button = event.target.closest?.('.abstract-toggle');
  if (!button) return;
  const abstract = document.getElementById(button.getAttribute('aria-controls'));
  const expanded = button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', String(expanded));
  abstract.hidden = !expanded;
  button.querySelector('.action-label').textContent = `${expanded ? 'Collapse' : 'Expand'} ${button.dataset.content}`;
  button.querySelector('.action-symbol').textContent = expanded ? '−' : '+';
});

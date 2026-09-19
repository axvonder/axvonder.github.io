document.querySelectorAll('.abstract-toggle').forEach(button => {
  button.addEventListener('click', () => {
    const abstract = document.getElementById(button.getAttribute('aria-controls'));
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    abstract.hidden = !expanded;
    button.querySelector('.action-label').textContent = `${expanded ? 'Collapse' : 'Expand'} ${button.dataset.content}`;
    button.querySelector('.action-symbol').textContent = expanded ? '−' : '+';
  });
});

// Run with: node publications.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
let panels = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`publication-${i + 1}`, { hidden: i >= 4 }]));
let click;
runInNewContext(readFileSync(`${__dirname}/publications.js`, 'utf8'), {
  document: {
    addEventListener(type, handler) { click = handler; },
    getElementById(id) { return panels[id]; }
  }
});

function button(ids, isList = true, content = 'abstract') {
  const attributes = { 'aria-controls': ids.join(' '), 'aria-expanded': 'false' };
  const label = {}, symbol = {};
  return {
    attributes, label, symbol, dataset: { content },
    classList: { contains: () => isList },
    getAttribute: name => attributes[name],
    setAttribute(name, value) { attributes[name] = value; },
    querySelector: selector => selector === '.action-label' ? label : symbol
  };
}
const press = target => click({ target: { closest: () => target } });
const ids = Object.keys(panels).slice(4);
const list = button(ids);
press(list);
assert.equal(Object.values(panels).filter(p => !p.hidden).length, 10);
assert.equal(list.attributes['aria-expanded'], 'true');
assert.equal(list.label.textContent, 'Show less');
assert.equal(list.symbol.textContent, '↑');
press(list);
assert.equal(Object.values(panels).filter(p => !p.hidden).length, 4);
assert.equal(list.attributes['aria-expanded'], 'false');
assert.equal(list.label.textContent, 'Show more');
assert.equal(list.symbol.textContent, '↓');

panels = { abstract: { hidden: true } };
const abstract = button(['abstract'], false, 'excerpt');
press(abstract);
assert.equal(panels.abstract.hidden, false);
assert.equal(abstract.label.textContent, 'Collapse excerpt');
press(abstract);
assert.equal(panels.abstract.hidden, true);
assert.equal(abstract.label.textContent, 'Expand excerpt');

// Navigation replaces the content while the document listener stays attached.
panels = Object.fromEntries(ids.map(id => [id, { hidden: true }]));
press(button(ids));
assert.ok(Object.values(panels).every(p => !p.hidden));
press(null);
console.log('Publication checks passed: four/ten entries, labels, arrows, abstracts, and replaced page content.');

import assert from 'node:assert/strict';
import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {prepareContactBooking} from '../scripts/prepare-contact-booking.mjs';

const topics = ['rekruttering', 'hr', 'samtale', 'kandidat'];
const options = Object.fromEntries(topics.map((topic) => [
  topic, {
    url: `https://calendar.google.com/calendar/appointments/schedules/fixture-${topic}?gv=true`,
    title: `Samtale om ${topic}`,
    text: `Beskrivelse for ${topic}`,
  },
]));
const nav = topics.map((topic) =>
  `<a href="?tema=${topic}#book-mote" data-book-topic="${topic}"${topic === 'samtale' ? ' aria-current="true"' : ''}>${topic}</a>`,
).join('\n');
const original = `<!-- wp:html -->
<section id="book-mote" class="rr-booking" aria-labelledby="rr-book-title">
<p>Fiktivt innhold som skal bevares.</p>
${nav}
<div class="rr-book-frame"><iframe id="rr-book-calendar" src="${options.samtale.url}" title="Finn tid"></iframe></div>
<p class="rr-book-help">Du fyller inn navn og e-post når du bestiller. Spørsmålet om behovet deres er valgfritt. Unngå sensitive opplysninger om ansatte og kandidater.</p>
<div class="rr-book-after"><p>Google sender møtebekreftelsen. I samtalen blir vi enige om neste steg.</p></div>
<script>(function(){var root=document.getElementById('book-mote');if(!root)return;var options=${JSON.stringify(options)};var params=new URLSearchParams(location.search);})();</script>
<!-- Ridderset kontaktmåling v1 -->
<script>/* Original tracking fixture */</script>
</section>
<!-- /wp:html -->`;

test('keeps the contact block editable and offers booking links without JavaScript', () => {
  const result = prepareContactBooking(original);
  assert.ok(result.startsWith('<!-- wp:html -->\n'));
  assert.ok(result.endsWith('<!-- /wp:html -->'));
  assert.match(result, /Fiktivt innhold som skal bevares/);
  assert.match(result, /<section id="book-mote" class="rr-booking" tabindex="-1"/);
  assert.match(result, /<div class="rr-book-frame" hidden><iframe id="rr-book-calendar" aria-describedby="rr-book-calendar-help" title="Finn tid">/);
  for (const topic of topics) assert.ok(result.includes(`href="${options[topic].url}" data-book-topic="${topic}"`));
});

test('shows confirmation and preparation guidance before the calendar', () => {
  const result = prepareContactBooking(original);
  const guidance = result.indexOf('id="rr-book-calendar-help"');
  const calendar = result.indexOf('id="rr-book-calendar"');
  assert.ok(guidance !== -1 && calendar > guidance);
  assert.match(result.slice(guidance, calendar), /får du en møtebekreftelse på e-post/);
  assert.match(result.slice(guidance, calendar), /Hold opplysninger om ansatte og kandidater utenfor bestillingen/);
  assert.match(result.slice(guidance, calendar), /Før samtalen/);
  assert.match(result, /I samtalen blir vi enige om neste steg/);
});

test('stops when the source layout or a booking provider changes', () => {
  assert.throws(() => prepareContactBooking(original.replace('Ridderset kontaktmåling v1', 'Other marker')), /original booking and measurement scripts/);
  assert.throws(() => prepareContactBooking(original.replace('data-book-topic="hr"', 'data-book-topic="other"')), /one hr topic link/);
  assert.throws(() => prepareContactBooking(original.replace('schedules/fixture-hr', 'not-a-schedule/fixture-hr')), /Google appointment schedule/);
});

const origin = 'https://ridderset.example';

function renderContact(search, hash, referrer = origin + '/hr-partner/?private=discard#discard') {
  const result = prepareContactBooking(original);
  const script = result.match(/<script>([\s\S]+?)<\/script>/)[1];
  const elements = {
    '#rr-book-title': {}, '#rr-book-context': {}, '#rr-book-preparation': {}, '#rr-book-direct': {},
    '#rr-book-calendar': {}, '.rr-book-frame': {hidden: true},
  };
  const links = topics.map((topic) => ({
    dataset: {bookTopic: topic},
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { delete this[name]; },
    getAttribute(name) { return this[name] ?? null; },
  }));
  const root = {
    querySelector: (selector) => elements[selector],
    querySelectorAll: () => links,
    focus() { this.focused = true; },
    addEventListener(name, listener) { this[name] = listener; },
  };
  const window = {dataLayer: [], addEventListener() {}};
  runInNewContext(script, {
    document: {getElementById: () => root, referrer},
    location: {search, hash, origin},
    URL, URLSearchParams, window,
  });
  const click = (link) => root.click({target: {closest: () => link}});
  return {root, elements, links, click, dataLayer: window.dataLayer};
}

test('initializes the matching calendar and tracks the destination topic', () => {
  const {root, elements, links, click, dataLayer} = renderContact('?tema=hr', '#book-mote');
  assert.equal(root.focused, true);
  assert.equal(elements['#rr-book-title'].textContent, options.hr.title);
  assert.match(elements['#rr-book-preparation'].textContent, /konkret situasjon/);
  assert.equal(elements['#rr-book-calendar'].src, options.hr.url);
  assert.equal(elements['#rr-book-direct'].href, options.hr.url);
  assert.equal(elements['.rr-book-frame'].hidden, false);
  assert.deepEqual(links.filter((link) => link['aria-current'] === 'true').map((link) => link.dataset.bookTopic), ['hr']);
  assert.equal(links[0].href, '?tema=rekruttering&fra=hr#book-mote');
  click(links[0]);
  assert.equal(dataLayer[0].contact_topic, 'rekruttering');
  assert.equal(dataLayer[0].contact_source, 'hr');
  assert.equal(dataLayer[0].internal_referrer_path, '/hr-partner/');
});

test('retains an approved source through an internal topic change and leaves Google URLs unchanged', () => {
  const {click, dataLayer, elements} = renderContact('?tema=rekruttering&fra=hr', '#book-mote', origin + '/kontakt/?tema=hr');
  click({id: 'rr-book-direct', dataset: {}, getAttribute: () => options.rekruttering.url});
  assert.equal(dataLayer[0].contact_source, 'hr');
  assert.equal(dataLayer[0].contact_topic, 'rekruttering');
  assert.equal(elements['#rr-book-direct'].href, options.rekruttering.url);
  assert.equal(elements['#rr-book-calendar'].src, options.rekruttering.url);
});

test('keeps unlisted paths, external referrers and arbitrary source values out of analytics', () => {
  for (const [referrer, sourceValue] of [
    [origin + '/intern/synthetic-customer/', 'hr'],
    [origin + '/kontakt/?tema=hr', 'synthetic-contact'],
    ['https://other.example/hr-partner/', 'hr'],
    ['unparseable', 'hr'],
    ['', 'hr'],
  ]) {
    const {links, click, dataLayer} = renderContact(`?tema=hr&fra=${sourceValue}`, '#book-mote', referrer);
    assert.equal(links[0].href, '?tema=rekruttering#book-mote');
    click({id: 'rr-book-direct', dataset: {}, getAttribute: () => options.hr.url});
    assert.equal(dataLayer[0].contact_source, 'ukjent');
    assert.equal(dataLayer[0].internal_referrer_path, '');
  }
});

test('an unknown query value is left out of intent tracking', () => {
  const {root, elements, click, dataLayer} = renderContact('?tema=invalid-value', '');
  assert.equal(root.focused, undefined);
  assert.equal(elements['#rr-book-calendar'].src, options.samtale.url);
  click({id: 'rr-book-direct', dataset: {}, getAttribute: () => options.samtale.url});
  assert.equal(dataLayer[0].event, 'rr_contact_intent');
  assert.equal(dataLayer[0].contact_method, 'booking_calendar');
  assert.equal(dataLayer[0].contact_topic, 'samtale');
});

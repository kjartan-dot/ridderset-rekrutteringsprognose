import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const topics = ['rekruttering', 'hr', 'samtale', 'kandidat'];
const legacyScripts = /<script>\(function\(\)\{var root=document\.getElementById\('book-mote'\);if\(!root\)return;var options=(\{[^\n]+?\});var params=new URLSearchParams[\s\S]*?<\/script>\r?\n<!-- Ridderset kontaktmåling v1 -->\r?\n<script>[\s\S]*?<\/script>/g;

function enhanceBooking(options) {
  const root = document.getElementById('book-mote');
  if (!root) return;
  const isTopic = (key) => Object.prototype.hasOwnProperty.call(options, key);
  const requested = new URLSearchParams(location.search).get('tema');
  const key = isTopic(requested) ? requested : 'samtale';
  const selected = options[key];

  root.querySelector('#rr-book-title').textContent = selected.title;
  root.querySelector('#rr-book-context').textContent = selected.text;
  root.querySelector('#rr-book-direct').href = selected.url;
  root.querySelectorAll('[data-book-topic]').forEach((link) => {
    const topic = link.dataset.bookTopic;
    link.href = `?tema=${topic}#book-mote`;
    if (topic === key) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });

  const frame = root.querySelector('#rr-book-calendar');
  frame.src = selected.url;
  root.querySelector('.rr-book-frame').hidden = false;

  const focusBooking = () => {
    if (location.hash === '#book-mote') root.focus({preventScroll: true});
  };
  focusBooking();
  window.addEventListener('hashchange', focusBooking);

  root.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    const topic = link.dataset.bookTopic;
    if (isTopic(topic)) track('rr_contact_topic', 'topic_selection', topic);
    else if (href.startsWith('mailto:')) track('rr_contact_intent', 'email', key);
    else if (href.startsWith('tel:')) track('rr_contact_intent', 'phone', key);
    else if (link.id === 'rr-book-direct') track('rr_contact_intent', 'booking_calendar', key);
  });

  function track(event, method, topic) {
    let source = '';
    if (document.referrer) {
      const referrer = new URL(document.referrer);
      if (referrer.origin === location.origin) source = referrer.pathname;
    }
    const details = {contact_method: method, contact_topic: topic, internal_referrer_path: source};
    if (typeof window.gtag === 'function') window.gtag('event', event, details);
    else if (Array.isArray(window.dataLayer)) window.dataLayer.push({event, ...details});
  }
}

function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before);
  if (index === -1 || source.indexOf(before, index + before.length) !== -1) {
    throw new Error(`Expected one ${label} in the contact block.`);
  }
  return source.slice(0, index) + after + source.slice(index + before.length);
}

function calendarHref(value) {
  const url = new URL(value);
  const schedule = /^\/calendar\/(?:u\/\d+\/)?appointments\/schedules\/[\w-]+$/;
  if (url.origin !== 'https://calendar.google.com' || !schedule.test(url.pathname)) {
    throw new Error('Expected a Google appointment schedule.');
  }
  return url.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

export function prepareContactBooking(source) {
  const found = [...source.matchAll(legacyScripts)];
  if (found.length !== 1) throw new Error('Expected the original booking and measurement scripts.');

  const [[scripts, savedOptions]] = found;
  const options = JSON.parse(savedOptions);
  const selectedOptions = Object.fromEntries(topics.map((topic) => {
    const {url, title, text} = options[topic];
    if (typeof title !== 'string' || typeof text !== 'string') throw new Error('Missing booking topic copy.');
    return [topic, {url, title, text}];
  }));
  const inlineData = JSON.stringify(selectedOptions).replaceAll('<', '\\u003c');
  let updated = replaceOnce(source, scripts, `<script>(${enhanceBooking})(${inlineData});</script>`, 'booking script');
  updated = replaceOnce(updated, '<section id="book-mote" class="rr-booking"', '<section id="book-mote" class="rr-booking" tabindex="-1"', 'booking section');

  for (const topic of topics) {
    const href = calendarHref(selectedOptions[topic].url);
    const topicAttribute = `data-book-topic="${topic}"`;
    const initialSelection = topic === 'samtale' ? ' aria-current="true"' : '';
    updated = replaceOnce(updated,
      `href="?tema=${topic}#book-mote" ${topicAttribute}${initialSelection}`,
      `href="${href}" ${topicAttribute}`, `${topic} topic link`);
  }

  const initialFrame = `<div class="rr-book-frame"><iframe id="rr-book-calendar" src="${selectedOptions.samtale.url}"`;
  return replaceOnce(updated, initialFrame,
    '<div class="rr-book-frame" hidden><iframe id="rr-book-calendar"', 'calendar frame');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , input, output] = process.argv;
  if (!input || !output) {
    console.error('Usage: node scripts/prepare-contact-booking.mjs <original-contact-block.html> <updated-contact-block.html>');
    process.exitCode = 1;
  } else {
    try {
      const source = await readFile(input, 'utf8');
      await writeFile(output, prepareContactBooking(source), {flag: 'wx'});
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}

import assert from 'node:assert/strict';
import test from 'node:test';
import {prepareRecruitmentTemplate} from '../scripts/prepare-recruitment-template.mjs';

const bookingLink = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ0bTGx-HQ_ZLSdLNLPe1KMuVJ8fpC8IS7swd4TMfmP4IvA1ZvW5gJpdKA-thVtLSy7UvMCnd_F6?gv=true';
const contactLink = '/kontakt/?tema=rekruttering#book-mote';
const button = `<!-- wp:button {"textColor":"sort"} --><div class="wp-block-button"><a class="wp-block-button__link" href="${bookingLink}">Book en samtale med Kjartan</a></div><!-- /wp:button -->`;
const cover = (content, className = 'page-cover-title') =>
  `<!-- wp:cover {"className":"${className}"} --><div class="wp-block-cover">${content}</div><!-- /wp:cover -->`;

test('changes only the original booking link in the service hero', () => {
  const footer = `<!-- wp:group -->${button}<!-- /wp:group -->`;
  const source = `<!-- wp:template-part {"slug":"header"} /-->\n${cover(button)}\n${footer}`;
  const expected = source.replace(bookingLink, contactLink);
  assert.equal(prepareRecruitmentTemplate(source), expected);
});

test('stops if the current service hero or original link no longer matches', () => {
  assert.throws(() => prepareRecruitmentTemplate(cover(button, 'other')), /one service hero cover/);
  assert.throws(() => prepareRecruitmentTemplate(cover(button.replace(bookingLink, contactLink))), /one original booking button/);
});

test('stops if the service hero or booking button is ambiguous', () => {
  assert.throws(() => prepareRecruitmentTemplate(cover(button) + cover(button)), /one service hero cover/);
  assert.throws(() => prepareRecruitmentTemplate(cover(button + button)), /one original booking button/);
});

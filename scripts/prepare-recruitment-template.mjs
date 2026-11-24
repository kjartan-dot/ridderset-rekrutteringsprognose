import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const bookingLink = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ0bTGx-HQ_ZLSdLNLPe1KMuVJ8fpC8IS7swd4TMfmP4IvA1ZvW5gJpdKA-thVtLSy7UvMCnd_F6?gv=true';
const destinations = new Map([
  ['rekruttering', '/kontakt/?tema=rekruttering#book-mote'],
  ['hr', '/kontakt/?tema=hr#book-mote'],
  ['kontakt', '#book-mote'],
]);
const heroCover = /<!-- wp:cover (\{[^\n]+?\}) -->[\s\S]*?<!-- \/wp:cover -->/g;
const bookingButton = /<!-- wp:button(?: \{[^\n]*?\})? -->[\s\S]*?<!-- \/wp:button -->/g;

export function prepareRecruitmentTemplate(source) {
  return prepareBookingTemplate(source, 'rekruttering');
}

export function prepareBookingTemplate(source, page) {
  const destination = destinations.get(page);
  if (!destination) throw new Error('Expected rekruttering, hr or kontakt.');

  const covers = [...source.matchAll(heroCover)].filter((cover) =>
    JSON.parse(cover[1]).className?.split(/\s+/).includes('page-cover-title'),
  );
  if (covers.length !== 1) throw new Error('Expected one page-cover-title hero in the template.');

  const [hero] = covers;
  const originalHref = ` href="${bookingLink}">`;
  const originalBooking = `${originalHref}Book en samtale med Kjartan</a>`;
  const buttons = [...hero[0].matchAll(bookingButton)].filter((button) =>
    button[0].includes(originalBooking),
  );
  if (buttons.length !== 1) throw new Error('Expected one original booking button in the service hero.');

  const [button] = buttons;
  const offset = hero.index + button.index + button[0].indexOf(originalBooking);
  const contactHref = ` href="${destination}">`;
  return source.slice(0, offset) + contactHref + source.slice(offset + originalHref.length);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , input, output, page = 'rekruttering'] = process.argv;
  if (!input || !output) {
    console.error('Usage: node scripts/prepare-recruitment-template.mjs <source.html> <output.html> [rekruttering|hr|kontakt]');
    process.exitCode = 1;
  } else {
    try {
      const source = await readFile(input, 'utf8');
      await writeFile(output, prepareBookingTemplate(source, page), {flag: 'wx'});
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}

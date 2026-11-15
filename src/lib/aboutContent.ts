/**
 * Single source of truth for the Omnitily About page.
 *
 * Follows the same content shape as the legal pages in
 * `./legalContent.ts` (LegalBlock / LegalSection), but with its own
 * page interface: `LegalPage.slug` is typed `'privacy' | 'terms'`,
 * so the About page is not a LegalPage.
 *
 * Keep the text free of personal contact details: the repo has no
 * contact email address, so none is invented here. The contact
 * section points to the website itself; add a real email here (and
 * only here) if one is created for the site.
 *
 * Tool counts in "What You Can Do Here" come from
 * `src/toolsData.ts` (verified 15 November 2026): 117 tools in
 * total, 101 functional. Update the numbers here if the catalogue
 * changes.
 */

import type { LegalBlock, LegalSection } from './legalContent';

export interface AboutPage {
  slug: 'about';
  title: string;
  description: string;
  lastUpdated: string;
  intro: string[];
  sections: LegalSection[];
}

const p = (text: string): LegalBlock => ({ kind: 'paragraph', text });
const ul = (items: string[]): LegalBlock => ({ kind: 'list', items });

export const ABOUT_PAGE: AboutPage = {
  slug: 'about',
  title: 'About Omnitily',
  description:
    'About Omnitily: what the site is, the free online tools it offers, how your files are handled, and how to get in touch.',
  lastUpdated: '15 November 2026',
  intro: [
    'Omnitily is a free collection of online tools for everyday video, image, PDF, text and developer tasks, available at https://omnitily.vercel.app.',
    'It exists to give you useful tools without the usual friction: no accounts, no subscriptions, and no software to install. Open a tool, do the job, and move on.',
  ],
  sections: [
    {
      heading: 'What Omnitily Is',
      blocks: [
        p('Omnitily is a single website that brings together 117 online tools in one place. Instead of searching for a different site for every small task — converting a file, counting words, formatting JSON, trimming a video — you can do it all here.'),
        p('The tools are organised into nine categories, so you can browse by the kind of work you need to do. Every tool is clearly labelled with how it processes your files: in your browser, on our server, or through a third-party service.'),
      ],
    },
    {
      heading: 'What You Can Do Here',
      blocks: [
        p('Omnitily currently offers 117 tools, of which 101 are fully functional and ready to use. The remaining tools are being verified or prepared, and are marked as beta, coming soon, or disabled so you always know what to expect.'),
        ul([
          'Video (17 tools) — download, compress, split, convert, and edit video, including social media downloaders.',
          'Text & Writing (17 tools) — word counting, case conversion, text formatting, and writing helpers.',
          'Developer Tools (15 tools) — JSON formatting, Base64 and URL encoding, hash generation, and more.',
          'Image (13 tools) — convert, compress, resize, and crop images.',
          'Document (11 tools) — PDF tools, converters, and document utilities.',
          'Audio (11 tools) — audio conversion, extraction, and editing helpers.',
          'Math & Finance (11 tools) — calculators and converters, including currency conversion.',
          'Health & Lifestyle (11 tools) — BMI, calorie, sleep, and habit tools.',
          'Fun & Games (11 tools) — dice, quizzes, puzzles, and other small games.',
        ]),
      ],
    },
    {
      heading: 'Free, No Signup, No Watermark',
      blocks: [
        p('Every tool on Omnitily is free to use. There is no account to create, no sign-in, and no subscription.'),
        p('Tools that produce files do not add watermarks to your output. What you download is your work, unbranded.'),
      ],
    },
    {
      heading: 'How Your Files Are Handled',
      blocks: [
        p('Most Omnitily tools process your files entirely in your web browser. In those cases your files never leave your device and are never uploaded to our servers.'),
        p('Some tools need a server or a third-party service to work. In those cases only the data required for that operation is sent:'),
        ul([
          'Social media downloaders: the link you paste is sent to our self-hosted media resolver (Cobalt) so it can fetch the media for you.',
          'QR Code Generator: the text or link you enter is sent to api.qrserver.com to generate the QR code image.',
          'Currency Converter: the currency codes you select are sent to the Frankfurter exchange-rate API; no personal data is sent.',
          'Media downloads: downloads may be routed through our media-proxy endpoint so your browser does not contact the source host directly.',
        ]),
        p('Files sent to a server or third-party service for processing are not stored by us after the operation completes. We do not claim ownership of your files or content. For the full details, see the Privacy Policy.'),
      ],
    },
    {
      heading: 'Who Runs Omnitily',
      blocks: [
        p('Omnitily is an independent project, run by a small team without outside investors or a parent company. It is built and maintained by the people behind the website itself.'),
        p('The site is a work in progress: tools are added, verified, and improved over time, and tools that do not work reliably are kept out of the public catalogue until they do.'),
      ],
    },
    {
      heading: 'Contact',
      blocks: [
        p('If you have a question, a suggestion, or a problem with a tool, you can reach the Omnitily team through the website at https://omnitily.vercel.app.'),
      ],
    },
    {
      heading: 'Changes to This Page',
      blocks: [
        p('We may update this page from time to time, for example when new tools are added or the catalogue changes. When we do, we will revise the "Last updated" date at the top of this page.'),
      ],
    },
  ],
};

/**
 * Single source of truth for Omnitily's legal pages.
 *
 * The content here is rendered in two places, so it must stay in sync:
 *  - the SPA, via `src/components/LegalPageView.tsx`
 *  - the prerendered static HTML, via `scripts/prerender.ts`
 *
 * Keep the text free of personal contact details: the repo has no contact
 * email address, so none is invented here. The contact section points to
 * the website itself; add a real email here (and only here) if one is
 * created for the site.
 */

export type LegalBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalPage {
  slug: 'privacy' | 'terms';
  title: string;
  description: string;
  lastUpdated: string;
  intro: string[];
  sections: LegalSection[];
}

const p = (text: string): LegalBlock => ({ kind: 'paragraph', text });
const ul = (items: string[]): LegalBlock => ({ kind: 'list', items });

export const PRIVACY_PAGE: LegalPage = {
  slug: 'privacy',
  title: 'Privacy Policy',
  description:
    'Privacy Policy for Omnitily: what data we collect, the cookies we use, the third-party services our tools rely on, and the choices you have.',
  lastUpdated: '15 November 2026',
  intro: [
    'Omnitily ("we", "us", "our") operates the website at https://omnitily.vercel.app (the "Service"), a collection of free online tools for video, image, PDF, text and developer tasks.',
    'This Privacy Policy explains what information is collected when you use the Service, how it is used, and the choices you have. By using the Service, you agree to the practices described here.',
  ],
  sections: [
    {
      heading: 'Information We Collect',
      blocks: [
        p('We do not require you to create an account, sign in, or provide your name, email address, or password to use the Service. We do not store user accounts or passwords.'),
        p('When you use the Service, the following information may be collected automatically:'),
        ul([
          'Your IP address, browser type and version, device type, and operating system;',
          'The pages you visit on the Service, the time and date of your visit, and the time spent on each page;',
          'The website that referred you to the Service, where applicable;',
          'Approximate location derived from your IP address (country or city level only).',
        ]),
        p('This information is collected through Google Analytics 4 (see "Analytics and Cookies" below) and is used in aggregated form to understand how the Service is used. It is not used to identify you personally.'),
      ],
    },
    {
      heading: 'How Your Files and Content Are Processed',
      blocks: [
        p('Most Omnitily tools process your files entirely in your web browser. In those cases your files never leave your device and are never uploaded to our servers.'),
        p('Some tools need a server or a third-party service to work. In those cases only the data required for that operation is sent:'),
        ul([
          'Social media downloaders: the link you paste is sent to our self-hosted media resolver (Cobalt) so it can fetch the media for you.',
          'QR Code Generator: the text or link you enter is sent to api.qrserver.com to generate the QR code image.',
          'Currency Converter: the currency codes you select are sent to the Frankfurter exchange-rate API; no personal data is sent.',
          'Media downloads: downloads may be routed through our media-proxy endpoint so your browser does not contact the source host directly.',
        ]),
        p('Files sent to a server or third-party service for processing are not stored by us after the operation completes. We do not claim ownership of your files or content.'),
      ],
    },
    {
      heading: 'Third-Party Services',
      blocks: [
        p('The Service relies on the following third-party services. Each provider processes data under its own privacy policy, which is available on its own website:'),
        ul([
          'Google Analytics 4 — usage analytics (Google LLC).',
          'Google Tag Manager — tag management (Google LLC).',
          'Google AdSense — advertising (Google LLC). See "Advertising" below.',
          'Frankfurter API — currency exchange rates.',
          'api.qrserver.com — QR code generation.',
          'Google Fonts — font files loaded from Google servers; your IP address is visible to Google when fonts load.',
        ]),
      ],
    },
    {
      heading: 'Analytics and Cookies',
      blocks: [
        p('We use Google Analytics 4, loaded through Google Tag Manager, to understand how visitors use the Service (for example, which tools are popular). Google Analytics uses cookies such as _ga to distinguish visitors. The data is aggregated and does not identify you.'),
        p('We also store small preferences in your browser\u2019s local storage, not in cookies: your theme choice (dark or light) and your pinned tools. This data stays on your device and is never sent to us.'),
        p('You can refuse or delete cookies in your browser settings. You can also opt out of Google Analytics across all websites by installing the Google Analytics Opt-out Add-on provided by Google.'),
      ],
    },
    {
      heading: 'Advertising',
      blocks: [
        p('We may display advertisements on the Service through Google AdSense. Google and its partners may use cookies — including the DoubleClick cookie — to serve ads based on your prior visits to this or other websites.'),
        p('You can opt out of personalised advertising at any time in Google Ads Settings (adssettings.google.com), or by visiting www.aboutads.info/choices.'),
        p('If you are in the European Economic Area or the United Kingdom, you may be asked for consent before advertising cookies are used.'),
      ],
    },
    {
      heading: 'Data Retention',
      blocks: [
        p('Analytics data is retained by Google according to the Google Analytics data-retention settings. Omnitily itself does not retain your files, and any data sent to our servers for a single tool operation is discarded once the operation completes.'),
      ],
    },
    {
      heading: 'Children\u2019s Privacy',
      blocks: [
        p('The Service is a general-audience utility website and is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided personal information through the Service, please contact us and we will remove it.'),
      ],
    },
    {
      heading: 'Data Security',
      blocks: [
        p('The Service is served over HTTPS, and we do not store account credentials or uploaded files. However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security.'),
      ],
    },
    {
      heading: 'Changes to This Policy',
      blocks: [
        p('We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page. Your continued use of the Service after a change means you accept the updated policy.'),
      ],
    },
    {
      heading: 'Contact Us',
      blocks: [
        p('If you have any questions about this Privacy Policy, you can contact the Omnitily team through the website at https://omnitily.vercel.app.'),
      ],
    },
  ],
};

export const TERMS_PAGE: LegalPage = {
  slug: 'terms',
  title: 'Terms of Service',
  description:
    'Terms of Service for Omnitily: acceptable use, disclaimers, intellectual property, and liability limits for our free online tools.',
  lastUpdated: '15 November 2026',
  intro: [
    'These Terms of Service ("Terms") govern your use of the website at https://omnitily.vercel.app (the "Service"), operated by Omnitily ("we", "us", "our").',
    'By accessing or using the Service, you agree to these Terms. If you do not agree, please do not use the Service.',
  ],
  sections: [
    {
      heading: 'The Service',
      blocks: [
        p('Omnitily provides free online tools for video, image, PDF, text and developer tasks. The tools are provided free of charge and without the need to create an account.'),
        p('We may add, change, or remove tools and features at any time, without notice.'),
      ],
    },
    {
      heading: 'Acceptable Use',
      blocks: [
        p('You agree to use the Service only for lawful purposes and in accordance with these Terms. In particular, you agree not to:'),
        ul([
          'Use the Service in any way that violates any applicable law or regulation;',
          'Download, convert, or process content you do not have the right to use, including copyrighted material you are not authorised to copy;',
          'Attempt to disrupt, overload, or gain unauthorised access to the Service or its servers;',
          'Use automated systems to scrape the Service or submit bulk requests that abuse the Service;',
          'Upload or process material that is unlawful, harmful, or infringes the rights of others.',
        ]),
        p('You are responsible for ensuring you have the right to download or process any content you submit to the Service.'),
      ],
    },
    {
      heading: 'Intellectual Property',
      blocks: [
        p('The Service, including its design, text, logos, and the tools themselves, is owned by Omnitily and protected by intellectual property laws. You may not copy, reproduce, or redistribute the Service or its content except as permitted by law.'),
        p('You retain all rights to the files and content you process with the Service. We do not claim ownership of your content.'),
      ],
    },
    {
      heading: 'Third-Party Services and Content',
      blocks: [
        p('Some tools rely on third-party services (for example, media resolvers, exchange-rate providers, and QR code generators). We do not control those services and are not responsible for their availability, accuracy, or content.'),
        p('Downloaded media may be subject to the terms and copyright of its original source. It is your responsibility to respect those terms.'),
      ],
    },
    {
      heading: 'Disclaimer of Warranties',
      blocks: [
        p('The Service is provided "as is" and "as available", without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, accuracy, or non-infringement.'),
        p('We do not guarantee that the Service will be uninterrupted, error-free, or free of harmful components, or that any tool will produce a particular result.'),
      ],
    },
    {
      heading: 'Limitation of Liability',
      blocks: [
        p('To the maximum extent permitted by applicable law, Omnitily and its operators will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of data, profits, or revenue, arising from your use of the Service.'),
        p('Our total liability for any claim relating to the Service will not exceed the amount you paid to use the Service, if any.'),
      ],
    },
    {
      heading: 'Availability',
      blocks: [
        p('We aim to keep the Service available, but we may suspend or discontinue the Service, or any tool within it, at any time without notice and without liability.'),
      ],
    },
    {
      heading: 'Changes to These Terms',
      blocks: [
        p('We may update these Terms from time to time. When we do, we will revise the "Last updated" date at the top of this page. Your continued use of the Service after a change means you accept the updated Terms.'),
      ],
    },
    {
      heading: 'Governing Law',
      blocks: [
        p('These Terms are governed by the laws of Bangladesh, without regard to its conflict-of-law provisions.'),
      ],
    },
    {
      heading: 'Contact Us',
      blocks: [
        p('If you have any questions about these Terms, you can contact the Omnitily team through the website at https://omnitily.vercel.app.'),
      ],
    },
  ],
};

export const LEGAL_PAGES: Record<'privacy' | 'terms', LegalPage> = {
  privacy: PRIVACY_PAGE,
  terms: TERMS_PAGE,
};

export type LegalPageSlug = keyof typeof LEGAL_PAGES;

export const LEGAL_PAGE_LIST: LegalPage[] = [PRIVACY_PAGE, TERMS_PAGE];

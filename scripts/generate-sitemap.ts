import { writeFile } from 'node:fs/promises';
import { INDEXABLE_TOOLS } from '../src/toolsData.ts';
import { LEGAL_PAGE_LIST } from '../src/lib/legalContent.ts';
import { CATEGORY_HUBS } from '../src/lib/categoryHubs.ts';

const baseUrl = 'https://omnitily.vercel.app';
// Build date (YYYY-MM-DD) stamped as <lastmod> on every entry.
const lastmod = new Date().toISOString().slice(0, 10);

const urls = [
  { loc: `${baseUrl}/`, changefreq: 'weekly', priority: '1.0' },
  ...LEGAL_PAGE_LIST.map((page) => ({
    loc: `${baseUrl}/${page.slug}`,
    changefreq: 'yearly',
    priority: '0.5',
  })),
  ...CATEGORY_HUBS.map((hub) => ({
    loc: `${baseUrl}/tools/${hub.slug}`,
    changefreq: 'monthly',
    priority: '0.7',
  })),
  { loc: `${baseUrl}/about`, changefreq: 'yearly', priority: '0.5' },
  ...INDEXABLE_TOOLS.map((tool) => ({
    loc: `${baseUrl}/tools/${tool.id}`,
    changefreq: 'monthly',
    priority: '0.8',
  })),
];

const body = urls.map((url) => [
  '  <url>',
  `    <loc>${url.loc}</loc>`,
  `    <lastmod>${lastmod}</lastmod>`,
  `    <changefreq>${url.changefreq}</changefreq>`,
  `    <priority>${url.priority}</priority>`,
  '  </url>',
].join('\n')).join('\n');

await writeFile(new URL('../public/sitemap.xml', import.meta.url), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, 'utf8');
console.log(`Generated sitemap with ${urls.length} URLs (1 home + ${LEGAL_PAGE_LIST.length} legal + ${CATEGORY_HUBS.length} hubs + 1 about + ${INDEXABLE_TOOLS.length} indexable tools).`);

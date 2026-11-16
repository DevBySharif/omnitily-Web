import React, { useEffect } from 'react';
import type { ProcessingType } from '../types';
import { LEGAL_PAGES, type LegalPageSlug } from '../lib/legalContent';
import { ABOUT_PAGE } from '../lib/aboutContent';
import { TOOL_SEO_TITLES } from '../lib/toolSeoTitles';
import { CATEGORY_HUBS } from '../lib/categoryHubs';
import { GUIDES } from '../lib/guides';

interface SeoManagerProps {
  toolId: string | null;
  toolTitle?: string;
  toolDescription?: string;
  category?: string;
  isIndexable: boolean;
  processingType?: ProcessingType;
  routeNotFound?: boolean;
  staticPage?: LegalPageSlug | 'about';
  hubSlug?: string | null;
  guideSlug?: string | null;
}

const DOMAIN = 'https://omnitily.vercel.app';

function setMetaTag(attribute: 'name' | 'property', attrValue: string, content: string) {
  let element = document.querySelector(`meta[${attribute}="${attrValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setOgImageTags() {
  setMetaTag('property', 'og:image', `${DOMAIN}/og-image.png`);
  setMetaTag('property', 'og:image:width', '1200');
  setMetaTag('property', 'og:image:height', '630');
  setMetaTag('property', 'og:image:alt', 'Omnitily — Free Online Tools');
  setMetaTag('name', 'twitter:image', `${DOMAIN}/og-image.png`);
}

function setCanonicalUrl(url: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

export const SeoManager: React.FC<SeoManagerProps> = ({
  toolId,
  toolTitle,
  toolDescription,
  category,
  isIndexable,
  processingType,
  routeNotFound = false,
  staticPage,
  hubSlug,
  guideSlug,
}) => {
  useEffect(() => {
    // Clean up previous JSON-LD script tags
    const existingScripts = document.querySelectorAll('script[data-seo="omnitily-jsonld"]');
    existingScripts.forEach((script) => script.remove());

    const isToolView = Boolean(toolId && toolTitle && toolDescription && !routeNotFound);

    if (staticPage) {
      // 'about' mirrors the LegalPage shape (title/description/slug) but is
      // not a LegalPageSlug, so it is resolved from its own content module.
      const page = staticPage === 'about' ? ABOUT_PAGE : LEGAL_PAGES[staticPage];
      const canonical = `${DOMAIN}/${page.slug}`;
      const title = `${page.title} - Omnitily`;
      const desc = page.description;

      document.title = title;
      setCanonicalUrl(canonical);
      setMetaTag('name', 'description', desc);
      setMetaTag('name', 'robots', 'index, follow');
      setMetaTag(
        'name',
        'keywords',
        staticPage === 'about'
          ? 'about omnitily, free online tools'
          : `${page.title.toLowerCase()}, omnitily legal, free online tools`,
      );

      setMetaTag('property', 'og:site_name', 'Omnitily');
      setMetaTag('property', 'og:type', 'website');
      setMetaTag('property', 'og:title', title);
      setMetaTag('property', 'og:description', desc);
      setMetaTag('property', 'og:url', canonical);
      setOgImageTags();

      setMetaTag('name', 'twitter:card', 'summary_large_image');
      setMetaTag('name', 'twitter:title', title);
      setMetaTag('name', 'twitter:description', desc);


      const webPageSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: page.title,
        url: canonical,
        description: desc,
      };

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${DOMAIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: page.title,
            item: canonical,
          },
        ],
      };

      const pageScript = document.createElement('script');
      pageScript.setAttribute('data-seo', 'omnitily-jsonld');
      pageScript.type = 'application/ld+json';
      pageScript.text = JSON.stringify(webPageSchema);
      document.head.appendChild(pageScript);

      const breadcrumbScript = document.createElement('script');
      breadcrumbScript.setAttribute('data-seo', 'omnitily-jsonld');
      breadcrumbScript.type = 'application/ld+json';
      breadcrumbScript.text = JSON.stringify(breadcrumbSchema);
      document.head.appendChild(breadcrumbScript);
    } else if (routeNotFound) {
      const title = 'Page Not Found - Omnitily';
      const desc = 'The requested page or utility could not be found on Omnitily.';
      const canonical = `${DOMAIN}/`;

      document.title = title;
      setCanonicalUrl(canonical);
      setMetaTag('name', 'description', desc);
      setMetaTag('name', 'robots', 'noindex, nofollow');
      setMetaTag('name', 'keywords', 'utility tools, page not found');
      
      setMetaTag('property', 'og:site_name', 'Omnitily');
      setMetaTag('property', 'og:type', 'website');
      setMetaTag('property', 'og:title', title);
      setMetaTag('property', 'og:description', desc);
      setMetaTag('property', 'og:url', canonical);
      setOgImageTags();

      setMetaTag('name', 'twitter:card', 'summary_large_image');
      setMetaTag('name', 'twitter:title', title);
      setMetaTag('name', 'twitter:description', desc);

    } else if (isToolView) {
      const canonical = `${DOMAIN}/tools/${toolId}`;
      const titleText = (toolId && TOOL_SEO_TITLES[toolId]) || `${toolTitle} - Omnitily`;
      
      const processingCopy = processingType === 'browser'
        ? 'Processed locally in your browser.'
        : processingType === 'server'
          ? 'This operation sends data to Omnitily’s server.'
          : processingType === 'external'
            ? 'This operation uses a third-party provider.'
            : 'Processing is currently unavailable.';
      
      const descText = `${toolDescription} ${processingCopy}`;
      const keywordText = `${toolTitle?.toLowerCase() || ''}, ${category?.toLowerCase() || 'utility'}, in-browser ${toolTitle?.toLowerCase() || ''}, secure utility tool`;

      document.title = titleText;
      setCanonicalUrl(canonical);
      setMetaTag('name', 'description', descText);
      setMetaTag('name', 'robots', isIndexable ? 'index, follow' : 'noindex, nofollow');
      setMetaTag('name', 'keywords', keywordText);

      setMetaTag('property', 'og:site_name', 'Omnitily');
      setMetaTag('property', 'og:type', 'website');
      setMetaTag('property', 'og:title', titleText);
      setMetaTag('property', 'og:description', descText);
      setMetaTag('property', 'og:url', canonical);
      setOgImageTags();

      setMetaTag('name', 'twitter:card', 'summary_large_image');
      setMetaTag('name', 'twitter:title', titleText);
      setMetaTag('name', 'twitter:description', descText);


      if (isIndexable) {
        const webAppSchema = {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: toolTitle,
          url: canonical,
          operatingSystem: 'Web Browser',
          applicationCategory: category || 'UtilityApplication',
          description: toolDescription,
          isAccessibleForFree: true,
          author: {
            '@type': 'Organization',
            name: 'Omnitily',
          },
          offers: {
            '@type': 'Offer',
            price: '0.00',
            priceCurrency: 'USD',
          },
          browserRequirements: 'Requires HTML5 compatible web browser',
        };

        const breadcrumbSchema = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: `${DOMAIN}/`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: category || 'Utilities',
              item: category
                ? (() => {
                    const slug = CATEGORY_HUBS.find((h) => h.category === category)?.slug;
                    return slug ? `${DOMAIN}/tools/${slug}` : `${DOMAIN}/`;
                  })()
                : `${DOMAIN}/`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: toolTitle,
              item: canonical,
            },
          ],
        };

        const appScript = document.createElement('script');
        appScript.setAttribute('data-seo', 'omnitily-jsonld');
        appScript.type = 'application/ld+json';
        appScript.text = JSON.stringify(webAppSchema);
        document.head.appendChild(appScript);

        const breadcrumbScript = document.createElement('script');
        breadcrumbScript.setAttribute('data-seo', 'omnitily-jsonld');
        breadcrumbScript.type = 'application/ld+json';
        breadcrumbScript.text = JSON.stringify(breadcrumbSchema);
        document.head.appendChild(breadcrumbScript);
      }
    } else if (hubSlug) {
      // Category hub route (/tools/<slug>): SPA navigation lands here, while
      // the prerendered hub HTML carries the same meta for crawlers.
      const hub = CATEGORY_HUBS.find((h) => h.slug === hubSlug);
      if (hub) {
        const canonical = `${DOMAIN}/tools/${hub.slug}`;
        const title = hub.title;
        const desc = hub.description;

        document.title = title;
        setCanonicalUrl(canonical);
        setMetaTag('name', 'description', desc);
        setMetaTag('name', 'robots', 'index, follow');
        setMetaTag('name', 'keywords', `${hub.category.toLowerCase()}, free online tools, omnitily`);

        setMetaTag('property', 'og:site_name', 'Omnitily');
        setMetaTag('property', 'og:type', 'website');
        setMetaTag('property', 'og:title', title);
        setMetaTag('property', 'og:description', desc);
        setMetaTag('property', 'og:url', canonical);
        setOgImageTags();

        setMetaTag('name', 'twitter:card', 'summary_large_image');
        setMetaTag('name', 'twitter:title', title);
        setMetaTag('name', 'twitter:description', desc);

        const webPageSchema = {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: hub.category,
          url: canonical,
          description: desc,
        };

        const breadcrumbSchema = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: `${DOMAIN}/`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: hub.category,
              item: canonical,
            },
          ],
        };

        const pageScript = document.createElement('script');
        pageScript.setAttribute('data-seo', 'omnitily-jsonld');
        pageScript.type = 'application/ld+json';
        pageScript.text = JSON.stringify(webPageSchema);
        document.head.appendChild(pageScript);

        const breadcrumbScript = document.createElement('script');
        breadcrumbScript.setAttribute('data-seo', 'omnitily-jsonld');
        breadcrumbScript.type = 'application/ld+json';
        breadcrumbScript.text = JSON.stringify(breadcrumbSchema);
        document.head.appendChild(breadcrumbScript);
      }
    } else if (guideSlug) {
      // Guide article route (/guides/<slug>): SPA navigation lands here, while
      // the prerendered guide HTML carries the same meta for crawlers.
      const guide = GUIDES.find((g) => g.slug === guideSlug);
      if (guide) {
        const canonical = `${DOMAIN}/guides/${guide.slug}`;
        const title = `${guide.title} | Omnitily`;
        const desc = guide.description;

        document.title = title;
        setCanonicalUrl(canonical);
        setMetaTag('name', 'description', desc);
        setMetaTag('name', 'robots', 'index, follow');
        setMetaTag('name', 'keywords', `${guide.title.toLowerCase()}, how-to guide, free online tools, omnitily`);

        setMetaTag('property', 'og:site_name', 'Omnitily');
        setMetaTag('property', 'og:type', 'article');
        setMetaTag('property', 'og:title', title);
        setMetaTag('property', 'og:description', desc);
        setMetaTag('property', 'og:url', canonical);
        setOgImageTags();

        setMetaTag('name', 'twitter:card', 'summary_large_image');
        setMetaTag('name', 'twitter:title', title);
        setMetaTag('name', 'twitter:description', desc);

        const articleSchema = {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: guide.title,
          description: desc,
          author: {
            '@type': 'Organization',
            name: 'Omnitily',
          },
          datePublished: '2026-11-16',
          dateModified: guide.lastUpdated,
        };

        const howToSchema = {
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: guide.title,
          description: desc,
          step: guide.steps.map((step) => ({
            '@type': 'HowToStep',
            text: step,
          })),
        };

        const breadcrumbSchema = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: `${DOMAIN}/`,
            },
            {
              // No /guides index page exists, so "Guides" points at the
              // homepage; see scripts/prerender.ts (guides loop).
              '@type': 'ListItem',
              position: 2,
              name: 'Guides',
              item: `${DOMAIN}/`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: guide.title,
              item: canonical,
            },
          ],
        };

        const articleScript = document.createElement('script');
        articleScript.setAttribute('data-seo', 'omnitily-jsonld');
        articleScript.type = 'application/ld+json';
        articleScript.text = JSON.stringify(articleSchema);
        document.head.appendChild(articleScript);

        const howToScript = document.createElement('script');
        howToScript.setAttribute('data-seo', 'omnitily-jsonld');
        howToScript.type = 'application/ld+json';
        howToScript.text = JSON.stringify(howToSchema);
        document.head.appendChild(howToScript);

        const breadcrumbScript = document.createElement('script');
        breadcrumbScript.setAttribute('data-seo', 'omnitily-jsonld');
        breadcrumbScript.type = 'application/ld+json';
        breadcrumbScript.text = JSON.stringify(breadcrumbSchema);
        document.head.appendChild(breadcrumbScript);
      }
    } else {
      const title = 'Omnitily — Free Online Tools: Video, Image, PDF, Text & Developer Utilities';
      const desc = 'Free online tools for video, image, PDF, text and developer tasks. Download, convert, compress and edit files in your browser — no signup, no watermark.';
      const canonical = `${DOMAIN}/`;

      document.title = title;
      setCanonicalUrl(canonical);
      setMetaTag('name', 'description', desc);
      setMetaTag('name', 'robots', 'index, follow');
      setMetaTag('name', 'keywords', 'free online tools, video downloader, image compressor, qr code generator, pdf tools, video converter, text tools, developer tools');

      setMetaTag('property', 'og:site_name', 'Omnitily');
      setMetaTag('property', 'og:type', 'website');
      setMetaTag('property', 'og:title', title);
      setMetaTag('property', 'og:description', desc);
      setMetaTag('property', 'og:url', canonical);
      setOgImageTags();

      setMetaTag('name', 'twitter:card', 'summary_large_image');
      setMetaTag('name', 'twitter:title', title);
      setMetaTag('name', 'twitter:description', desc);


      const webSiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Omnitily',
        url: `${DOMAIN}/`,
        description: desc,
      };

      const orgSchema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Omnitily',
        url: `${DOMAIN}/`,
        logo: `${DOMAIN}/favicon.svg`,
      };

      const webAppSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Omnitily',
        url: `${DOMAIN}/`,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web Browser',
        isAccessibleForFree: true,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [...CATEGORY_HUBS.map((hub) => hub.category), 'Free online tools'],
      };

      const siteScript = document.createElement('script');
      siteScript.setAttribute('data-seo', 'omnitily-jsonld');
      siteScript.type = 'application/ld+json';
      siteScript.text = JSON.stringify(webSiteSchema);
      document.head.appendChild(siteScript);

      const orgScript = document.createElement('script');
      orgScript.setAttribute('data-seo', 'omnitily-jsonld');
      orgScript.type = 'application/ld+json';
      orgScript.text = JSON.stringify(orgSchema);
      document.head.appendChild(orgScript);

      const webAppScript = document.createElement('script');
      webAppScript.setAttribute('data-seo', 'omnitily-jsonld');
      webAppScript.type = 'application/ld+json';
      webAppScript.text = JSON.stringify(webAppSchema);
      document.head.appendChild(webAppScript);
    }
  }, [toolId, toolTitle, toolDescription, category, isIndexable, processingType, routeNotFound, staticPage, hubSlug, guideSlug]);

  return null;
};

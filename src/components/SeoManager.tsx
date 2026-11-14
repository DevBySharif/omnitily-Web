import React, { useEffect } from 'react';
import type { ProcessingType } from '../types';

interface SeoManagerProps {
  toolId: string | null;
  toolTitle?: string;
  toolDescription?: string;
  category?: string;
  isIndexable: boolean;
  processingType?: ProcessingType;
  routeNotFound?: boolean;
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
}) => {
  useEffect(() => {
    // Clean up previous JSON-LD script tags
    const existingScripts = document.querySelectorAll('script[data-seo="omnitily-jsonld"]');
    existingScripts.forEach((script) => script.remove());

    const isToolView = Boolean(toolId && toolTitle && toolDescription && !routeNotFound);

    if (routeNotFound) {
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
      setMetaTag('property', 'og:image', `${DOMAIN}/og-image.svg`);

      setMetaTag('name', 'twitter:card', 'summary_large_image');
      setMetaTag('name', 'twitter:title', title);
      setMetaTag('name', 'twitter:description', desc);
      setMetaTag('name', 'twitter:image', `${DOMAIN}/og-image.svg`);
    } else if (isToolView) {
      const canonical = `${DOMAIN}/tools/${toolId}`;
      const titleText = `${toolTitle} - Omnitily`;
      
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
      setMetaTag('property', 'og:image', `${DOMAIN}/og-image.svg`);

      setMetaTag('name', 'twitter:card', 'summary_large_image');
      setMetaTag('name', 'twitter:title', titleText);
      setMetaTag('name', 'twitter:description', descText);
      setMetaTag('name', 'twitter:image', `${DOMAIN}/og-image.svg`);

      if (isIndexable) {
        const webAppSchema = {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: toolTitle,
          url: canonical,
          operatingSystem: 'Web Browser',
          applicationCategory: category || 'UtilityApplication',
          description: toolDescription,
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
              item: `${DOMAIN}/`,
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
      setMetaTag('property', 'og:image', `${DOMAIN}/og-image.svg`);

      setMetaTag('name', 'twitter:card', 'summary_large_image');
      setMetaTag('name', 'twitter:title', title);
      setMetaTag('name', 'twitter:description', desc);
      setMetaTag('name', 'twitter:image', `${DOMAIN}/og-image.svg`);

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
    }
  }, [toolId, toolTitle, toolDescription, category, isIndexable, processingType, routeNotFound]);

  return null;
};

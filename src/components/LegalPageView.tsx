import React from 'react';
import type { LegalPage } from '../lib/legalContent';

/**
 * Renders a legal page (Privacy Policy / Terms of Service) from the shared
 * content in `src/lib/legalContent.ts`. The same content is prerendered to
 * static HTML by `scripts/prerender.ts`, so crawlers and reviewers see the
 * full text even before the SPA hydrates.
 */
export const LegalPageView: React.FC<{ page: LegalPage }> = ({ page }) => {
  return (
    <article className="mx-auto max-w-4xl px-4 py-8 pan-enter">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-zinc-400">
        <a href="/" className="font-medium hover:text-emerald-400">
          Home
        </a>
        <span className="text-zinc-600">/</span>
        <span className="font-semibold text-emerald-400" aria-current="page">
          {page.title}
        </span>
      </nav>

      <h1 className="text-3xl font-extrabold tracking-tight text-white">{page.title}</h1>
      <p className="mt-2 text-xs font-mono uppercase tracking-wider text-zinc-500">
        Last updated: {page.lastUpdated}
      </p>

      <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-zinc-400">
        {page.intro.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
      </div>

      {page.sections.map((section, sectionIndex) => (
        <section key={section.heading} className="mt-8 border-t border-zinc-800/60 pt-6">
          <h2 className="text-lg font-bold tracking-tight text-white">
            {sectionIndex + 1}. {section.heading}
          </h2>
          <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-zinc-400">
            {section.blocks.map((block, blockIndex) =>
              block.kind === 'paragraph' ? (
                <p key={`${section.heading}-p-${blockIndex}`}>{block.text}</p>
              ) : (
                <ul key={`${section.heading}-ul-${blockIndex}`} className="list-disc space-y-1.5 pl-5">
                  {block.items.map((item) => (
                    <li key={item.slice(0, 48)}>{item}</li>
                  ))}
                </ul>
              ),
            )}
          </div>
        </section>
      ))}

      <div className="mt-10 border-t border-zinc-800/60 pt-6">
        <a href="/" className="text-xs font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300">
          &larr; Back to Omnitily
        </a>
      </div>
    </article>
  );
};

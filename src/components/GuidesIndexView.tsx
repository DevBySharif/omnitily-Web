import React from 'react';
import type { Guide } from '../lib/guides';

/**
 * Renders the guides index page (`/guides`) from the shared content in
 * `src/lib/guides.ts`. Follows the `CategoryHubView` pattern: breadcrumb,
 * H1, intro copy, then a grid of guide cards using the same card styling
 * as the hub pages.
 */
export const GuidesIndexView: React.FC<{ guides: Guide[] }> = ({ guides }) => {
  return (
    <article className="mx-auto max-w-6xl px-4 py-8 pan-enter">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-zinc-400">
        <a href="/" className="font-medium hover:text-emerald-400">
          Home
        </a>
        <span className="text-zinc-600">/</span>
        <span className="font-semibold text-emerald-400" aria-current="page">
          Guides
        </span>
      </nav>

      <h1 className="text-3xl font-extrabold tracking-tight text-white">Guides</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
        Step-by-step how-to guides for Omnitily&rsquo;s free online tools. Each guide walks
        through a real task with the tool that does it — download, convert, compress, and
        edit files in your browser, no signup.
      </p>

      <section aria-labelledby="guides-index-heading" className="mt-10">
        <h2
          id="guides-index-heading"
          className="mb-4 font-mono text-sm font-bold uppercase tracking-wider text-white"
        >
          All guides ({guides.length})
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <a
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="tool-card flex flex-col justify-between gap-4 rounded-xl border border-zinc-800 bg-[#111114] p-5 shadow-xl hover:border-emerald-500/30"
            >
              <div>
                <h3 className="font-sans text-base font-bold tracking-tight text-white">{guide.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{guide.description}</p>
              </div>
              <div className="font-mono text-[10px] font-bold text-emerald-400">Read the guide &rarr;</div>
            </a>
          ))}
        </div>
      </section>

      <div className="mt-10 border-t border-zinc-800/60 pt-6">
        <a href="/" className="text-xs font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300">
          &larr; Back to Omnitily
        </a>
      </div>
    </article>
  );
};

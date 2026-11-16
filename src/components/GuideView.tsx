import React from 'react';
import type { Guide } from '../lib/guides';
import type { HubTool } from './CategoryHubView';

/**
 * Renders a guide article (`/guides/<slug>`) from the shared content in
 * `src/lib/guides.ts`. Follows the `CategoryHubView` pattern: breadcrumb,
 * H1, intro copy, numbered steps, FAQ, then cards linking to the related
 * tools using the same card styling as the hub pages.
 */
export const GuideView: React.FC<{ guide: Guide; tools: HubTool[] }> = ({ guide, tools }) => {
  return (
    <article className="mx-auto max-w-6xl px-4 py-8 pan-enter">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-zinc-400">
        <a href="/" className="font-medium hover:text-emerald-400">
          Home
        </a>
        <span className="text-zinc-600">/</span>
        <a href="/guides" className="font-medium hover:text-emerald-400">
          Guides
        </a>
        <span className="text-zinc-600">/</span>
        <span className="font-semibold text-emerald-400" aria-current="page">
          {guide.title}
        </span>
      </nav>

      <h1 className="text-3xl font-extrabold tracking-tight text-white">{guide.title}</h1>
      <p className="mt-2 text-xs font-mono uppercase tracking-wider text-zinc-500">
        Last updated: {guide.lastUpdated}
      </p>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">{guide.description}</p>
      {guide.intro.map((paragraph, index) => (
        <p key={index} className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          {paragraph}
        </p>
      ))}

      <section aria-labelledby="guide-steps-heading" className="mt-10">
        <h2
          id="guide-steps-heading"
          className="mb-4 font-mono text-sm font-bold uppercase tracking-wider text-white"
        >
          Steps
        </h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-400 sm:text-base">
          {guide.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="guide-faq-heading" className="mt-10">
        <h2
          id="guide-faq-heading"
          className="mb-4 font-mono text-sm font-bold uppercase tracking-wider text-white"
        >
          Frequently asked questions
        </h2>
        {guide.faqs.map((faq) => (
          <div key={faq.question} className="mt-4">
            <h3 className="text-sm font-semibold text-white">{faq.question}</h3>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">{faq.answer}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="guide-tools-heading" className="mt-10">
        <h2
          id="guide-tools-heading"
          className="mb-4 font-mono text-sm font-bold uppercase tracking-wider text-white"
        >
          Use the tool
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <a
              key={tool.id}
              href={`/tools/${tool.id}`}
              className="tool-card flex flex-col justify-between gap-4 rounded-xl border border-zinc-800 bg-[#111114] p-5 shadow-xl hover:border-emerald-500/30"
            >
              <div>
                <h3 className="font-sans text-base font-bold tracking-tight text-white">{tool.name}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{tool.description}</p>
              </div>
              <div className="font-mono text-[10px] font-bold text-emerald-400">Launch Workspace &rarr;</div>
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

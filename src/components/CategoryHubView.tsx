import React from 'react';
import type { CategoryHub } from '../lib/categoryHubs';

export interface HubTool {
  id: string;
  name: string;
  description: string;
}

/**
 * Renders a category hub page (`/tools/<slug>`) from the shared content in
 * `src/lib/categoryHubs.ts`. Follows the `LegalPageView` pattern: breadcrumb,
 * H1, intro copy, then a grid of tool cards using the same card styling as
 * the homepage tool grid in `scripts/prerender.ts`.
 */
export const CategoryHubView: React.FC<{ hub: CategoryHub; tools: HubTool[] }> = ({ hub, tools }) => {
  return (
    <article className="mx-auto max-w-6xl px-4 py-8 pan-enter">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-zinc-400">
        <a href="/" className="font-medium hover:text-emerald-400">
          Home
        </a>
        <span className="text-zinc-600">/</span>
        <span className="font-semibold text-emerald-400" aria-current="page">
          {hub.category}
        </span>
      </nav>

      <h1 className="text-3xl font-extrabold tracking-tight text-white">{hub.category}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">{hub.description}</p>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">{hub.intro}</p>

      <section aria-labelledby="hub-tools-heading" className="mt-10">
        <h2
          id="hub-tools-heading"
          className="mb-4 font-mono text-sm font-bold uppercase tracking-wider text-white"
        >
          {hub.category} Tools ({tools.length})
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <a
              key={tool.id}
              href={`/tools/${tool.id}`}
              className="tool-card flex flex-col justify-between gap-4 rounded-xl border border-zinc-800 bg-[#111114] p-5 shadow-xl hover:border-emerald-500/30"
            >
              <div>
                <span className="rounded border border-zinc-750 bg-zinc-850 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-zinc-400">
                  {hub.category}
                </span>
                <h3 className="mt-2 font-sans text-base font-bold tracking-tight text-white">{tool.name}</h3>
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

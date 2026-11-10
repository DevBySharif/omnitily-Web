import { lazy, Suspense, type ReactNode } from 'react';
import type { ToolDefinition } from '../types';
import { ComingSoonTool, DisabledTool, ProcessingPrivacyBadge, ToolStatusBadge } from './ToolAvailability';
import { INDEXABLE_TOOLS, type ToolId } from '../toolsData';

const ImageConverter = lazy(() => import('./ImageConverter'));
const PdfCompiler = lazy(() => import('./PdfCompiler'));
const AudioTrimmer = lazy(() => import('./AudioTrimmer'));
const QrGenerator = lazy(() => import('./QrGenerator'));
const ColorExtractor = lazy(() => import('./ColorExtractor'));
const GenericUtilityWorkspace = lazy(() => import('./GenericUtilityWorkspace'));
const YouTubeDownloader = lazy(() => import('./YouTubeDownloader'));
const InstagramDownloader = lazy(() => import('./InstagramDownloader'));
const TikTokDownloader = lazy(() => import('./TikTokDownloader'));
const FacebookDownloader = lazy(() => import('./FacebookDownloader'));
const SocialDownloader = lazy(() => import('./SocialDownloader'));
const VideoSplitter = lazy(() => import('./VideoSplitter'));

interface ToolWorkspaceProps {
  tool: ToolDefinition;
  onBack: () => void;
  onNavigate?: (toolId: ToolId | null) => void;
  initialFile?: File;
}

function ToolBreadcrumb({ tool, onNavigate }: { tool: ToolDefinition; onNavigate?: (toolId: ToolId | null) => void }) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-4xl px-4 py-2.5 mb-3 flex items-center text-xs text-zinc-400 border-b border-zinc-800/40">
      <ol className="flex items-center gap-1.5 flex-wrap" itemScope itemType="https://schema.org/BreadcrumbList">
        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="flex items-center gap-1.5">
          <a
            href="/"
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate(null);
              }
            }}
            className="hover:text-emerald-400 font-medium transition-colors cursor-pointer"
            itemProp="item"
          >
            <span itemProp="name">Home</span>
          </a>
          <meta itemProp="position" content="1" />
        </li>
        <li className="text-zinc-600 select-none">/</li>
        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="flex items-center gap-1.5">
          <span className="text-zinc-400 font-medium" itemProp="name">{tool.category}</span>
          <meta itemProp="item" content="https://omnitily.vercel.app/" />
          <meta itemProp="position" content="2" />
        </li>
        <li className="text-zinc-600 select-none">/</li>
        <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="flex items-center gap-1.5">
          <span className="text-emerald-400 font-semibold truncate max-w-[200px]" aria-current="page" itemProp="name">
            {tool.name}
          </span>
          <meta itemProp="item" content={`https://omnitily.vercel.app/tools/${tool.id}`} />
          <meta itemProp="position" content="3" />
        </li>
      </ol>
    </nav>
  );
}

function RelatedTools({ currentTool, onNavigate }: { currentTool: ToolDefinition; onNavigate?: (toolId: ToolId | null) => void }) {
  const sameCategory = INDEXABLE_TOOLS.filter((t) => t.id !== currentTool.id && t.category === currentTool.category);
  const otherCategory = INDEXABLE_TOOLS.filter((t) => t.id !== currentTool.id && t.category !== currentTool.category);
  const related = [...sameCategory, ...otherCategory].slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section aria-labelledby="related-tools-heading" className="mx-auto max-w-4xl px-4 mt-10 pt-6 border-t border-zinc-800/60">
      <div className="flex items-center justify-between mb-4">
        <h2 id="related-tools-heading" className="text-sm font-bold text-white uppercase tracking-wider font-mono">
          Related {currentTool.category} Utilities
        </h2>
        <a
          href="/"
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault();
              onNavigate(null);
            }
          }}
          className="text-xs text-emerald-400 hover:underline font-medium"
        >
          View All Utilities &rarr;
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {related.map((tool) => (
          <a
            key={tool.id}
            href={`/tools/${tool.id}`}
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate(tool.id as ToolId);
              }
            }}
            className="group bg-[#0d0d0f] border border-zinc-800/80 hover:border-emerald-500/50 p-3 rounded-xl transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                {tool.category}
              </span>
              <h3 className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                {tool.name}
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                {tool.description}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-emerald-400 font-mono">
              <span>Open Tool &rarr;</span>
              <span className="text-zinc-500 text-[9px] uppercase">{tool.status}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function EnabledToolFrame({ tool, onNavigate, children }: { tool: ToolDefinition; onNavigate?: (toolId: ToolId | null) => void; children: ReactNode }) {
  return (
    <div data-testid="enabled-tool-workspace">
      <ToolBreadcrumb tool={tool} onNavigate={onNavigate} />
      <div className="mx-auto mb-4 flex max-w-4xl flex-wrap items-center gap-3 px-4">
        <ToolStatusBadge status={tool.status} />
        <div className="min-w-[260px] flex-1"><ProcessingPrivacyBadge tool={tool} /></div>
      </div>
      {children}
      <RelatedTools currentTool={tool} onNavigate={onNavigate} />
    </div>
  );
}

function renderEnabledTool(tool: ToolDefinition, onBack: () => void, initialFile?: File) {
  switch (tool.componentKey) {
    case 'image-converter': return <ImageConverter onBack={onBack} initialFile={initialFile} />;
    case 'pdf-compiler': return <PdfCompiler onBack={onBack} initialFile={initialFile} />;
    case 'audio-trimmer': return <AudioTrimmer onBack={onBack} initialFile={initialFile} />;
    case 'qr-generator': return <QrGenerator onBack={onBack} />;
    case 'color-extractor': return <ColorExtractor onBack={onBack} initialFile={initialFile} />;
    case 'youtube-downloader': return <YouTubeDownloader onBack={onBack} />;
    case 'instagram-downloader': return <InstagramDownloader onBack={onBack} />;
    case 'tiktok-downloader': return <TikTokDownloader onBack={onBack} />;
    case 'facebook-downloader': return <FacebookDownloader onBack={onBack} />;
    case 'social-downloader': return <SocialDownloader onBack={onBack} />;
    case 'video-splitter': return <VideoSplitter onBack={onBack} initialFile={initialFile} />;
    case 'generic': return <GenericUtilityWorkspace tool={tool} onBack={onBack} initialFile={initialFile} />;
    case undefined: throw new Error(`Enabled tool ${tool.id} is missing a component key.`);
  }
}

export default function ToolWorkspace({ tool, onBack, onNavigate, initialFile }: ToolWorkspaceProps) {
  if (tool.status === 'coming-soon') {
    return (
      <div>
        <ToolBreadcrumb tool={tool} onNavigate={onNavigate} />
        <ComingSoonTool tool={tool} onBack={onBack} />
        <RelatedTools currentTool={tool} onNavigate={onNavigate} />
      </div>
    );
  }

  if (tool.status === 'disabled') {
    return (
      <div>
        <ToolBreadcrumb tool={tool} onNavigate={onNavigate} />
        <DisabledTool tool={tool} onBack={onBack} />
        <RelatedTools currentTool={tool} onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <EnabledToolFrame tool={tool} onNavigate={onNavigate}>
      <Suspense fallback={<div role="status" className="p-10 text-center text-sm text-zinc-400">Loading tool workspace…</div>}>
        {renderEnabledTool(tool, onBack, initialFile)}
      </Suspense>
    </EnabledToolFrame>
  );
}

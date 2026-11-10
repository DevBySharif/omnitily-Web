# Public tool visibility policy

**Effective:** P1-B visibility cleanup (2026-08-04)

> **Update (2026-11-10, video-tools phase):** the catalog now has 117 routes with 37 functional / 24 beta / 43 coming-soon / 13 disabled (`src/toolsData.ts` is the source of truth). The counts in this document are the 2026-08-04 snapshot and are superseded by that update.

## Rule

Only **functional** (production-ready) tools may be publicly visible. Tools with `beta`, `coming-soon`, or `disabled` status are hidden from every public discovery surface while keeping their stable routes, truthful status pages, and implementations intact.

This is a *visibility* policy, not an availability policy: no statuses change, no routes are removed, no implementations are deleted, and `social-downloader` is untouched.

## Public surfaces (all must show functional tools only)

| Surface | Implementation | Post-cleanup |
|---|---|---|
| Homepage tool grid + search | `App.tsx` `filteredTools` uses `PUBLIC_TOOLS` | 12 cards |
| Category chips | `App.tsx` `categories` derived from `PUBLIC_TOOLS` | Only categories with functional tools |
| File-routing suggestions | `App.tsx` `getRoutingOptions` uses `PUBLIC_TOOLS` | Functional only |
| Keyboard shortcuts | `App.tsx` hotkey resolver uses `PUBLIC_TOOLS` | Functional only |
| Pinned workspaces | `App.tsx` `visiblePinnedToolIds` filters stale pins | Functional only |
| Global drag-and-drop overlay | `App.tsx` image targets only (`image-converter`, `pdf-compiler`, `color-extractor`) | No audio/video/other target names hidden tools |
| Related-tools lists | `ToolWorkspace.tsx` + `scripts/prerender.ts` use `INDEXABLE_TOOLS` (= functional) | Functional only |
| Sitemap + prerendering | `scripts/generate-sitemap.ts` / `scripts/prerender.ts` from `INDEXABLE_TOOLS` | 1 homepage + 12 tool pages |
| Robots / indexing | `isIndexable` is `status === 'functional'` | Hidden routes emit `noindex` |

## Source of truth

`src/toolsData.ts` exports:

- `FUNCTIONAL_TOOLS` / `PUBLIC_TOOLS` — the 12 functional tools
- `HIDDEN_TOOLS` — the 101 non-functional tools
- `PUBLIC_TOOL_IDS` — Set of functional ids (used to prune stale pins)
- `INDEXABLE_TOOLS` — functional-only (drives SEO/prerender)
- `TOOL_REGISTRY` / `TOOLS_LIST` / `TOOL_BY_ID` / `isToolId` — unchanged, all 113 routes preserved

No UI component hardcodes tool id arrays; all surfaces derive from these selectors.

## Preserved guarantees

- All 113 `/tools/<id>` routes resolve (`isToolId` unchanged).
- Status totals stay 12 functional / 30 beta / 51 coming-soon / 20 disabled.
- Hidden routes render truthful `ComingSoonTool` / `DisabledTool` pages and never mount generic work when the status forbids it.
- Hidden routes are `noindex` and excluded from sitemap + prerender.
- `social-downloader`, `video-splitter`, `audio-transcriber`, and all other hidden tools are not modified, not promoted, and not mentioned in public UI copy.

## Verification

Enforced by `tests/registry.test.ts` (selectors), `tests/seo.test.ts` (sitemap/prerender/robots), and `tests/e2e/catalog.spec.ts` (homepage + search visibility), plus the full build/typecheck/lint/audit gates.

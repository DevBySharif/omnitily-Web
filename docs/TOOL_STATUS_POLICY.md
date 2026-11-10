# Tool status policy

`src/toolsData.ts` is the catalog source of truth. Its 117 stable IDs drive routes, cards, search, categories, pins, badges, component selection, SEO, sitemap inclusion, formats, and processing disclosures.

In the zero-cost production catalog the totals are 37 functional, 24 beta, 43 coming soon, and 13 disabled. Security and operational requirements take precedence over retaining Beta status; `social-downloader` and `audio-transcriber` are disabled.

| Status | Meaning | Executable | Public catalog & indexable |
|---|---|---:|---:|
| `functional` | Audited primary operation produces its advertised result | Yes | Yes |
| `beta` | Useful but incomplete, limited, or provider-dependent | Yes, with Beta label | No |
| `coming-soon` | Processing is not implemented | No | No |
| `disabled` | Existing behavior is unsafe, fabricated, invalid, or misleading | No | No |

## Public visibility

Only **functional** tools are surfaced publicly. The public catalog (`PUBLIC_TOOLS` / `FUNCTIONAL_TOOLS` in `src/toolsData.ts`) drives the homepage grid, search, category chips, pinned workspaces, keyboard shortcuts, file-routing suggestions, related-tool lists, and the global drag-and-drop overlay (image drop targets only).

Beta, coming-soon, and disabled tools keep their stable `/tools/<id>` routes and truthful status pages, but:

- they are not rendered as cards, search hits, pin suggestions, shortcuts, routing options, or related tools;
- they are not indexable (`isIndexable: false`) and get `noindex, nofollow` robots;
- they are excluded from `INDEXABLE_TOOLS`, the sitemap, and static prerendering;
- they are not featured (`isFeatured: false`) and never named in public drag-and-drop copy.

Unavailable entries have `processingType: none`, no component key, no supported formats, and are guarded before lazy imports. Server/external entries require a privacy notice. Promotion requires implementation review plus deterministic happy-path and failure-path tests; UI presence or a success toast is not evidence.

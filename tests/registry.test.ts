import { describe, expect, it } from 'vitest';
import { FUNCTIONAL_TOOLS, HIDDEN_TOOLS, INDEXABLE_TOOLS, PUBLIC_TOOLS, PUBLIC_TOOL_IDS, TOOL_BY_ID, TOOL_REGISTRY, isToolId } from '../src/toolsData';

describe('typed tool registry', () => {
  it('contains exactly 117 unique route definitions', () => {
    expect(TOOL_REGISTRY).toHaveLength(117);
    expect(new Set(TOOL_REGISTRY.map((tool) => tool.id)).size).toBe(117);
  });

  it('uses the zero-cost catalog totals and disables transcription truthfully', () => {
    const totals = Object.fromEntries(['functional', 'beta', 'coming-soon', 'disabled'].map((status) => [status, TOOL_REGISTRY.filter((tool) => tool.status === status).length]));
    expect(totals).toEqual({ functional: 37, beta: 24, 'coming-soon': 43, disabled: 13 });
    expect(TOOL_BY_ID['audio-transcriber']).toMatchObject({ status: 'disabled', processingType: 'none', isIndexable: false });
    expect(TOOL_BY_ID['audio-transcriber'].componentKey).toBeUndefined();
    expect(TOOL_BY_ID['audio-transcriber'].statusReason).toMatch(/Server-based transcription is temporarily unavailable/i);
  });

  it('uses only valid statuses and processing types', () => {
    expect(TOOL_REGISTRY.every((tool) => ['functional', 'beta', 'coming-soon', 'disabled'].includes(tool.status))).toBe(true);
    expect(TOOL_REGISTRY.every((tool) => ['browser', 'server', 'external', 'none'].includes(tool.processingType))).toBe(true);
  });

  it('resolves every route through the typed lookup', () => {
    for (const tool of TOOL_REGISTRY) {
      expect(isToolId(tool.id)).toBe(true);
      expect(TOOL_BY_ID[tool.id]).toBe(tool);
    }
  });

  it.each(['disabled', 'coming-soon'] as const)('%s tools are neither featured nor indexable', (status) => {
    for (const tool of TOOL_REGISTRY.filter((candidate) => candidate.status === status)) {
      expect(tool.isFeatured).toBe(false);
      expect(tool.isIndexable).toBe(false);
      expect(tool.componentKey).toBeUndefined();
    }
  });

  it('uses processing type none only for unavailable tools', () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.processingType === 'none').toBe(tool.status === 'disabled' || tool.status === 'coming-soon');
    }
  });

  it('provides privacy notices for every server and external tool', () => {
    for (const tool of TOOL_REGISTRY.filter((candidate) => candidate.processingType === 'server' || candidate.processingType === 'external')) {
      expect(tool.privacyNotice).toBeTruthy();
    }
  });

  it('provides a reason for every disabled tool', () => {
    for (const tool of TOOL_REGISTRY.filter((candidate) => candidate.status === 'disabled')) expect(tool.statusReason).toBeTruthy();
  });

  it('exposes public catalog selectors limited to the 37 functional tools', () => {
    expect(FUNCTIONAL_TOOLS).toHaveLength(37);
    expect(PUBLIC_TOOLS).toHaveLength(37);
    expect(HIDDEN_TOOLS).toHaveLength(80);
    expect(PUBLIC_TOOLS.every((tool) => tool.status === 'functional')).toBe(true);
    expect(HIDDEN_TOOLS.every((tool) => tool.status !== 'functional')).toBe(true);
    expect(PUBLIC_TOOLS.length + HIDDEN_TOOLS.length).toBe(TOOL_REGISTRY.length);
  });

  it('only functional tools are indexable, featured, and in the public id set', () => {
    expect(PUBLIC_TOOL_IDS.size).toBe(PUBLIC_TOOLS.length);
    for (const tool of TOOL_REGISTRY) {
      const isPublic = tool.status === 'functional';
      expect(PUBLIC_TOOL_IDS.has(tool.id)).toBe(isPublic);
      expect(tool.isIndexable).toBe(isPublic);
      expect(tool.isFeatured).toBe(isPublic && Boolean(tool.badge));
    }
    expect(INDEXABLE_TOOLS.map((tool) => tool.id).sort()).toEqual(PUBLIC_TOOLS.map((tool) => tool.id).sort());
  });
});

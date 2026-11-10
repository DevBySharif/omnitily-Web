import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ToolWorkspace from '../src/components/ToolWorkspace';
import { decodeBase64Safely, decodeUrlSafely } from '../src/lib/toolTransforms';
import { TOOL_BY_ID } from '../src/toolsData';

vi.mock('../src/components/GenericUtilityWorkspace', () => ({ default: () => <div data-testid="generic-workspace">Generic workspace</div> }));

describe('unavailable-route regressions', () => {
  it.each(['exif-viewer', 'yaml-to-json', 'scientific-calc'] as const)('%s cannot mount executable generic code', (id) => {
    render(<ToolWorkspace tool={TOOL_BY_ID[id]} onBack={() => undefined} />);
    expect(screen.queryByTestId('generic-workspace')).not.toBeInTheDocument();
    expect(screen.queryByText(/success|camera model|yaml converter simulation|action triggered/i)).not.toBeInTheDocument();
  });

  it('coming-soon routes cannot start progress or produce output', () => {
    render(<ToolWorkspace tool={TOOL_BY_ID['image-cropper']} onBack={() => undefined} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/success|completed|result/i)).not.toBeInTheDocument();
  });

  it('back navigation remains available on unavailable routes', () => {
    const back = vi.fn();
    render(<ToolWorkspace tool={TOOL_BY_ID['audio-transcriber']} onBack={back} />);
    fireEvent.click(screen.getByRole('button', { name: /back to catalog/i }));
    expect(back).toHaveBeenCalledOnce();
  });
});

describe('safe decoder regressions', () => {
  it('handles malformed URL encoding without throwing', () => expect(decodeUrlSafely('%E0%A4%A')).toEqual({ error: 'Invalid URL-encoded input.' }));
  it('handles malformed Base64 without throwing', () => expect(decodeBase64Safely('%%%')).toEqual({ error: 'Invalid Base64 input.' }));
});

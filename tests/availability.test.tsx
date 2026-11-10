import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import ToolWorkspace from '../src/components/ToolWorkspace';
import { TOOL_BY_ID } from '../src/toolsData';

vi.mock('../src/components/ImageConverter', () => ({ default: () => <div data-testid="image-converter-real">Image converter workspace</div> }));
vi.mock('../src/components/GenericUtilityWorkspace', () => ({ default: () => <div data-testid="generic-workspace">Generic workspace</div> }));

const back = vi.fn();

describe('truthful route availability', () => {
  it('mounts a functional route real component', async () => {
    render(<ToolWorkspace tool={TOOL_BY_ID['image-converter']} onBack={back} />);
    expect(await screen.findByTestId('image-converter-real')).toBeInTheDocument();
  });

  it('mounts a beta route and displays beta state', async () => {
    render(<ToolWorkspace tool={TOOL_BY_ID['image-compressor']} onBack={back} />);
    expect(await screen.findByTestId('generic-workspace')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('shows honest coming-soon content without generic controls', () => {
    render(<ToolWorkspace tool={TOOL_BY_ID['image-cropper']} onBack={back} />);
    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
    expect(screen.getByText(/processing for this tool is not implemented/i)).toBeInTheDocument();
    expect(screen.queryByTestId('generic-workspace')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /execute|convert|process|download/i })).not.toBeInTheDocument();
  });

  it('shows the disabled reason without mounting risky code', () => {
    render(<ToolWorkspace tool={TOOL_BY_ID['scientific-calc']} onBack={back} />);
    expect(screen.getByText('Temporarily Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/executed user input as JavaScript/i)).toBeInTheDocument();
    expect(screen.queryByTestId('generic-workspace')).not.toBeInTheDocument();
  });

  it('shows the zero-cost transcription unavailable state without loading its component', () => {
    render(<ToolWorkspace tool={TOOL_BY_ID['audio-transcriber']} onBack={back} />);
    expect(screen.getByText('Temporarily Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/Server-based transcription is temporarily unavailable in the free deployment/i)).toBeInTheDocument();
    expect(screen.queryByTestId('enabled-tool-workspace')).not.toBeInTheDocument();
  });

  it('shows a not-found page for an unknown direct route', async () => {
    window.history.pushState({}, '', '/tools/not-a-real-tool');
    render(<Suspense><App /></Suspense>);
    expect(await screen.findByTestId('tool-not-found')).toBeInTheDocument();
  });

  it('supports direct navigation to a known tool URL', async () => {
    window.history.pushState({}, '', '/tools/image-converter');
    render(<App />);
    expect(await screen.findByTestId('image-converter-real')).toBeInTheDocument();
  });
});

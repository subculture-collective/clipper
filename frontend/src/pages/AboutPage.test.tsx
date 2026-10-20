import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AboutPage } from './AboutPage';

vi.mock('../components', async () => {
  const { Button } = await vi.importActual<typeof import('../components/ui/Button')>('../components/ui/Button');
  return {
    Button,
    Container: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SEO: () => null,
  };
});

const fetchClipsMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/clip-api', () => ({ fetchClips: fetchClipsMock }));

describe('AboutPage', () => {
  const renderPage = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><MemoryRouter><AboutPage /></MemoryRouter></QueryClientProvider>);
  };

  it('presents clpr as a place to find clips by creator, topic and tag', () => {
    fetchClipsMock.mockResolvedValue({ clips: [] });
    renderPage();
    expect(screen.getByRole('heading', { name: /somebody clipped it/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /streams wander/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what.s in here/i })).toBeInTheDocument();
  });

  it("shows today's clips and leaves out flagged or thumbnail-less ones", async () => {
    fetchClipsMock.mockResolvedValue({
      clips: [
        { id: 'a', title: 'First clip', broadcaster_name: 'one', thumbnail_url: 'https://example.test/a.jpg' },
        { id: 'b', title: 'Flagged clip', broadcaster_name: 'two', thumbnail_url: 'https://example.test/b.jpg', is_nsfw: true },
        { id: 'c', title: 'No thumbnail', broadcaster_name: 'three' },
      ],
    });
    renderPage();
    expect(await screen.findByRole('link', { name: /first clip/i })).toHaveAttribute('href', '/clip/a');
    expect(screen.queryByText('Flagged clip')).not.toBeInTheDocument();
    expect(screen.queryByText('No thumbnail')).not.toBeInTheDocument();
  });

  it('omits the live section when no clips load', async () => {
    fetchClipsMock.mockRejectedValue(new Error('offline'));
    renderPage();
    expect(screen.queryByRole('heading', { name: /on clpr right now/i })).not.toBeInTheDocument();
  });

  it('does not advertise development or repository links', () => {
    fetchClipsMock.mockResolvedValue({ clips: [] });
    const { container } = renderPage();
    expect(container).not.toHaveTextContent(/open source|technology stack|github/i);
  });

  it('links to community rules, contact, and Patreon', () => {
    fetchClipsMock.mockResolvedValue({ clips: [] });
    renderPage();
    expect(screen.getByRole('link', { name: /community rules/i })).toHaveAttribute('href', '/community-rules');
    expect(screen.getByRole('link', { name: /contact us/i })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: /support subcult/i })).toHaveAttribute('href', 'https://subcult.tv/support');
  });
});

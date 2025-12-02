import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import type { Mocked } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DocsPage } from './DocsPage';
import axios from 'axios';

// Mock the components
vi.mock('../components', () => ({
  Container: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Card: ({ children, id, className }: { children: React.ReactNode; id?: string; className?: string }) => <div id={id} className={className}>{children}</div>,
  CardBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SEO: ({ title }: { title: string }) => <div data-testid="seo">{title}</div>,
}));

vi.mock('axios');

const mockedAxios = axios as Mocked<typeof axios>;

const mockDocsResponse = {
  docs: [
    {
      name: 'getting-started',
      path: 'getting-started',
      type: 'directory' as const,
      children: [
        {
          name: 'user-guide.md',
          path: 'getting-started/user-guide.md',
          type: 'file' as const,
        },
      ],
    },
    {
      name: 'development',
      path: 'development',
      type: 'directory' as const,
      children: [
        {
          name: 'dev-setup.md',
          path: 'development/dev-setup.md',
          type: 'file' as const,
        },
      ],
    },
  ],
};

const mockDocContent = {
  path: 'getting-started/user-guide.md',
  content: '# Getting Started\nSome content',
  github_url: 'https://github.com/subculture-collective/clipper/blob/main/docs/getting-started.md',
};

beforeAll(() => {
  window.scrollTo = vi.fn();
});

beforeEach(() => {
  mockedAxios.get.mockReset();
  mockedAxios.get.mockImplementation((url: string) => {
    if (url === '/api/v1/docs') {
      return Promise.resolve({ data: mockDocsResponse });
    }
    if (url.startsWith('/api/v1/docs/')) {
      return Promise.resolve({ data: mockDocContent });
    }
    if (url.startsWith('/api/v1/docs/search')) {
      return Promise.resolve({ data: { results: [] } });
    }
    return Promise.resolve({ data: {} });
  });
});

afterEach(() => {
  mockedAxios.get.mockClear();
});

describe('DocsPage', () => {
  it('renders the documentation hub heading and doc tree once data loads', async () => {
    render(
      <MemoryRouter>
        <DocsPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /documentation hub/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /user guide/i })).toBeInTheDocument();
  });

  it('allows opening a document from the tree', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DocsPage />
      </MemoryRouter>
    );

    const docButton = await screen.findByRole('button', { name: /user guide/i });
    await user.click(docButton);

    await waitFor(() => {
      expect(screen.getByText(/getting started/i)).toBeInTheDocument();
    });
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/docs/getting-started/user-guide.md');
  });

  it('renders external resources links', async () => {
    render(
      <MemoryRouter>
        <DocsPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /external resources/i })).toBeInTheDocument();
    expect(screen.getByText('GitHub Repository')).toBeInTheDocument();
    expect(screen.getByText('Issue Tracker')).toBeInTheDocument();
    expect(screen.getByText('Discussions')).toBeInTheDocument();
  });
});

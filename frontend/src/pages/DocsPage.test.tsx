<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> main
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import type { Mocked } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
<<<<<<< HEAD
import { MemoryRouter } from 'react-router-dom';
import { DocsPage } from './DocsPage';
import axios from 'axios';
=======
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocsPage } from './DocsPage';
>>>>>>> main
=======
import { MemoryRouter } from 'react-router-dom';
import { DocsPage } from './DocsPage';
import axios from 'axios';
>>>>>>> main

// Mock the components
vi.mock('../components', () => ({
  Container: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Card: ({ children, id, className }: { children: React.ReactNode; id?: string; className?: string }) => <div id={id} className={className}>{children}</div>,
  CardBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SEO: ({ title }: { title: string }) => <div data-testid="seo">{title}</div>,
}));

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> main
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

<<<<<<< HEAD
describe('DocsPage', () => {
  it('renders the documentation hub heading and doc tree once data loads', async () => {
=======
describe('DocsPage', () => {
  it('renders the documentation hub heading', () => {
>>>>>>> main
=======
describe('DocsPage', () => {
  it('renders the documentation hub heading and doc tree once data loads', async () => {
>>>>>>> main
    render(
      <MemoryRouter>
        <DocsPage />
      </MemoryRouter>
    );

<<<<<<< HEAD
<<<<<<< HEAD
    expect(await screen.findByRole('heading', { name: /documentation hub/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /user guide/i })).toBeInTheDocument();
  });

  it('allows opening a document from the tree', async () => {
    const user = userEvent.setup();
=======
    expect(screen.getByRole('heading', { name: /documentation hub/i })).toBeInTheDocument();
  });

  it('renders all major documentation sections', () => {
>>>>>>> main
=======
    expect(await screen.findByRole('heading', { name: /documentation hub/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /user guide/i })).toBeInTheDocument();
  });

  it('allows opening a document from the tree', async () => {
    const user = userEvent.setup();
>>>>>>> main
    render(
      <MemoryRouter>
        <DocsPage />
      </MemoryRouter>
    );

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> main
    const docButton = await screen.findByRole('button', { name: /user guide/i });
    await user.click(docButton);

    await waitFor(() => {
      expect(screen.getByText(/getting started/i)).toBeInTheDocument();
    });
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/docs/getting-started/user-guide.md');
<<<<<<< HEAD
  });

  it('renders external resources links', async () => {
=======
    // Check for major section headings using getAllByRole
    const headings = screen.getAllByRole('heading');
    const headingTexts = headings.map(h => h.textContent);
    
    expect(headingTexts).toContain('Getting Started');
    expect(headingTexts).toContain('Development');
    expect(headingTexts).toContain('Architecture & Design');
    expect(headingTexts).toContain('API Documentation');
    expect(headingTexts).toContain('Operations & Infrastructure');
    expect(headingTexts).toContain('Features & Systems');
    expect(headingTexts).toContain('Security');
  });

  it('renders quick links section', () => {
>>>>>>> main
=======
  });

  it('renders external resources links', async () => {
>>>>>>> main
    render(
      <MemoryRouter>
        <DocsPage />
      </MemoryRouter>
    );

<<<<<<< HEAD
<<<<<<< HEAD
    expect(await screen.findByRole('heading', { name: /external resources/i })).toBeInTheDocument();
    expect(screen.getByText('GitHub Repository')).toBeInTheDocument();
    expect(screen.getByText('Issue Tracker')).toBeInTheDocument();
    expect(screen.getByText('Discussions')).toBeInTheDocument();
  });
=======
    expect(screen.getByRole('heading', { name: /quick links/i })).toBeInTheDocument();
    expect(screen.getByText(/learn how to contribute to clipper/i)).toBeInTheDocument();
    expect(screen.getByText(/incident response and procedures/i)).toBeInTheDocument();
    expect(screen.getByText(/view source code and issues/i)).toBeInTheDocument();
  });

  it('renders links to documentation files', () => {
    render(
      <MemoryRouter>
        <DocsPage />
      </MemoryRouter>
    );

    // Check for some key documentation descriptions (unique text)
    expect(screen.getByText(/how to use clipper as a user/i)).toBeInTheDocument();
    expect(screen.getByText(/high-level system design and architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/complete api endpoints documentation/i)).toBeInTheDocument();
    expect(screen.getByText(/operational procedures and incident response/i)).toBeInTheDocument();
    expect(screen.getByText(/user roles and permissions/i)).toBeInTheDocument();
  });

  it('renders additional resources section', () => {
    render(
      <MemoryRouter>
        <DocsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /additional resources/i })).toBeInTheDocument();
    expect(screen.getByText('Code of Conduct')).toBeInTheDocument();
    expect(screen.getByText('Changelog')).toBeInTheDocument();
    expect(screen.getByText('Issue Tracker')).toBeInTheDocument();
    expect(screen.getByText('Discussions')).toBeInTheDocument();
  });

  it('renders system status section', () => {
    render(
      <MemoryRouter>
        <DocsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /system status/i })).toBeInTheDocument();
    expect(screen.getByText(/for real-time system status/i)).toBeInTheDocument();
  });

  it('links to GitHub documentation files', () => {
    render(
      <MemoryRouter>
        <DocsPage />
      </MemoryRouter>
    );

    // Check that links point to GitHub
    const links = screen.getAllByRole('link');
    const githubLinks = links.filter(link => 
      link.getAttribute('href')?.includes('github.com/subculture-collective/clipper')
    );
    
    expect(githubLinks.length).toBeGreaterThan(0);
  });
>>>>>>> main
=======
    expect(await screen.findByRole('heading', { name: /external resources/i })).toBeInTheDocument();
    expect(screen.getByText('GitHub Repository')).toBeInTheDocument();
    expect(screen.getByText('Issue Tracker')).toBeInTheDocument();
    expect(screen.getByText('Discussions')).toBeInTheDocument();
  });
>>>>>>> main
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocsPage } from './DocsPage';

// Mock the components
vi.mock('../components', () => ({
  Container: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Card: ({ children, id, className }: { children: React.ReactNode; id?: string; className?: string }) => <div id={id} className={className}>{children}</div>,
  CardBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SEO: ({ title }: { title: string }) => <div data-testid="seo">{title}</div>,
}));

describe('DocsPage', () => {
  it('renders the documentation hub heading', () => {
    render(
      <MemoryRouter>
        <DocsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /documentation hub/i })).toBeInTheDocument();
  });

  it('renders all major documentation sections', () => {
    render(
      <MemoryRouter>
        <DocsPage />
      </MemoryRouter>
    );

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
    render(
      <MemoryRouter>
        <DocsPage />
      </MemoryRouter>
    );

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
});

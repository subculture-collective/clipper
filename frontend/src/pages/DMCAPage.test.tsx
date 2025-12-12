import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DMCAPage } from './DMCAPage';

// Mock the components (include SEO to avoid helmet interactions in tests)
vi.mock('../components', () => ({
    Container: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
    Card: ({ children, id }: { children: React.ReactNode; id?: string }) => (
        <div id={id}>{children}</div>
    ),
    CardBody: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
    SEO: () => null,
}));

describe('DMCAPage', () => {
    it('renders the page title', () => {
        render(
            <MemoryRouter>
                <DMCAPage />
            </MemoryRouter>
        );

        expect(screen.getByText('DMCA Copyright Policy')).toBeInTheDocument();
    });

    it('displays the last updated date', () => {
        render(
            <MemoryRouter>
                <DMCAPage />
            </MemoryRouter>
        );

        expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
    });

    it('renders key DMCA sections', () => {
        render(
            <MemoryRouter>
                <DMCAPage />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: /Designated DMCA Agent/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Filing a DMCA Takedown Notice/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Our Response Process/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Filing a Counter-Notice/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Repeat Infringer Policy/i })).toBeInTheDocument();
    });

    it('has anchor IDs for navigation', () => {
        const { container } = render(
            <MemoryRouter>
                <DMCAPage />
            </MemoryRouter>
        );

        expect(container.querySelector('#dmca-agent')).toBeInTheDocument();
        expect(container.querySelector('#filing-takedown')).toBeInTheDocument();
        expect(container.querySelector('#response-process')).toBeInTheDocument();
        expect(container.querySelector('#counter-notice')).toBeInTheDocument();
        expect(container.querySelector('#repeat-infringer')).toBeInTheDocument();
    });

    it('displays DMCA agent email', () => {
        render(
            <MemoryRouter>
                <DMCAPage />
            </MemoryRouter>
        );

        const emailLinks = screen.getAllByText(/dmca@clpr\.tv/i);
        expect(emailLinks.length).toBeGreaterThan(0);
    });

    it('explains three-strike system', () => {
        render(
            <MemoryRouter>
                <DMCAPage />
            </MemoryRouter>
        );

        expect(screen.getByText(/Strike 1 - First Offense/i)).toBeInTheDocument();
        expect(screen.getByText(/Strike 2 - Second Offense/i)).toBeInTheDocument();
        expect(screen.getByText(/Strike 3 - Third Offense/i)).toBeInTheDocument();
    });

    it('includes fair use information', () => {
        render(
            <MemoryRouter>
                <DMCAPage />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: /Fair Use and User Rights/i })).toBeInTheDocument();
        const legalCitation = screen.getByText(/17 U\.S\.C\. § 107/i);
        expect(legalCitation).toBeInTheDocument();
    });

    it('warns about false claims', () => {
        render(
            <MemoryRouter>
                <DMCAPage />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: /False Claims and Misrepresentation/i })).toBeInTheDocument();
        const legalCitation = screen.getByText(/17 U\.S\.C\. § 512\(f\)/i);
        expect(legalCitation).toBeInTheDocument();
    });

    it('explains no monitoring obligation', () => {
        render(
            <MemoryRouter>
                <DMCAPage />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: /No Obligation to Monitor/i })).toBeInTheDocument();
    });

    it('includes contact information section', () => {
        render(
            <MemoryRouter>
                <DMCAPage />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: /^Contact Information$/i })).toBeInTheDocument();
    });

    it('links to external copyright resources', () => {
        render(
            <MemoryRouter>
                <DMCAPage />
            </MemoryRouter>
        );

        const copyrightLinks = screen.getAllByRole('link', { name: /U\.S\. Copyright Office/i });
        expect(copyrightLinks.length).toBeGreaterThan(0);
    });

    it('mentions DMCA safe harbor', () => {
        render(
            <MemoryRouter>
                <DMCAPage />
            </MemoryRouter>
        );

        expect(screen.getByText(/DMCA safe harbor/i)).toBeInTheDocument();
    });

    it('describes response timeline', () => {
        render(
            <MemoryRouter>
                <DMCAPage />
            </MemoryRouter>
        );

        expect(screen.getByText(/Within 24 Hours/i)).toBeInTheDocument();
        expect(screen.getByText(/Within 24-48 Hours/i)).toBeInTheDocument();
        expect(screen.getByText(/Within 48-72 Hours/i)).toBeInTheDocument();
    });

    it('explains strike expiration', () => {
        render(
            <MemoryRouter>
                <DMCAPage />
            </MemoryRouter>
        );

        expect(screen.getByText(/Strike Expiration/i)).toBeInTheDocument();
        expect(screen.getByText(/12 months/i)).toBeInTheDocument();
    });
});

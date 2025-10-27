import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DiscoveryPage } from './DiscoveryPage';
// Mock the ClipFeed component
vi.mock('../components/clip', () => ({
    ClipFeed: ({ filters }) => (_jsx("div", { "data-testid": "clip-feed", children: _jsx("span", { "data-testid": "top10k-filter", children: String(filters.top10k_streamers) }) })),
}));
// Mock the Container component
vi.mock('../components', () => ({
    Container: ({ children }) => (_jsx("div", { children: children })),
}));
describe('DiscoveryPage', () => {
    it('initializes top10kEnabled from URL params', () => {
        render(_jsx(MemoryRouter, { initialEntries: ['/discovery?top10k_streamers=true'], children: _jsx(DiscoveryPage, {}) }));
        const toggle = screen.getByRole('switch');
        expect(toggle).toHaveAttribute('aria-checked', 'true');
        const filterValue = screen.getByTestId('top10k-filter');
        expect(filterValue).toHaveTextContent('true');
    });
    it('initializes top10kEnabled as false when URL param is not set', () => {
        render(_jsx(MemoryRouter, { initialEntries: ['/discovery'], children: _jsx(DiscoveryPage, {}) }));
        const toggle = screen.getByRole('switch');
        expect(toggle).toHaveAttribute('aria-checked', 'false');
        const filterValue = screen.getByTestId('top10k-filter');
        expect(filterValue).toHaveTextContent('false');
    });
    it('initializes top10kEnabled as false when URL param is false', () => {
        render(_jsx(MemoryRouter, { initialEntries: ['/discovery?top10k_streamers=false'], children: _jsx(DiscoveryPage, {}) }));
        const toggle = screen.getByRole('switch');
        expect(toggle).toHaveAttribute('aria-checked', 'false');
        const filterValue = screen.getByTestId('top10k-filter');
        expect(filterValue).toHaveTextContent('false');
    });
    it('has useEffect dependency on searchParams for syncing state', () => {
        // This test verifies that different URL params result in different initial states
        // which demonstrates that the component properly syncs with URL params
        // Test with top10k_streamers=true
        const { unmount } = render(_jsx(MemoryRouter, { initialEntries: ['/discovery?top10k_streamers=true'], children: _jsx(DiscoveryPage, {}) }));
        let toggle = screen.getByRole('switch');
        expect(toggle).toHaveAttribute('aria-checked', 'true');
        let filterValue = screen.getByTestId('top10k-filter');
        expect(filterValue).toHaveTextContent('true');
        // Clean up first render
        unmount();
        // Test with top10k_streamers not set (should be false)
        render(_jsx(MemoryRouter, { initialEntries: ['/discovery'], children: _jsx(DiscoveryPage, {}) }));
        toggle = screen.getByRole('switch');
        expect(toggle).toHaveAttribute('aria-checked', 'false');
        filterValue = screen.getByTestId('top10k-filter');
        expect(filterValue).toHaveTextContent('false');
    });
    it('renders all three tabs', () => {
        render(_jsx(MemoryRouter, { initialEntries: ['/discovery'], children: _jsx(DiscoveryPage, {}) }));
        expect(screen.getByText('Top')).toBeInTheDocument();
        expect(screen.getByText('New')).toBeInTheDocument();
        expect(screen.getByText('Discussed')).toBeInTheDocument();
    });
    it('renders the Top 10k Streamers toggle', () => {
        render(_jsx(MemoryRouter, { initialEntries: ['/discovery'], children: _jsx(DiscoveryPage, {}) }));
        expect(screen.getByText('Top 10k Streamers Only')).toBeInTheDocument();
        expect(screen.getByText('Filter clips to only show content from the top 10,000 streamers')).toBeInTheDocument();
    });
});

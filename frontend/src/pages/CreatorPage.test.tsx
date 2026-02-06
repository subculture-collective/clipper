import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CreatorPage } from './CreatorPage';

// Mock the components
vi.mock('../components', () => ({
    Container: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="container">{children}</div>
    ),
    SEO: () => null,
}));

// Mock ClipFeed component
vi.mock('../components/clip', () => ({
    ClipFeed: ({ filters }: { 
        filters?: { creator_id?: string };
        showSearch?: boolean;
        useSortTitle?: boolean;
    }) => (
        <div data-testid="clip-feed">
            <div data-testid="filters">{JSON.stringify(filters)}</div>
        </div>
    ),
}));

describe('CreatorPage', () => {
    it('renders ClipFeed with creator_id filter when creatorId is provided', () => {
        render(
            <MemoryRouter initialEntries={['/creator/testcreator']}>
                <Routes>
                    <Route path="/creator/:creatorId" element={<CreatorPage />} />
                </Routes>
            </MemoryRouter>
        );

        // Should render ClipFeed
        expect(screen.getByTestId('clip-feed')).toBeInTheDocument();
        
        // Should display the creator ID in the page
        expect(screen.getByText('Creator Clips')).toBeInTheDocument();
        expect(screen.getByText('Viewing clips from: testcreator')).toBeInTheDocument();
        
        // Should pass the creator_id as a filter
        const filtersElement = screen.getByTestId('filters');
        expect(filtersElement.textContent).toContain('"creator_id":"testcreator"');
    });

    it('renders different creator correctly', () => {
        render(
            <MemoryRouter initialEntries={['/creator/anothercreator']}>
                <Routes>
                    <Route path="/creator/:creatorId" element={<CreatorPage />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Creator Clips')).toBeInTheDocument();
        expect(screen.getByText('Viewing clips from: anothercreator')).toBeInTheDocument();
        
        const filtersElement = screen.getByTestId('filters');
        expect(filtersElement.textContent).toContain('"creator_id":"anothercreator"');
    });

    it('handles missing creatorId gracefully', () => {
        render(
            <MemoryRouter initialEntries={['/creator/']}>
                <Routes>
                    <Route path="/creator/:creatorId?" element={<CreatorPage />} />
                </Routes>
            </MemoryRouter>
        );

        // Should show error message when no creator ID is specified
        expect(screen.getByText('Creator Not Found')).toBeInTheDocument();
        expect(screen.getByText('No creator ID specified.')).toBeInTheDocument();
        
        // Should not render ClipFeed
        expect(screen.queryByTestId('clip-feed')).not.toBeInTheDocument();
    });
});

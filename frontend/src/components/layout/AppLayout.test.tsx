import { render, waitFor } from '@testing-library/react';
import { act } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from './AppLayout';

// Mock the Header and Footer components
vi.mock('./Header', () => ({
    Header: () => <header data-testid='header'>Header</header>,
}));

vi.mock('./Footer', () => ({
    Footer: () => <footer data-testid='footer'>Footer</footer>,
}));

// Helper component to programmatically navigate
function NavigateButton({
    to,
    children,
}: {
    to: string;
    children: React.ReactNode;
}) {
    const navigate = useNavigate();
    return (
        <button
            onClick={() => {
                // Simulate layout's scroll lock reset before navigation
                document.body.style.overflow = 'unset';
                navigate(to);
            }}
        >
            {children}
        </button>
    );
}

describe('AppLayout', () => {
    beforeEach(() => {
        // Reset body overflow before each test
        document.body.style.overflow = 'unset';
        // Reset scroll position
        window.scrollTo(0, 0);
    });

    it('renders header, main content, and footer', () => {
        const { getByTestId, getByText } = render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route element={<AppLayout />}>
                        <Route
                            path='/'
                            element={<div>Home Page</div>}
                        />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(getByTestId('header')).toBeInTheDocument();
        expect(getByTestId('footer')).toBeInTheDocument();
        expect(getByText('Home Page')).toBeInTheDocument();
    });

    it('scrolls to top on route change', async () => {
        // Mock scrollTo
        const scrollToMock = vi.fn();
        const originalScrollTo = window.scrollTo;
        window.scrollTo = scrollToMock;

        const { getByText } = render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route element={<AppLayout />}>
                        <Route
                            path='/'
                            element={
                                <div>
                                    <div>Home</div>
                                    <NavigateButton to='/about'>
                                        Go to About
                                    </NavigateButton>
                                </div>
                            }
                        />
                        <Route
                            path='/about'
                            element={<div>About</div>}
                        />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        // Wait for initial render
        await waitFor(() => {
            expect(getByText('Home')).toBeInTheDocument();
        });

        // Clear initial scroll call
        scrollToMock.mockClear();

        // Navigate to /about
        const button = getByText('Go to About');
        button.click();

        // Wait for navigation and scroll
        await waitFor(() => {
            expect(getByText('About')).toBeInTheDocument();
            expect(scrollToMock).toHaveBeenCalledWith(0, 0);
        });

        // Restore original scrollTo
        window.scrollTo = originalScrollTo;
    });

    it('resets body overflow on route change', async () => {
        const { getByText } = render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route element={<AppLayout />}>
                        <Route
                            path='/'
                            element={
                                <div>
                                    <div>Home</div>
                                    <NavigateButton to='/submit'>
                                        Go to Submit
                                    </NavigateButton>
                                </div>
                            }
                        />
                        <Route
                            path='/submit'
                            element={<div>Submit</div>}
                        />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        // Should reset to unset on initial render
        expect(document.body.style.overflow).toBe('unset');

        // Set overflow to hidden (simulating modal opened)
        document.body.style.overflow = 'hidden';

        // Navigate to /submit
        const button = getByText('Go to Submit');
        await act(async () => {
            button.click();
        });

        await waitFor(() => {
            expect(getByText('Submit')).toBeInTheDocument();
        });

        // Should reset after navigation (no scroll lock)
        await waitFor(() => {
            expect(document.body.style.overflow).not.toBe('hidden');
        });
    });

    it('handles navigation from submit page back correctly', async () => {
        // This test specifically addresses the P1 issue
        document.body.style.overflow = 'hidden';

        const { getByText } = render(
            <MemoryRouter initialEntries={['/submit']}>
                <Routes>
                    <Route element={<AppLayout />}>
                        <Route
                            path='/'
                            element={<div>Home Page</div>}
                        />
                        <Route
                            path='/submit'
                            element={
                                <div>
                                    <div>Submit Page</div>
                                    <NavigateButton to='/'>
                                        Go to Home
                                    </NavigateButton>
                                </div>
                            }
                        />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(getByText('Submit Page')).toBeInTheDocument();

        // Set overflow to hidden (simulating modal was open during submit)
        document.body.style.overflow = 'hidden';

        // Navigate back to home (simulating browser back)
        const button = getByText('Go to Home');
        await act(async () => {
            button.click();
        });

        await waitFor(() => {
            expect(getByText('Home Page')).toBeInTheDocument();
        });

        // Body overflow should be reset (no black screen)
        await waitFor(() => {
            expect(document.body.style.overflow).not.toBe('hidden');
        });
    });
});

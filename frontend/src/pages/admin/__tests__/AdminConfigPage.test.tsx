import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminConfigPage from '../AdminConfigPage';

// Mock API
vi.mock('../../../lib/config-api', () => {
    return {
        configApi: {
            getEngagementConfig: vi.fn(async () => ({
                vote_weight: 3.0,
                comment_weight: 2.0,
                favorite_weight: 1.5,
                view_weight: 0.1,
            })),
            updateEngagementConfig: vi.fn(async () => ({
                message:
                    'Configuration updated and engagement scores recalculated',
                config: {
                    vote_weight: 3.1,
                    comment_weight: 2.0,
                    favorite_weight: 1.5,
                    view_weight: 0.1,
                },
            })),
        },
    };
});

function renderWithClient(ui: React.ReactElement) {
    const client = new QueryClient();
    return render(
        <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    );
}

describe('AdminConfigPage', () => {
    it('renders and shows default values', async () => {
        renderWithClient(<AdminConfigPage />);
        expect(
            await screen.findByText('Engagement Scoring Configuration')
        ).toBeInTheDocument();
        const voteInput = await screen.findByLabelText('Vote Weight');
        expect((voteInput as HTMLInputElement).value).toBe('3');
    });

    it('validates non-negative weights', async () => {
        renderWithClient(<AdminConfigPage />);
        const voteInput = await screen.findByLabelText('Vote Weight');
        fireEvent.change(voteInput, { target: { value: '-1' } });
        const saveBtn = await screen.findByText('Save Changes');
        fireEvent.click(saveBtn);
        await waitFor(() => {
            expect(screen.getByText(/non-negative/i)).toBeInTheDocument();
        });
    });

    it('submits and shows success message', async () => {
        renderWithClient(<AdminConfigPage />);
        const voteInput = await screen.findByLabelText('Vote Weight');
        fireEvent.change(voteInput, { target: { value: '3.1' } });
        const saveBtn = await screen.findByText('Save Changes');
        fireEvent.click(saveBtn);
        await waitFor(() => {
            expect(
                screen.getByText(
                    'Configuration updated and engagement scores recalculated'
                )
            ).toBeInTheDocument();
        });
    });

    it('applies a preset and updates fields', async () => {
        renderWithClient(<AdminConfigPage />);

        // Wait for initial load
        await waitFor(() =>
            expect(
                screen.getByText(/Engagement Scoring Configuration/i)
            ).toBeInTheDocument()
        );

        const presetSelect = screen.getByLabelText(
            'Preset'
        ) as HTMLSelectElement;
        // Select the "Votes Focus" preset
        fireEvent.change(presetSelect, { target: { value: 'Votes Focus' } });

        const voteInput = screen.getByLabelText(
            'Vote Weight'
        ) as HTMLInputElement;
        const commentInput = screen.getByLabelText(
            'Comment Weight'
        ) as HTMLInputElement;
        const favoriteInput = screen.getByLabelText(
            'Favorite Weight'
        ) as HTMLInputElement;
        const viewInput = screen.getByLabelText(
            'View Weight'
        ) as HTMLInputElement;

        expect(voteInput.value).toMatch(/4\.?0?/); // preset value
        expect(commentInput.value).toMatch(/1\.5/);
        expect(favoriteInput.value).toMatch(/1\.2/);
        expect(viewInput.value).toMatch(/0\.08/);
    });
});

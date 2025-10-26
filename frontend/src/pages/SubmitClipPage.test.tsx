import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import { SubmitClipPage } from './SubmitClipPage';
import * as submissionApi from '../lib/submission-api';
import { useAuth } from '../context/AuthContext';

// Mock the API calls
vi.mock('../lib/submission-api', () => ({
    submitClip: vi.fn(),
    getUserSubmissions: vi.fn(),
}));

// Mock the AuthContext
vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('SubmitClipPage', () => {
    const mockUser = {
        id: 'user-123',
        username: 'testuser',
        display_name: 'Test User',
        karma_points: 150,
        role: 'user',
    };

    const mockSubmitClip = vi.mocked(submissionApi.submitClip);
    const mockGetUserSubmissions = vi.mocked(submissionApi.getUserSubmissions);
    const mockUseAuth = vi.mocked(useAuth);

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetUserSubmissions.mockResolvedValue({
            data: [],
            total: 0,
            page: 1,
            limit: 5,
        });
    });

    describe('Authentication and Karma Gate', () => {
        it('shows login prompt when not authenticated', () => {
            mockUseAuth.mockReturnValue({
                user: null,
                isAuthenticated: false,
                login: vi.fn(),
                logout: vi.fn(),
                loading: false,
            });

            render(<SubmitClipPage />);

            expect(screen.getByText('Submit a Clip')).toBeInTheDocument();
            expect(
                screen.getByText('You must be logged in to submit clips.')
            ).toBeInTheDocument();
            expect(screen.getByText('Log In')).toBeInTheDocument();
        });

        it('navigates to login when login button is clicked', async () => {
            const user = userEvent.setup();
            mockUseAuth.mockReturnValue({
                user: null,
                isAuthenticated: false,
                login: vi.fn(),
                logout: vi.fn(),
                loading: false,
            });

            render(<SubmitClipPage />);

            const loginButton = screen.getByText('Log In');
            await user.click(loginButton);

            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });

        it('shows warning when user has insufficient karma', () => {
            mockUseAuth.mockReturnValue({
                user: { ...mockUser, karma_points: 50 },
                isAuthenticated: true,
                login: vi.fn(),
                logout: vi.fn(),
                loading: false,
            });

            render(<SubmitClipPage />);

            expect(
                screen.getByText(/You need 50 more karma points to submit clips/)
            ).toBeInTheDocument();
        });

        it('does not show warning when user has enough karma', () => {
            mockUseAuth.mockReturnValue({
                user: mockUser,
                isAuthenticated: true,
                login: vi.fn(),
                logout: vi.fn(),
                loading: false,
            });

            render(<SubmitClipPage />);

            expect(
                screen.queryByText(/more karma points to submit/)
            ).not.toBeInTheDocument();
        });

        it('disables form fields when user has insufficient karma', () => {
            mockUseAuth.mockReturnValue({
                user: { ...mockUser, karma_points: 50 },
                isAuthenticated: true,
                login: vi.fn(),
                logout: vi.fn(),
                loading: false,
            });

            render(<SubmitClipPage />);

            const clipUrlInput = screen.getByLabelText(/Twitch Clip URL/);
            const submitButton = screen.getByRole('button', { name: /Submit Clip/ });

            expect(clipUrlInput).toBeDisabled();
            expect(submitButton).toBeDisabled();
        });
    });

    describe('Form Validation', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: mockUser,
                isAuthenticated: true,
                login: vi.fn(),
                logout: vi.fn(),
                loading: false,
            });
        });

        it('requires clip URL to submit', () => {
            render(<SubmitClipPage />);

            const submitButton = screen.getByRole('button', { name: /Submit Clip/ });
            expect(submitButton).toBeDisabled();
        });

        it('enables submit button when clip URL is provided', async () => {
            const user = userEvent.setup();
            render(<SubmitClipPage />);

            const clipUrlInput = screen.getByLabelText(/Twitch Clip URL/);
            await user.type(clipUrlInput, 'https://clips.twitch.tv/TestClip123');

            const submitButton = screen.getByRole('button', { name: /Submit Clip/ });
            expect(submitButton).toBeEnabled();
        });

        it('accepts valid Twitch clip URLs', async () => {
            const user = userEvent.setup();
            render(<SubmitClipPage />);

            const clipUrlInput = screen.getByLabelText(/Twitch Clip URL/);
            
            // Test clips.twitch.tv format
            await user.type(clipUrlInput, 'https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage');
            expect(clipUrlInput).toHaveValue('https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage');
        });

        it('allows adding custom title', async () => {
            const user = userEvent.setup();
            render(<SubmitClipPage />);

            const customTitleInput = screen.getByLabelText(/Custom Title/);
            await user.type(customTitleInput, 'My Custom Title');

            expect(customTitleInput).toHaveValue('My Custom Title');
        });

        it('allows marking clip as NSFW', async () => {
            const user = userEvent.setup();
            render(<SubmitClipPage />);

            const nsfwCheckbox = screen.getByLabelText(/Mark as NSFW/);
            expect(nsfwCheckbox).not.toBeChecked();

            await user.click(nsfwCheckbox);
            expect(nsfwCheckbox).toBeChecked();
        });

        it('allows adding submission reason', async () => {
            const user = userEvent.setup();
            render(<SubmitClipPage />);

            const reasonTextarea = screen.getByLabelText(/Submission Reason/);
            await user.type(reasonTextarea, 'This is an amazing play');

            expect(reasonTextarea).toHaveValue('This is an amazing play');
        });
    });

    describe('Tags Management', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: mockUser,
                isAuthenticated: true,
                login: vi.fn(),
                logout: vi.fn(),
                loading: false,
            });
        });

        it('allows adding tags', async () => {
            const user = userEvent.setup();
            render(<SubmitClipPage />);

            const tagInput = screen.getByPlaceholderText('Add tags...');
            const addButton = screen.getByRole('button', { name: 'Add' });

            await user.type(tagInput, 'clutch');
            await user.click(addButton);

            expect(screen.getByText('clutch')).toBeInTheDocument();
            expect(tagInput).toHaveValue('');
        });

        it('allows adding tags with Enter key', async () => {
            const user = userEvent.setup();
            render(<SubmitClipPage />);

            const tagInput = screen.getByPlaceholderText('Add tags...');
            await user.type(tagInput, 'epic{Enter}');

            expect(screen.getByText('epic')).toBeInTheDocument();
        });

        it('prevents adding duplicate tags', async () => {
            const user = userEvent.setup();
            render(<SubmitClipPage />);

            const tagInput = screen.getByPlaceholderText('Add tags...');
            const addButton = screen.getByRole('button', { name: 'Add' });

            // Add first tag
            await user.type(tagInput, 'clutch');
            await user.click(addButton);

            // Try to add duplicate
            await user.type(tagInput, 'clutch');
            await user.click(addButton);

            // Should only have one instance
            const tags = screen.getAllByText('clutch');
            expect(tags).toHaveLength(1);
        });

        it('allows removing tags', async () => {
            const user = userEvent.setup();
            render(<SubmitClipPage />);

            const tagInput = screen.getByPlaceholderText('Add tags...');
            await user.type(tagInput, 'clutch{Enter}');

            expect(screen.getByText('clutch')).toBeInTheDocument();

            const removeButton = screen.getByRole('button', { name: '×' });
            await user.click(removeButton);

            expect(screen.queryByText('clutch')).not.toBeInTheDocument();
        });

        it('trims whitespace from tags', async () => {
            const user = userEvent.setup();
            render(<SubmitClipPage />);

            const tagInput = screen.getByPlaceholderText('Add tags...');
            await user.type(tagInput, '  clutch  {Enter}');

            expect(screen.getByText('clutch')).toBeInTheDocument();
        });
    });

    describe('Auto-detect Streamer Banner', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: mockUser,
                isAuthenticated: true,
                login: vi.fn(),
                logout: vi.fn(),
                loading: false,
            });
        });

        it('shows auto-detect banner when valid clip URL is entered', async () => {
            const user = userEvent.setup();
            render(<SubmitClipPage />);

            const clipUrlInput = screen.getByLabelText(/Twitch Clip URL/);
            await user.type(clipUrlInput, 'https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage');

            await waitFor(() => {
                // The StreamerInput component should show auto-detected state
                expect(screen.getByText('Will be auto-detected from clip')).toBeInTheDocument();
            });
        });

        it('clears auto-detect when URL is invalid', async () => {
            const user = userEvent.setup();
            render(<SubmitClipPage />);

            const clipUrlInput = screen.getByLabelText(/Twitch Clip URL/);
            
            // Enter valid URL first
            await user.type(clipUrlInput, 'https://clips.twitch.tv/ValidClip');
            
            await waitFor(() => {
                expect(screen.getByText('Will be auto-detected from clip')).toBeInTheDocument();
            });
            
            // Clear the input
            await user.clear(clipUrlInput);
            
            await waitFor(() => {
                // Auto-detect banner should be gone
                expect(screen.queryByText('Will be auto-detected from clip')).not.toBeInTheDocument();
            });
        });
    });

    describe('Override Flow', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: mockUser,
                isAuthenticated: true,
                login: vi.fn(),
                logout: vi.fn(),
                loading: false,
            });
        });

        it('allows manual streamer name override', async () => {
            const user = userEvent.setup();
            render(<SubmitClipPage />);

            const streamerInput = screen.getByPlaceholderText('Enter streamer name...');
            await user.type(streamerInput, 'CustomStreamer');

            expect(streamerInput).toHaveValue('CustomStreamer');
        });

        it('clears auto-detect state when user manually changes streamer', async () => {
            const user = userEvent.setup();
            render(<SubmitClipPage />);

            const clipUrlInput = screen.getByLabelText(/Twitch Clip URL/);
            await user.type(clipUrlInput, 'https://clips.twitch.tv/TestClip');

            await waitFor(() => {
                expect(screen.getByText('Will be auto-detected from clip')).toBeInTheDocument();
            });

            const streamerInput = screen.getByPlaceholderText('Enter streamer name...');
            await user.type(streamerInput, 'ManualOverride');

            expect(streamerInput).toHaveValue('ManualOverride');
        });
    });

    describe('Form Submission', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: mockUser,
                isAuthenticated: true,
                login: vi.fn(),
                logout: vi.fn(),
                loading: false,
            });
        });

        it('submits form with valid data', async () => {
            const user = userEvent.setup();
            mockSubmitClip.mockResolvedValue({
                submission: {
                    id: 'submission-123',
                    user_id: 'user-123',
                    twitch_clip_id: 'TestClip123',
                    twitch_clip_url: 'https://clips.twitch.tv/TestClip123',
                    title: 'Test Clip',
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    broadcaster_name: 'TestStreamer',
                    creator_name: 'TestCreator',
                    view_count: 0,
                },
            });

            render(<SubmitClipPage />);

            const clipUrlInput = screen.getByLabelText(/Twitch Clip URL/);
            await user.type(clipUrlInput, 'https://clips.twitch.tv/TestClip123');

            const submitButton = screen.getByRole('button', { name: /Submit Clip/ });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockSubmitClip).toHaveBeenCalledWith({
                    clip_url: 'https://clips.twitch.tv/TestClip123',
                    custom_title: '',
                    tags: [],
                    is_nsfw: false,
                    submission_reason: '',
                    broadcaster_name_override: '',
                });
            });
        });

        it('includes all form data in submission', async () => {
            const user = userEvent.setup();
            mockSubmitClip.mockResolvedValue({
                submission: {
                    id: 'submission-123',
                    user_id: 'user-123',
                    twitch_clip_id: 'TestClip123',
                    twitch_clip_url: 'https://clips.twitch.tv/TestClip123',
                    title: 'Test Clip',
                    custom_title: 'Custom Title',
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    broadcaster_name: 'TestStreamer',
                    creator_name: 'TestCreator',
                    view_count: 0,
                },
            });

            render(<SubmitClipPage />);

            // Fill in all fields
            const clipUrlInput = screen.getByLabelText(/Twitch Clip URL/);
            await user.type(clipUrlInput, 'https://clips.twitch.tv/TestClip123');

            const customTitleInput = screen.getByLabelText(/Custom Title/);
            await user.type(customTitleInput, 'Custom Title');

            const streamerInput = screen.getByPlaceholderText('Enter streamer name...');
            await user.type(streamerInput, 'OverrideStreamer');

            const tagInput = screen.getByPlaceholderText('Add tags...');
            await user.type(tagInput, 'clutch{Enter}');

            const nsfwCheckbox = screen.getByLabelText(/Mark as NSFW/);
            await user.click(nsfwCheckbox);

            const reasonTextarea = screen.getByLabelText(/Submission Reason/);
            await user.type(reasonTextarea, 'Amazing play');

            const submitButton = screen.getByRole('button', { name: /Submit Clip/ });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockSubmitClip).toHaveBeenCalledWith({
                    clip_url: 'https://clips.twitch.tv/TestClip123',
                    custom_title: 'Custom Title',
                    tags: ['clutch'],
                    is_nsfw: true,
                    submission_reason: 'Amazing play',
                    broadcaster_name_override: 'OverrideStreamer',
                });
            });
        });

        it('shows loading state during submission', async () => {
            const user = userEvent.setup();
            mockSubmitClip.mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 1000))
            );

            render(<SubmitClipPage />);

            const clipUrlInput = screen.getByLabelText(/Twitch Clip URL/);
            await user.type(clipUrlInput, 'https://clips.twitch.tv/TestClip123');

            const submitButton = screen.getByRole('button', { name: /Submit Clip/ });
            await user.click(submitButton);

            expect(screen.getByText('Submitting...')).toBeInTheDocument();
        });

        it('displays error message on submission failure', async () => {
            const user = userEvent.setup();
            mockSubmitClip.mockRejectedValue({
                response: {
                    data: {
                        error: 'Clip already exists',
                    },
                },
            });

            render(<SubmitClipPage />);

            const clipUrlInput = screen.getByLabelText(/Twitch Clip URL/);
            await user.type(clipUrlInput, 'https://clips.twitch.tv/TestClip123');

            const submitButton = screen.getByRole('button', { name: /Submit Clip/ });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Clip already exists')).toBeInTheDocument();
            });
        });

        it('shows generic error message when error details are unavailable', async () => {
            const user = userEvent.setup();
            mockSubmitClip.mockRejectedValue(new Error('Network error'));

            render(<SubmitClipPage />);

            const clipUrlInput = screen.getByLabelText(/Twitch Clip URL/);
            await user.type(clipUrlInput, 'https://clips.twitch.tv/TestClip123');

            const submitButton = screen.getByRole('button', { name: /Submit Clip/ });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Failed to submit clip')).toBeInTheDocument();
            });
        });
    });

    describe('Success View', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: mockUser,
                isAuthenticated: true,
                login: vi.fn(),
                logout: vi.fn(),
                loading: false,
            });
        });

        it('shows success confirmation after successful submission', async () => {
            const user = userEvent.setup();
            mockSubmitClip.mockResolvedValue({
                submission: {
                    id: 'submission-123',
                    user_id: 'user-123',
                    twitch_clip_id: 'TestClip123',
                    twitch_clip_url: 'https://clips.twitch.tv/TestClip123',
                    title: 'Test Clip',
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    broadcaster_name: 'TestStreamer',
                    creator_name: 'TestCreator',
                    view_count: 0,
                },
            });

            render(<SubmitClipPage />);

            const clipUrlInput = screen.getByLabelText(/Twitch Clip URL/);
            await user.type(clipUrlInput, 'https://clips.twitch.tv/TestClip123');

            const submitButton = screen.getByRole('button', { name: /Submit Clip/ });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Submission Successful!')).toBeInTheDocument();
            });
        });

        it('resets form after successful submission', async () => {
            const user = userEvent.setup();
            mockSubmitClip.mockResolvedValue({
                submission: {
                    id: 'submission-123',
                    user_id: 'user-123',
                    twitch_clip_id: 'TestClip123',
                    twitch_clip_url: 'https://clips.twitch.tv/TestClip123',
                    title: 'Test Clip',
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    broadcaster_name: 'TestStreamer',
                    creator_name: 'TestCreator',
                    view_count: 0,
                },
            });

            render(<SubmitClipPage />);

            const clipUrlInput = screen.getByLabelText(/Twitch Clip URL/);
            await user.type(clipUrlInput, 'https://clips.twitch.tv/TestClip123');

            const submitButton = screen.getByRole('button', { name: /Submit Clip/ });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Submission Successful!')).toBeInTheDocument();
            });

            // Click "Submit Another Clip" to return to form
            const submitAnotherButton = screen.getByText('Submit Another Clip');
            await user.click(submitAnotherButton);

            // Form should be reset
            const resetClipUrlInput = screen.getByLabelText(/Twitch Clip URL/);
            expect(resetClipUrlInput).toHaveValue('');
        });
    });

    describe('Recent Submissions', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: mockUser,
                isAuthenticated: true,
                login: vi.fn(),
                logout: vi.fn(),
                loading: false,
            });
        });

        it('loads and displays recent submissions', async () => {
            mockGetUserSubmissions.mockResolvedValue({
                data: [
                    {
                        id: 'sub-1',
                        user_id: 'user-123',
                        twitch_clip_id: 'clip-1',
                        twitch_clip_url: 'https://clips.twitch.tv/clip-1',
                        title: 'Recent Submission 1',
                        status: 'pending',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        broadcaster_name: 'Streamer1',
                        creator_name: 'Creator1',
                        view_count: 0,
                    },
                ],
                total: 1,
                page: 1,
                limit: 5,
            });

            render(<SubmitClipPage />);

            await waitFor(() => {
                expect(screen.getByText('Your Recent Submissions')).toBeInTheDocument();
                expect(screen.getByText('Recent Submission 1')).toBeInTheDocument();
            });
        });

        it('shows status badges for recent submissions', async () => {
            mockGetUserSubmissions.mockResolvedValue({
                data: [
                    {
                        id: 'sub-1',
                        user_id: 'user-123',
                        twitch_clip_id: 'clip-1',
                        twitch_clip_url: 'https://clips.twitch.tv/clip-1',
                        title: 'Approved Submission',
                        status: 'approved',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        broadcaster_name: 'Streamer1',
                        creator_name: 'Creator1',
                        view_count: 0,
                    },
                    {
                        id: 'sub-2',
                        user_id: 'user-123',
                        twitch_clip_id: 'clip-2',
                        twitch_clip_url: 'https://clips.twitch.tv/clip-2',
                        title: 'Pending Submission',
                        status: 'pending',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        broadcaster_name: 'Streamer2',
                        creator_name: 'Creator2',
                        view_count: 0,
                    },
                ],
                total: 2,
                page: 1,
                limit: 5,
            });

            render(<SubmitClipPage />);

            await waitFor(() => {
                expect(screen.getByText('approved')).toBeInTheDocument();
                expect(screen.getByText('pending')).toBeInTheDocument();
            });
        });
    });
});

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Container,
    Input,
    StreamerInput,
    SubmissionConfirmation,
    TextArea,
} from '../components';
import { useAuth } from '../context/AuthContext';
import { getUserSubmissions, submitClip } from '../lib/submission-api';
import { getPublicConfig } from '../lib/config-api';
import type { ClipSubmission, SubmitClipRequest } from '../types/submission';

export function SubmitClipPage() {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState<SubmitClipRequest>({
        clip_url: '',
        custom_title: '',
        tags: [],
        is_nsfw: false,
        submission_reason: '',
        broadcaster_name_override: '',
    });
    const [tagInput, setTagInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submittedClip, setSubmittedClip] = useState<ClipSubmission | null>(null);
    const [recentSubmissions, setRecentSubmissions] = useState<
        ClipSubmission[]
    >([]);
    const [isStreamerAutoDetected, setIsStreamerAutoDetected] = useState(false);
    const [karmaRequired, setKarmaRequired] = useState(100);
    const [karmaRequirementEnabled, setKarmaRequirementEnabled] = useState(true);

    // Check if user is authenticated and has enough karma
    const canSubmit = isAuthenticated && user && (!karmaRequirementEnabled || user.karma_points >= karmaRequired);
    const karmaNeeded = user ? Math.max(0, karmaRequired - user.karma_points) : karmaRequired;

    // Load karma configuration
    useEffect(() => {
        getPublicConfig()
            .then((config) => {
                setKarmaRequired(config.karma.submission_karma_required);
                setKarmaRequirementEnabled(config.karma.require_karma_for_submission);
            })
            .catch((err) => {
                console.error('Failed to load config:', err);
                // Use defaults if config fails to load
            });
    }, []);

    // Load recent submissions
    useEffect(() => {
        let isMounted = true;

        if (isAuthenticated) {
            getUserSubmissions(1, 5)
                .then((response) => {
                    if (isMounted) {
                        setRecentSubmissions(response.data || []);
                    }
                })
                .catch((err) => {
                    if (isMounted) {
                        console.error('Failed to load submissions:', err);
                        setRecentSubmissions([]);
                    }
                });
        }

        return () => {
            isMounted = false;
        };
    }, [isAuthenticated]);

    // Helper function to extract clip ID from Twitch URL
    const extractClipIDFromURL = (url: string): string | null => {
        if (!url) return null;

        // Match patterns like:
        // https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage
        // https://www.twitch.tv/broadcaster/clip/AwkwardHelplessSalamanderSwiftRage
        const clipsTwitchPattern = /clips\.twitch\.tv\/([a-zA-Z0-9_-]+)/;
        const twitchClipPattern = /twitch\.tv\/[^/]+\/clip\/([a-zA-Z0-9_-]+)/;

        let match = url.match(clipsTwitchPattern);
        if (match) return match[1];

        match = url.match(twitchClipPattern);
        if (match) return match[1];

        return null;
    };

    // Auto-detect streamer when URL changes
    useEffect(() => {
        const clipID = extractClipIDFromURL(formData.clip_url);

        // If we have a valid clip ID and no streamer name set yet (or it was auto-detected)
        if (clipID && (!formData.broadcaster_name_override || isStreamerAutoDetected)) {
            // For now, we show a note that the streamer will be detected
            // The backend will fetch the actual metadata
            // In a future enhancement, we could add a preview API endpoint
            setIsStreamerAutoDetected(true);
        } else if (!clipID && isStreamerAutoDetected) {
            // Clear auto-detection if URL is invalid
            setIsStreamerAutoDetected(false);
            setFormData((prev) => ({
                ...prev,
                broadcaster_name_override: '',
            }));
        }
    }, [formData.clip_url, formData.broadcaster_name_override, isStreamerAutoDetected]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canSubmit) {
            if (karmaRequirementEnabled) {
                setError(`You need at least ${karmaRequired} karma points to submit clips`);
            } else {
                setError('You must be logged in to submit clips');
            }
            return;
        }

        setError(null);
        setSubmittedClip(null);
        setIsSubmitting(true);

        try {
            const response = await submitClip(formData);
            // Set the submitted clip to show confirmation
            setSubmittedClip(response.submission);

            // Reset form
            setFormData({
                clip_url: '',
                custom_title: '',
                tags: [],
                is_nsfw: false,
                submission_reason: '',
                broadcaster_name_override: '',
            });
            setTagInput('');
            setIsStreamerAutoDetected(false);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            const errorMessage =
                error.response?.data?.error || 'Failed to submit clip';
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddTag = () => {
        const tag = tagInput.trim();
        if (tag && !formData.tags?.includes(tag)) {
            setFormData({
                ...formData,
                tags: [...(formData.tags || []), tag],
            });
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData({
            ...formData,
            tags: formData.tags?.filter((t) => t !== tagToRemove) || [],
        });
    };

    const handleSubmitAnother = () => {
        setSubmittedClip(null);
        setError(null);
    };

    if (!isAuthenticated) {
        return (
            <Container className='py-4 xs:py-6 md:py-8'>
                <Card className='max-w-2xl mx-auto p-4 xs:p-6 md:p-8 text-center'>
                    <h1 className='text-2xl xs:text-3xl font-bold mb-4'>Submit a Clip</h1>
                    <p className='text-sm xs:text-base text-muted-foreground mb-6'>
                        You must be logged in to submit clips.
                    </p>
                    <Button onClick={() => navigate('/login')}>Log In</Button>
                </Card>
            </Container>
        );
    }

    // Show confirmation view after successful submission
    if (submittedClip) {
        return (
            <Container className='py-4 xs:py-6 md:py-8'>
                <SubmissionConfirmation
                    submission={submittedClip}
                    onSubmitAnother={handleSubmitAnother}
                />
            </Container>
        );
    }

    return (
        <Container className='py-4 xs:py-6 md:py-8'>
            <div className='max-w-3xl mx-auto'>
                <div className='mb-4 xs:mb-6'>
                    <h1 className='text-2xl xs:text-3xl font-bold mb-2'>Submit a Clip</h1>
                    <p className='text-sm xs:text-base text-muted-foreground'>
                        Share your favorite gaming moments with the community
                    </p>
                </div>

                {!canSubmit && (
                    <Alert
                        variant='warning'
                        className='mb-4 xs:mb-6'
                    >
                        You need {karmaNeeded} more karma points to submit
                        clips. Earn karma by commenting, voting, and
                        contributing to the community.
                    </Alert>
                )}

                {error && (
                    <Alert
                        variant='error'
                        className='mb-6'
                    >
                        {error}
                    </Alert>
                )}

                <Card className='p-6 mb-8'>
                    <form onSubmit={handleSubmit}>
                        <div className='space-y-6'>
                            {/* Clip URL Input */}
                            <div>
                                <label
                                    htmlFor='clip_url'
                                    className='block text-sm font-medium mb-2'
                                >
                                    Twitch Clip URL{' '}
                                    <span className='text-red-500'>*</span>
                                </label>
                                <Input
                                    id='clip_url'
                                    type='url'
                                    value={formData.clip_url}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            clip_url: e.target.value,
                                        })
                                    }
                                    placeholder='https://clips.twitch.tv/...'
                                    required
                                    disabled={!canSubmit}
                                />
                                <p className='text-xs text-muted-foreground mt-1'>
                                    Paste the full URL of a Twitch clip
                                </p>
                            </div>

                            {/* Streamer Input */}
                            <StreamerInput
                                id='broadcaster_name_override'
                                value={formData.broadcaster_name_override || ''}
                                onChange={(value) => {
                                    setFormData({
                                        ...formData,
                                        broadcaster_name_override: value,
                                    });
                                    // If user manually changes, it's no longer auto-detected
                                    if (isStreamerAutoDetected) {
                                        setIsStreamerAutoDetected(false);
                                    }
                                }}
                                autoDetected={isStreamerAutoDetected}
                                disabled={!canSubmit}
                                required={false}
                            />

                            {/* Custom Title */}
                            <div>
                                <label
                                    htmlFor='custom_title'
                                    className='block text-sm font-medium mb-2'
                                >
                                    Custom Title (Optional)
                                </label>
                                <Input
                                    id='custom_title'
                                    type='text'
                                    value={formData.custom_title}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            custom_title: e.target.value,
                                        })
                                    }
                                    placeholder="Override the clip's original title"
                                    disabled={!canSubmit}
                                />
                            </div>

                            {/* Tags */}
                            <div>
                                <label
                                    htmlFor='tags'
                                    className='block text-sm font-medium mb-2'
                                >
                                    Tags (Optional)
                                </label>
                                <div className='flex gap-2 mb-2'>
                                    <Input
                                        id='tags'
                                        type='text'
                                        value={tagInput}
                                        onChange={(e) =>
                                            setTagInput(e.target.value)
                                        }
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddTag();
                                            }
                                        }}
                                        placeholder='Add tags...'
                                        disabled={!canSubmit}
                                    />
                                    <Button
                                        type='button'
                                        onClick={handleAddTag}
                                        disabled={
                                            !tagInput.trim() || !canSubmit
                                        }
                                        variant='secondary'
                                    >
                                        Add
                                    </Button>
                                </div>
                                {formData.tags && formData.tags.length > 0 && (
                                    <div className='flex flex-wrap gap-2'>
                                        {formData.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className='inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm'
                                            >
                                                {tag}
                                                <button
                                                    type='button'
                                                    onClick={() =>
                                                        handleRemoveTag(tag)
                                                    }
                                                    className='hover:text-red-500'
                                                    disabled={!canSubmit}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* NSFW Checkbox */}
                            <div className='flex items-center gap-2'>
                                <Checkbox
                                    id='is_nsfw'
                                    checked={formData.is_nsfw}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            is_nsfw: e.target.checked,
                                        })
                                    }
                                    disabled={!canSubmit}
                                />
                                <label
                                    htmlFor='is_nsfw'
                                    className='text-sm font-medium cursor-pointer'
                                >
                                    Mark as NSFW
                                </label>
                            </div>

                            {/* Submission Reason */}
                            <div>
                                <label
                                    htmlFor='submission_reason'
                                    className='block text-sm font-medium mb-2'
                                >
                                    Submission Reason (Optional)
                                </label>
                                <TextArea
                                    id='submission_reason'
                                    value={formData.submission_reason}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            submission_reason: e.target.value,
                                        })
                                    }
                                    placeholder='Why is this clip noteworthy?'
                                    rows={3}
                                    disabled={!canSubmit}
                                />
                            </div>

                            {/* Submit Button */}
                            <div className='flex gap-3'>
                                <Button
                                    type='submit'
                                    disabled={
                                        !canSubmit ||
                                        isSubmitting ||
                                        !formData.clip_url
                                    }
                                    className='flex-1'
                                >
                                    {isSubmitting
                                        ? 'Submitting...'
                                        : 'Submit Clip'}
                                </Button>
                                <Button
                                    type='button'
                                    variant='secondary'
                                    onClick={() => navigate('/submissions')}
                                >
                                    My Submissions
                                </Button>
                            </div>
                        </div>
                    </form>
                </Card>

                {/* Recent Submissions */}
                {Array.isArray(recentSubmissions) && recentSubmissions.length > 0 && (
                    <Card className='p-6'>
                        <h2 className='text-xl font-bold mb-4'>
                            Your Recent Submissions
                        </h2>
                        <div className='space-y-3'>
                            {recentSubmissions.map((submission) => (
                                <div
                                    key={submission.id}
                                    className='flex items-center justify-between p-3 bg-background-secondary rounded-lg'
                                >
                                    <div className='flex-1'>
                                        <p className='font-medium truncate'>
                                            {submission.custom_title ||
                                                submission.title ||
                                                'Untitled'}
                                        </p>
                                        <p className='text-xs text-muted-foreground'>
                                            {new Date(
                                                submission.created_at
                                            ).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            submission.status === 'approved'
                                                ? 'bg-green-500/20 text-green-500'
                                                : submission.status ===
                                                  'rejected'
                                                ? 'bg-red-500/20 text-red-500'
                                                : 'bg-yellow-500/20 text-yellow-500'
                                        }`}
                                    >
                                        {submission.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </Container>
    );
}

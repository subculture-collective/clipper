import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Checkbox, Container, Input, StreamerInput, SubmissionConfirmation, TextArea, } from '../components';
import { useAuth } from '../context/AuthContext';
import { getUserSubmissions, submitClip } from '../lib/submission-api';
export function SubmitClipPage() {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        clip_url: '',
        custom_title: '',
        tags: [],
        is_nsfw: false,
        submission_reason: '',
        broadcaster_name_override: '',
    });
    const [tagInput, setTagInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [submittedClip, setSubmittedClip] = useState(null);
    const [recentSubmissions, setRecentSubmissions] = useState([]);
    const [isStreamerAutoDetected, setIsStreamerAutoDetected] = useState(false);
    // Check if user is authenticated and has enough karma
    const canSubmit = isAuthenticated && user && user.karma_points >= 100;
    const karmaNeeded = user ? Math.max(0, 100 - user.karma_points) : 100;
    // Load recent submissions
    useEffect(() => {
        if (isAuthenticated) {
            getUserSubmissions(1, 5)
                .then((response) => setRecentSubmissions(response.data))
                .catch((err) => console.error('Failed to load submissions:', err));
        }
    }, [isAuthenticated]);
    // Helper function to extract clip ID from Twitch URL
    const extractClipIDFromURL = (url) => {
        if (!url)
            return null;
        // Match patterns like:
        // https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage
        // https://www.twitch.tv/broadcaster/clip/AwkwardHelplessSalamanderSwiftRage
        const clipsTwitchPattern = /clips\.twitch\.tv\/([a-zA-Z0-9_-]+)/;
        const twitchClipPattern = /twitch\.tv\/[^/]+\/clip\/([a-zA-Z0-9_-]+)/;
        let match = url.match(clipsTwitchPattern);
        if (match)
            return match[1];
        match = url.match(twitchClipPattern);
        if (match)
            return match[1];
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
        }
        else if (!clipID && isStreamerAutoDetected) {
            // Clear auto-detection if URL is invalid
            setIsStreamerAutoDetected(false);
            setFormData((prev) => ({
                ...prev,
                broadcaster_name_override: '',
            }));
        }
    }, [formData.clip_url, formData.broadcaster_name_override, isStreamerAutoDetected]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) {
            setError('You need at least 100 karma points to submit clips');
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
        }
        catch (err) {
            const error = err;
            const errorMessage = error.response?.data?.error || 'Failed to submit clip';
            setError(errorMessage);
        }
        finally {
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
    const handleRemoveTag = (tagToRemove) => {
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
        return (_jsx(Container, { className: 'py-8', children: _jsxs(Card, { className: 'max-w-2xl mx-auto p-8 text-center', children: [_jsx("h1", { className: 'text-3xl font-bold mb-4', children: "Submit a Clip" }), _jsx("p", { className: 'text-muted-foreground mb-6', children: "You must be logged in to submit clips." }), _jsx(Button, { onClick: () => navigate('/login'), children: "Log In" })] }) }));
    }
    // Show confirmation view after successful submission
    if (submittedClip) {
        return (_jsx(Container, { className: 'py-8', children: _jsx(SubmissionConfirmation, { submission: submittedClip, onSubmitAnother: handleSubmitAnother }) }));
    }
    return (_jsx(Container, { className: 'py-8', children: _jsxs("div", { className: 'max-w-3xl mx-auto', children: [_jsxs("div", { className: 'mb-6', children: [_jsx("h1", { className: 'text-3xl font-bold mb-2', children: "Submit a Clip" }), _jsx("p", { className: 'text-muted-foreground', children: "Share your favorite gaming moments with the community" })] }), !canSubmit && (_jsxs(Alert, { variant: 'warning', className: 'mb-6', children: ["You need ", karmaNeeded, " more karma points to submit clips. Earn karma by commenting, voting, and contributing to the community."] })), error && (_jsx(Alert, { variant: 'error', className: 'mb-6', children: error })), _jsx(Card, { className: 'p-6 mb-8', children: _jsx("form", { onSubmit: handleSubmit, children: _jsxs("div", { className: 'space-y-6', children: [_jsxs("div", { children: [_jsxs("label", { htmlFor: 'clip_url', className: 'block text-sm font-medium mb-2', children: ["Twitch Clip URL", ' ', _jsx("span", { className: 'text-red-500', children: "*" })] }), _jsx(Input, { id: 'clip_url', type: 'url', value: formData.clip_url, onChange: (e) => setFormData({
                                                ...formData,
                                                clip_url: e.target.value,
                                            }), placeholder: 'https://clips.twitch.tv/...', required: true, disabled: !canSubmit }), _jsx("p", { className: 'text-xs text-muted-foreground mt-1', children: "Paste the full URL of a Twitch clip" })] }), _jsx(StreamerInput, { id: 'broadcaster_name_override', value: formData.broadcaster_name_override || '', onChange: (value) => {
                                        setFormData({
                                            ...formData,
                                            broadcaster_name_override: value,
                                        });
                                        // If user manually changes, it's no longer auto-detected
                                        if (isStreamerAutoDetected) {
                                            setIsStreamerAutoDetected(false);
                                        }
                                    }, autoDetected: isStreamerAutoDetected, disabled: !canSubmit, required: false }), _jsxs("div", { children: [_jsx("label", { htmlFor: 'custom_title', className: 'block text-sm font-medium mb-2', children: "Custom Title (Optional)" }), _jsx(Input, { id: 'custom_title', type: 'text', value: formData.custom_title, onChange: (e) => setFormData({
                                                ...formData,
                                                custom_title: e.target.value,
                                            }), placeholder: "Override the clip's original title", disabled: !canSubmit })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: 'tags', className: 'block text-sm font-medium mb-2', children: "Tags (Optional)" }), _jsxs("div", { className: 'flex gap-2 mb-2', children: [_jsx(Input, { id: 'tags', type: 'text', value: tagInput, onChange: (e) => setTagInput(e.target.value), onKeyPress: (e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddTag();
                                                        }
                                                    }, placeholder: 'Add tags...', disabled: !canSubmit }), _jsx(Button, { type: 'button', onClick: handleAddTag, disabled: !tagInput.trim() || !canSubmit, variant: 'secondary', children: "Add" })] }), formData.tags && formData.tags.length > 0 && (_jsx("div", { className: 'flex flex-wrap gap-2', children: formData.tags.map((tag) => (_jsxs("span", { className: 'inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm', children: [tag, _jsx("button", { type: 'button', onClick: () => handleRemoveTag(tag), className: 'hover:text-red-500', disabled: !canSubmit, children: "\u00D7" })] }, tag))) }))] }), _jsxs("div", { className: 'flex items-center gap-2', children: [_jsx(Checkbox, { id: 'is_nsfw', checked: formData.is_nsfw, onChange: (e) => setFormData({
                                                ...formData,
                                                is_nsfw: e.target.checked,
                                            }), disabled: !canSubmit }), _jsx("label", { htmlFor: 'is_nsfw', className: 'text-sm font-medium cursor-pointer', children: "Mark as NSFW" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: 'submission_reason', className: 'block text-sm font-medium mb-2', children: "Submission Reason (Optional)" }), _jsx(TextArea, { id: 'submission_reason', value: formData.submission_reason, onChange: (e) => setFormData({
                                                ...formData,
                                                submission_reason: e.target.value,
                                            }), placeholder: 'Why is this clip noteworthy?', rows: 3, disabled: !canSubmit })] }), _jsxs("div", { className: 'flex gap-3', children: [_jsx(Button, { type: 'submit', disabled: !canSubmit ||
                                                isSubmitting ||
                                                !formData.clip_url, className: 'flex-1', children: isSubmitting
                                                ? 'Submitting...'
                                                : 'Submit Clip' }), _jsx(Button, { type: 'button', variant: 'secondary', onClick: () => navigate('/submissions'), children: "My Submissions" })] })] }) }) }), recentSubmissions.length > 0 && (_jsxs(Card, { className: 'p-6', children: [_jsx("h2", { className: 'text-xl font-bold mb-4', children: "Your Recent Submissions" }), _jsx("div", { className: 'space-y-3', children: recentSubmissions.map((submission) => (_jsxs("div", { className: 'flex items-center justify-between p-3 bg-background-secondary rounded-lg', children: [_jsxs("div", { className: 'flex-1', children: [_jsx("p", { className: 'font-medium truncate', children: submission.custom_title ||
                                                    submission.title ||
                                                    'Untitled' }), _jsx("p", { className: 'text-xs text-muted-foreground', children: new Date(submission.created_at).toLocaleDateString() })] }), _jsx("span", { className: `px-3 py-1 rounded-full text-xs font-medium ${submission.status === 'approved'
                                            ? 'bg-green-500/20 text-green-500'
                                            : submission.status ===
                                                'rejected'
                                                ? 'bg-red-500/20 text-red-500'
                                                : 'bg-yellow-500/20 text-yellow-500'}`, children: submission.status })] }, submission.id))) })] }))] }) }));
}

import { useState } from 'react';
import { Button, Modal, ModalFooter, Alert, Input, TextArea } from '../ui';
import { banUserOnTwitch, unbanUserOnTwitch, type TwitchModerationError } from '../../lib/moderation-api';
import { getErrorMessage } from '../../lib/error-utils';
import { useAuth } from '../../context/AuthContext';
import { Ban, ShieldCheck } from 'lucide-react';

export interface TwitchModerationActionsProps {
    /**
     * Twitch broadcaster ID (channel ID)
     */
    broadcasterID: string;
    /**
     * Twitch user ID to ban/unban
     */
    userID: string;
    /**
     * Username for display purposes
     */
    username?: string;
    /**
     * Whether the user is currently banned
     */
    isBanned?: boolean;
    /**
     * Whether the current user is the broadcaster
     */
    isBroadcaster?: boolean;
    /**
     * Whether the current user is a Twitch-recognized moderator
     */
    isTwitchModerator?: boolean;
    /**
     * Callback when action completes successfully
     */
    onSuccess?: () => void;
}

/**
 * TwitchModerationActions component for banning/unbanning users on Twitch
 * 
 * Features:
 * - Permission gating: only visible to broadcaster or Twitch-recognized moderators
 * - Site moderators are view-only and cannot perform Twitch actions
 * - Optimistic loading states
 * - Structured error handling for scope, rate-limit, and unknown errors
 * - Confirmation modals
 * - Supports both permanent bans and timeouts
 */
export function TwitchModerationActions({
    broadcasterID,
    userID,
    username,
    isBanned = false,
    isBroadcaster = false,
    isTwitchModerator = false,
    onSuccess,
}: TwitchModerationActionsProps) {
    const { user, isModerator: isSiteModerator } = useAuth();
    const [showBanModal, setShowBanModal] = useState(false);
    const [showUnbanModal, setShowUnbanModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Ban form state
    const [reason, setReason] = useState('');
    const [isPermanent, setIsPermanent] = useState(true);
    const [duration, setDuration] = useState('600'); // Default 10 minutes in seconds

    // Permission check: only broadcaster or Twitch moderators can perform actions
    // Site moderators are explicitly view-only
    const canPerformTwitchActions = (isBroadcaster || isTwitchModerator) && !isSiteModerator;

    // Don't render if user doesn't have permissions
    if (!canPerformTwitchActions) {
        return null;
    }

    const handleBan = async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);

            await banUserOnTwitch({
                broadcasterID,
                userID,
                reason: reason.trim() || undefined,
                duration: isPermanent ? undefined : parseInt(duration, 10),
            });

            setShowBanModal(false);
            setReason('');
            setIsPermanent(true);
            setDuration('600');
            
            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            const apiError = err as { response?: { data?: TwitchModerationError } };
            const errorData = apiError.response?.data;
            
            // Handle structured errors from backend
            if (errorData?.code) {
                switch (errorData.code) {
                    case 'SITE_MODERATORS_READ_ONLY':
                        setError('Site moderators cannot perform Twitch actions. You must be the channel broadcaster or a Twitch-recognized moderator.');
                        break;
                    case 'NOT_AUTHENTICATED':
                        setError('You are not authenticated with Twitch. Please reconnect your Twitch account.');
                        break;
                    case 'INSUFFICIENT_SCOPES':
                        setError('You do not have the required Twitch permissions. Please reconnect your Twitch account with moderator permissions.');
                        break;
                    case 'NOT_BROADCASTER':
                        setError('Only the broadcaster can perform this action.');
                        break;
                    case 'RATE_LIMIT_EXCEEDED':
                        setError('Rate limit exceeded. Please wait a moment and try again.');
                        break;
                    default:
                        setError(errorData.detail || errorData.error || 'Failed to ban user on Twitch');
                }
            } else {
                setError(getErrorMessage(err, 'Failed to ban user on Twitch'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUnban = async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);

            await unbanUserOnTwitch({
                broadcasterID,
                userID,
            });

            setShowUnbanModal(false);
            
            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            const apiError = err as { response?: { data?: TwitchModerationError } };
            const errorData = apiError.response?.data;
            
            // Handle structured errors from backend
            if (errorData?.code) {
                switch (errorData.code) {
                    case 'SITE_MODERATORS_READ_ONLY':
                        setError('Site moderators cannot perform Twitch actions. You must be the channel broadcaster or a Twitch-recognized moderator.');
                        break;
                    case 'NOT_AUTHENTICATED':
                        setError('You are not authenticated with Twitch. Please reconnect your Twitch account.');
                        break;
                    case 'INSUFFICIENT_SCOPES':
                        setError('You do not have the required Twitch permissions. Please reconnect your Twitch account with moderator permissions.');
                        break;
                    case 'NOT_BROADCASTER':
                        setError('Only the broadcaster can perform this action.');
                        break;
                    case 'RATE_LIMIT_EXCEEDED':
                        setError('Rate limit exceeded. Please wait a moment and try again.');
                        break;
                    default:
                        setError(errorData.detail || errorData.error || 'Failed to unban user on Twitch');
                }
            } else {
                setError(getErrorMessage(err, 'Failed to unban user on Twitch'));
            }
        } finally {
            setLoading(false);
        }
    };

    const resetBanForm = () => {
        setReason('');
        setIsPermanent(true);
        setDuration('600');
        setError(null);
    };

    return (
        <>
            {!isBanned ? (
                <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Ban className="h-4 w-4" />}
                    onClick={() => {
                        resetBanForm();
                        setShowBanModal(true);
                    }}
                    aria-label={`Ban ${username || 'user'} on Twitch`}
                >
                    Ban on Twitch
                </Button>
            ) : (
                <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<ShieldCheck className="h-4 w-4" />}
                    onClick={() => {
                        setError(null);
                        setShowUnbanModal(true);
                    }}
                    aria-label={`Unban ${username || 'user'} on Twitch`}
                >
                    Unban on Twitch
                </Button>
            )}

            {/* Ban Modal */}
            <Modal
                open={showBanModal}
                onClose={() => {
                    if (!loading) {
                        setShowBanModal(false);
                        resetBanForm();
                    }
                }}
                title="Ban User on Twitch"
            >
                <div className="space-y-4">
                    {error && (
                        <Alert variant="error" role="alert">
                            {error}
                        </Alert>
                    )}

                    <div>
                        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                            You are about to ban <strong>{username || userID}</strong> on Twitch.
                            This will prevent them from chatting or interacting in the Twitch channel.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Ban Type
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            checked={isPermanent}
                                            onChange={() => setIsPermanent(true)}
                                            className="h-4 w-4 text-primary-600"
                                            disabled={loading}
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            Permanent Ban
                                        </span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            checked={!isPermanent}
                                            onChange={() => setIsPermanent(false)}
                                            className="h-4 w-4 text-primary-600"
                                            disabled={loading}
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            Timeout (Temporary)
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {!isPermanent && (
                                <div>
                                    <label
                                        htmlFor="duration"
                                        className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                                    >
                                        Duration (seconds)
                                    </label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        min="1"
                                        max="1209600"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        disabled={loading}
                                        placeholder="600"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Max: 1,209,600 seconds (14 days)
                                    </p>
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="reason"
                                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                                >
                                    Reason (Optional)
                                </label>
                                <TextArea
                                    id="reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    disabled={loading}
                                    placeholder="Reason for ban..."
                                    rows={3}
                                    maxLength={500}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setShowBanModal(false);
                            resetBanForm();
                        }}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleBan}
                        loading={loading}
                        disabled={loading || (!isPermanent && !duration)}
                    >
                        {isPermanent ? 'Ban User' : 'Timeout User'}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Unban Modal */}
            <Modal
                open={showUnbanModal}
                onClose={() => {
                    if (!loading) {
                        setShowUnbanModal(false);
                        setError(null);
                    }
                }}
                title="Unban User on Twitch"
            >
                <div className="space-y-4">
                    {error && (
                        <Alert variant="error" role="alert">
                            {error}
                        </Alert>
                    )}

                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Are you sure you want to unban <strong>{username || userID}</strong> on Twitch?
                        This will allow them to chat and interact in the Twitch channel again.
                    </p>
                </div>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setShowUnbanModal(false);
                            setError(null);
                        }}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleUnban}
                        loading={loading}
                        disabled={loading}
                    >
                        Unban User
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
}

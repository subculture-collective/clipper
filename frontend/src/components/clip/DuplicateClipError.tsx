import { Alert } from '../ui/Alert';

export interface DuplicateClipErrorProps {
  /**
   * Error message from the backend
   */
  message: string;
  /**
   * Optional clip ID to link to
   */
  clipId?: string;
  /**
   * Optional clip URL/slug to link to
   */
  clipSlug?: string;
  /**
   * Callback to dismiss the error
   */
  onDismiss?: () => void;
}

/**
 * DuplicateClipError Component
 * 
 * Displays an error message when a user tries to submit a duplicate clip.
 * Shows a link to the existing clip if available.
 */
export function DuplicateClipError({
  message,
  clipId,
  clipSlug,
  onDismiss,
}: DuplicateClipErrorProps) {
  // Determine the link to the existing clip
  const existingClipUrl = clipSlug ? `/clips/${clipSlug}` : clipId ? `/clips/${clipId}` : null;

  return (
    <Alert
      variant="error"
      title="Duplicate Clip"
      dismissible
      onDismiss={onDismiss}
    >
      <div className="space-y-2">
        <p>{message}</p>
        {existingClipUrl && (
          <p className="text-sm">
            <a
              href={existingClipUrl}
              className="underline hover:opacity-70 transition-opacity font-medium"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View existing clip (opens in new window)"
            >
              View the existing clip →
            </a>
          </p>
        )}
        <p className="text-xs opacity-80">
          Each clip can only be submitted once to prevent duplicates in our database.
        </p>
      </div>
    </Alert>
  );
}

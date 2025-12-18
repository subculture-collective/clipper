import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserPlaylists, addClipToPlaylist } from '@/lib/playlist-api';
import { useIsAuthenticated, useToast } from '@/hooks';
import { Link } from 'react-router-dom';

interface AddToPlaylistButtonProps {
    clipId: string;
}

export function AddToPlaylistButton({
    clipId,
}: AddToPlaylistButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isAuthenticated = useIsAuthenticated();
    const toast = useToast();
    const queryClient = useQueryClient();

    const { data: playlists = [], isLoading } = useQuery({
        queryKey: ['user-playlists'],
        queryFn: fetchUserPlaylists,
        enabled: isAuthenticated && isOpen,
    });

    const addMutation = useMutation({
        mutationFn: ({ playlistId }: { playlistId: string }) =>
            addClipToPlaylist(playlistId, clipId),
        onSuccess: () => {
            toast.success('Clip added to playlist');
            queryClient.invalidateQueries({ queryKey: ['user-playlists'] });
            setIsOpen(false);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to add clip to playlist');
        },
    });

    const handleClick = () => {
        if (!isAuthenticated) {
            toast.info('Please log in to add clips to playlists');
            return;
        }
        setIsOpen(!isOpen);
    };

    const handleAddToPlaylist = (playlistId: string) => {
        addMutation.mutate({ playlistId });
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () =>
                document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleClick}
                disabled={!isAuthenticated}
                className={`text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors touch-target min-h-11 ${
                    !isAuthenticated ?
                        'opacity-50 cursor-not-allowed hover:bg-transparent'
                    :   'cursor-pointer'
                }`}
                aria-label={
                    !isAuthenticated ?
                        'Log in to add to playlist'
                    :   'Add to playlist'
                }
                aria-disabled={!isAuthenticated}
                title={
                    !isAuthenticated ? 'Log in to add to playlist' : undefined
                }
            >
                <svg
                    className="w-5 h-5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                </svg>
                <span className="hidden sm:inline">Add to Playlist</span>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    {isLoading ?
                        <div className="p-4 text-center text-muted-foreground">
                            Loading playlists...
                        </div>
                    : playlists.length === 0 ?
                        <div className="p-4 text-center">
                            <p className="text-muted-foreground mb-3">
                                You don't have any playlists yet
                            </p>
                            <Link
                                to="/playlists"
                                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium"
                                onClick={() => setIsOpen(false)}
                            >
                                Create your first playlist →
                            </Link>
                        </div>
                    :   <ul className="py-2">
                            {playlists.map((playlist) => (
                                <li key={playlist.id}>
                                    <button
                                        onClick={() =>
                                            handleAddToPlaylist(playlist.id)
                                        }
                                        disabled={addMutation.isPending}
                                        className="w-full text-left px-4 py-2 hover:bg-muted transition-colors disabled:opacity-50"
                                    >
                                        <div className="font-medium">
                                            {playlist.title}
                                        </div>
                                        {playlist.description && (
                                            <div className="text-xs text-muted-foreground line-clamp-1">
                                                {playlist.description}
                                            </div>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    }
                </div>
            )}
        </div>
    );
}

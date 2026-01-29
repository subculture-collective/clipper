import { Container, ScrollToTop } from '../components';
import { MiniFooter } from '../components/layout';
import { SEO } from '../components';
import { PlaylistCard } from '../components/playlist';
import { usePublicPlaylists } from '@/hooks/usePlaylist';
import { useState } from 'react';
import { Button } from '@/components/ui';

export function PublicPlaylistsPage() {
    const [page, setPage] = useState(1);
    const { data, isLoading } = usePublicPlaylists(page, 20);

    const playlists = data?.data || [];
    const meta = data?.meta;

    return (
        <>
            <SEO
                title="Discover Playlists"
                description="Browse and discover public playlists created by the community"
            />
            <Container>
                <div className="py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-zinc-100 mb-2">
                            Discover Playlists
                        </h1>
                        <p className="text-zinc-400">
                            Browse public playlists created by the community
                        </p>
                    </div>

                    {/* Playlists Grid */}
                    {isLoading ? (
                        <div className="text-center py-12 text-zinc-500">Loading...</div>
                    ) : playlists.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            <p>No public playlists found.</p>
                            <p className="text-sm mt-2">Check back later for community playlists!</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                                {playlists.map((playlist) => (
                                    <PlaylistCard key={playlist.id} playlist={playlist} />
                                ))}
                            </div>

                            {/* Pagination */}
                            {meta && meta.total_pages > 1 && (
                                <div className="flex items-center justify-center gap-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={!meta.has_prev}
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-zinc-400">
                                        Page {meta.page} of {meta.total_pages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={!meta.has_next}
                                    >
                                        Next
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <MiniFooter />
            </Container>
            <ScrollToTop />
        </>
    );
}

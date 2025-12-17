import { Container, ScrollToTop } from '../components';
import { MiniFooter } from '../components/layout';
import { PlaylistDetail } from '../components/playlist';
import { SEO } from '../components';

export function PlaylistDetailPage() {
    return (
        <>
            <SEO
                title="Playlist"
                description="View playlist details and clips"
            />
            <Container>
                <div className="py-8">
                    <PlaylistDetail />
                </div>
                <MiniFooter />
            </Container>
            <ScrollToTop />
        </>
    );
}

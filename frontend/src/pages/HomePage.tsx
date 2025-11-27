import { Container, SEO } from '../components';
import { ClipFeed } from '../components/clip';

export function HomePage() {
    return (
        <>
            <SEO
                title='Home'
                description='Community-submitted clips only. Share your favorite moments, vote, and discuss—just like Reddit, but for Twitch clips.'
                canonicalUrl='/'
            />
            <Container className='py-4 xs:py-6 md:py-8'>
                <ClipFeed
                    title='Home Feed'
                    description='Community-submitted clips'
                    defaultSort='hot'
                    filters={{ feed: 'submitted' }}
                />
            </Container>
        </>
    );
}

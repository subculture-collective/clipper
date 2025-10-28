import { Container, SEO } from '../components';
import { ClipFeed } from '../components/clip';

export function HomePage() {
  return (
    <>
      <SEO
        title="Home"
        description="Discover and share the best Twitch clips curated by the community. Vote on your favorite moments, explore trending clips, and join the conversation."
        canonicalUrl="/"
      />
      <Container className="py-4 xs:py-6 md:py-8">
        <ClipFeed
          title="Home Feed"
          description="Discover the best Twitch clips"
          defaultSort="hot"
        />
      </Container>
    </>
  );
}

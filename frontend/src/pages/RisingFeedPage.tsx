import { Container, SEO } from '../components';
import { ClipFeed } from '../components/clip';

export function RisingFeedPage() {
  return (
    <>
      <SEO
        title="Rising Clips"
        description="Discover trending Twitch clips gaining momentum. See what's rising in popularity and catch viral gaming moments early."
        canonicalUrl="/rising"
      />
      <Container className="py-8">
        <ClipFeed
          title="Rising Clips"
          description="Clips trending upward"
          defaultSort="rising"
        />
      </Container>
    </>
  );
}

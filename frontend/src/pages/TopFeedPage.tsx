import { Container, SEO } from '../components';
import { ClipFeed } from '../components/clip';

export function TopFeedPage() {
  return (
    <>
      <SEO
        title="Top Clips"
        description="Watch the highest-rated Twitch clips. Browse the best gaming moments as voted by the community, featuring top plays and highlights."
        canonicalUrl="/top"
      />
      <Container className="py-8">
        <ClipFeed
          title="Top Clips"
          description="Top rated clips"
          defaultSort="top"
          defaultTimeframe="day"
        />
      </Container>
    </>
  );
}

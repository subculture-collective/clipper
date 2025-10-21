import { Container } from '../components';
import { ClipFeed } from '../components/clip';

export function TopFeedPage() {
  return (
    <Container className="py-8">
      <ClipFeed
        title="Top Clips"
        description="Top rated clips"
        defaultSort="top"
        defaultTimeframe="day"
      />
    </Container>
  );
}

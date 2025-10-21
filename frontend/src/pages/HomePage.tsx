import { Container } from '../components';
import { ClipFeed } from '../components/clip';

export function HomePage() {
  return (
    <Container className="py-8">
      <ClipFeed
        title="Home Feed"
        description="Discover the best Twitch clips"
        defaultSort="hot"
      />
    </Container>
  );
}

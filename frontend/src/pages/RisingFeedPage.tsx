import { Container } from '../components';
import { ClipFeed } from '../components/clip';

export function RisingFeedPage() {
  return (
    <Container className="py-8">
      <ClipFeed
        title="Rising Clips"
        description="Clips trending upward"
        defaultSort="rising"
      />
    </Container>
  );
}

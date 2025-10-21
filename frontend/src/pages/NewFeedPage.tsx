import { Container } from '../components';
import { ClipFeed } from '../components/clip';

export function NewFeedPage() {
  return (
    <Container className="py-8">
      <ClipFeed
        title="New Clips"
        description="Latest clips from the community"
        defaultSort="new"
      />
    </Container>
  );
}

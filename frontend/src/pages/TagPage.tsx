import { useParams } from 'react-router-dom';
import { Container } from '../components';
import { ClipFeed } from '../components/clip/ClipFeed';

export function TagPage() {
  const { tagSlug } = useParams<{ tagSlug: string }>();

  if (!tagSlug) {
    return (
      <Container className="py-8">
        <div className="text-center text-muted-foreground">
          <p>No tag specified</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <ClipFeed
        title={`#${tagSlug}`}
        description={`Clips tagged with ${tagSlug}`}
        filters={{ tags: [tagSlug] }}
        showSearch={false}
        useSortTitle={false}
      />
    </Container>
  );
}

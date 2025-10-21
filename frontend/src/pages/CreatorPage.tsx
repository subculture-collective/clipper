import { useParams } from 'react-router-dom';
import { Container } from '../components';

export function CreatorPage() {
  const { creatorId } = useParams<{ creatorId: string }>();

  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Creator Clips</h1>
        <p className="text-muted-foreground">Viewing clips from creator ID: {creatorId}</p>
      </div>
      <div className="text-center text-muted-foreground py-12">
        <p className="text-lg">Creator clips coming soon...</p>
        <p className="text-sm mt-2">This is a placeholder for creator-specific clips.</p>
      </div>
    </Container>
  );
}

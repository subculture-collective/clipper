import { useParams } from 'react-router-dom';
import { Container, SEO } from '../components';
import { ClipFeed } from '../components/clip';

export function CreatorPage() {
  const { creatorId } = useParams<{ creatorId: string }>();

  if (!creatorId) {
    return (
      <Container className="py-8">
        <div className="text-center text-muted-foreground py-12">
          <h2 className="text-2xl font-bold mb-2">Creator Not Found</h2>
          <p>No creator ID specified.</p>
        </div>
      </Container>
    );
  }

  return (
    <>
      <SEO
        title={`${creatorId} - Creator Profile`}
        description={`View all clips created by ${creatorId} on Clipper`}
      />
      <Container className="py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Creator Clips</h1>
          <p className="text-muted-foreground">Viewing clips from: {creatorId}</p>
        </div>
        
        {/* Use ClipFeed with creator_id filter */}
        <ClipFeed
          filters={{ creator_id: creatorId }}
          showSearch={false}
          useSortTitle={false}
          title={`Clips by ${creatorId}`}
        />
      </Container>
    </>
  );
}

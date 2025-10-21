import { useParams } from 'react-router-dom';
import { Container } from '../components';

export function TagPage() {
  const { tagSlug } = useParams<{ tagSlug: string }>();

  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Tag: #{tagSlug}</h1>
        <p className="text-muted-foreground">Viewing clips with tag: {tagSlug}</p>
      </div>
      <div className="text-center text-muted-foreground py-12">
        <p className="text-lg">Tagged clips coming soon...</p>
        <p className="text-sm mt-2">This is a placeholder for tag-filtered clips.</p>
      </div>
    </Container>
  );
}

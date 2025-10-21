import { useParams } from 'react-router-dom';
import { Container } from '../components';

export function ClipDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Clip Details</h1>
        <p className="text-muted-foreground">Viewing clip ID: {id}</p>
      </div>
      <div className="text-center text-muted-foreground py-12">
        <p className="text-lg">Clip details coming soon...</p>
        <p className="text-sm mt-2">This is a placeholder for the single clip view with comments.</p>
      </div>
    </Container>
  );
}

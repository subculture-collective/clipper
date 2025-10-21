import { useSearchParams } from 'react-router-dom';
import { Container } from '../components';

export function HomePage() {
  const [searchParams] = useSearchParams();
  const sort = searchParams.get('sort') || 'hot';

  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Home Feed</h1>
        <p className="text-muted-foreground">
          Viewing clips sorted by: <span className="font-semibold">{sort}</span>
        </p>
      </div>
      <div className="text-center text-muted-foreground py-12">
        <p className="text-lg">Clip feed coming soon...</p>
        <p className="text-sm mt-2">This is a placeholder for the main clip feed.</p>
      </div>
    </Container>
  );
}

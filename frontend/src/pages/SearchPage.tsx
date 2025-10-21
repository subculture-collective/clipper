import { useSearchParams } from 'react-router-dom';
import { Container } from '../components';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Search Results</h1>
        {query && (
          <p className="text-muted-foreground">
            Search results for: <span className="font-semibold">"{query}"</span>
          </p>
        )}
      </div>
      <div className="text-center text-muted-foreground py-12">
        <p className="text-lg">Search functionality coming soon...</p>
        <p className="text-sm mt-2">This is a placeholder for the search results page.</p>
      </div>
    </Container>
  );
}

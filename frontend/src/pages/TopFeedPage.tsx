import { useSearchParams } from 'react-router-dom';
import { Container } from '../components';

export function TopFeedPage() {
  const [searchParams] = useSearchParams();
  const timeframe = searchParams.get('t') || 'day';

  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Top Clips</h1>
        <p className="text-muted-foreground">
          Top clips from the past: <span className="font-semibold">{timeframe}</span>
        </p>
      </div>
      <div className="text-center text-muted-foreground py-12">
        <p className="text-lg">Top clips feed coming soon...</p>
        <p className="text-sm mt-2">Filter by: hour, day, week, month, year, all</p>
      </div>
    </Container>
  );
}

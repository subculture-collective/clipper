import { Container } from '../components';

export function RisingFeedPage() {
  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Rising Clips</h1>
        <p className="text-muted-foreground">Clips trending upward</p>
      </div>
      <div className="text-center text-muted-foreground py-12">
        <p className="text-lg">Rising clips feed coming soon...</p>
      </div>
    </Container>
  );
}

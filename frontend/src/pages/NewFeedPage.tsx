import { Container } from '../components';

export function NewFeedPage() {
  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">New Clips</h1>
        <p className="text-muted-foreground">Latest clips from the community</p>
      </div>
      <div className="text-center text-muted-foreground py-12">
        <p className="text-lg">New clips feed coming soon...</p>
      </div>
    </Container>
  );
}

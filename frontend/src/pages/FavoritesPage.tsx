import { Container } from '../components';

export function FavoritesPage() {
  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Favorites</h1>
        <p className="text-muted-foreground">Your saved clips</p>
      </div>
      <div className="text-center text-muted-foreground py-12">
        <p className="text-lg">Favorites coming soon...</p>
        <p className="text-sm mt-2">This is a placeholder for your favorite clips list.</p>
      </div>
    </Container>
  );
}

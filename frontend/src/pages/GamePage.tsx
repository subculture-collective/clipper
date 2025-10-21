import { useParams } from 'react-router-dom';
import { Container } from '../components';

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();

  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Game Clips</h1>
        <p className="text-muted-foreground">Viewing clips for game ID: {gameId}</p>
      </div>
      <div className="text-center text-muted-foreground py-12">
        <p className="text-lg">Game-filtered clips coming soon...</p>
        <p className="text-sm mt-2">This is a placeholder for game-specific clips.</p>
      </div>
    </Container>
  );
}

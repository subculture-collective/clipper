import { Link } from 'react-router-dom';
import { Container, Button } from '../components';

export function NotFoundPage() {
  return (
    <Container className="py-16">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-error-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button variant="primary">Go Home</Button>
        </Link>
      </div>
    </Container>
  );
}

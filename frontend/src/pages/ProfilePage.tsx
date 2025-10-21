import { Container } from '../components';
import { useAuth } from '../context/AuthContext';

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">Logged in as: {user?.username}</p>
      </div>
      <div className="text-center text-muted-foreground py-12">
        <p className="text-lg">Profile settings coming soon...</p>
        <p className="text-sm mt-2">This is a placeholder for the user profile page.</p>
      </div>
    </Container>
  );
}

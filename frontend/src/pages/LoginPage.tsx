import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Card, CardHeader, CardBody, Input, Button, Stack } from '../components';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <Container className="py-16 max-w-md">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">Login to Clipper</h1>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit}>
            <Stack direction="vertical" gap={4}>
              <Input
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </Stack>
          </form>
        </CardBody>
      </Card>
    </Container>
  );
}

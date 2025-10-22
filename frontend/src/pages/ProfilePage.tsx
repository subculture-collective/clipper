import { Container, Card, CardBody, Stack } from '../components';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Container className="py-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-24 h-24 rounded-full border-2 border-border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-3xl font-bold text-primary-600">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-1">{user.display_name}</h1>
                <p className="text-muted-foreground mb-2">@{user.username}</p>
                
                {user.bio && (
                  <p className="text-foreground mb-4">{user.bio}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Karma:</span>
                    <span className="font-semibold text-primary-600">{user.karma_points}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Role:</span>
                    <span className="font-semibold capitalize">{user.role}</span>
                  </div>
                  {user.created_at && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Joined:</span>
                      <span className="font-semibold">
                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Tabs Section */}
        <Card>
          <CardBody>
            <Stack direction="vertical" gap={4}>
              <div className="border-b border-border">
                <nav className="flex gap-4">
                  <button className="px-4 py-2 border-b-2 border-primary-500 text-primary-600 font-semibold">
                    Overview
                  </button>
                  <button className="px-4 py-2 text-muted-foreground hover:text-foreground">
                    Comments
                  </button>
                  <button className="px-4 py-2 text-muted-foreground hover:text-foreground">
                    Upvoted
                  </button>
                </nav>
              </div>

              {/* Placeholder Content */}
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Full profile features coming soon...
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  View your comments, upvoted clips, and more.
                </p>
              </div>
            </Stack>
          </CardBody>
        </Card>
      </div>
    </Container>
  );
}

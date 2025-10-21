import { Link } from 'react-router-dom';
import { Container, Grid, Card, CardHeader, CardBody } from '../../components';

export function AdminDashboard() {
  return (
    <Container className="py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <Grid cols={3} gap={6} responsive={{ sm: 1, md: 2, lg: 3 }}>
        <Link to="/admin/clips">
          <Card hover clickable>
            <CardHeader>
              <h3 className="text-xl font-semibold">Clip Moderation</h3>
            </CardHeader>
            <CardBody>
              <p className="text-muted-foreground">
                Review and moderate clips submitted to the platform
              </p>
            </CardBody>
          </Card>
        </Link>

        <Link to="/admin/comments">
          <Card hover clickable>
            <CardHeader>
              <h3 className="text-xl font-semibold">Comment Moderation</h3>
            </CardHeader>
            <CardBody>
              <p className="text-muted-foreground">
                Manage and moderate user comments
              </p>
            </CardBody>
          </Card>
        </Link>

        <Link to="/admin/users">
          <Card hover clickable>
            <CardHeader>
              <h3 className="text-xl font-semibold">User Management</h3>
            </CardHeader>
            <CardBody>
              <p className="text-muted-foreground">
                Manage user accounts and permissions
              </p>
            </CardBody>
          </Card>
        </Link>

        <Link to="/admin/reports">
          <Card hover clickable>
            <CardHeader>
              <h3 className="text-xl font-semibold">Reports</h3>
            </CardHeader>
            <CardBody>
              <p className="text-muted-foreground">
                Review user reports and take action
              </p>
            </CardBody>
          </Card>
        </Link>

        <Link to="/admin/sync">
          <Card hover clickable>
            <CardHeader>
              <h3 className="text-xl font-semibold">Sync Controls</h3>
            </CardHeader>
            <CardBody>
              <p className="text-muted-foreground">
                Manually trigger Twitch clip synchronization
              </p>
            </CardBody>
          </Card>
        </Link>
      </Grid>
    </Container>
  );
}

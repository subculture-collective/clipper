import { Container, Card, CardBody } from '../components';

export function PrivacyPage() {
  return (
    <Container className="py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      
      <Card className="mb-6">
        <CardBody>
          <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
          <p className="text-muted-foreground mb-4">
            This is a placeholder privacy policy. In production, this would contain details about:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>What information we collect from users</li>
            <li>How we use that information</li>
            <li>How we protect user data</li>
            <li>Cookie usage and tracking</li>
            <li>Third-party services we use</li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
          <p className="text-muted-foreground">
            Users have the right to access, correct, or delete their personal data.
          </p>
        </CardBody>
      </Card>
    </Container>
  );
}

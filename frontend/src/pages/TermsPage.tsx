import { Container, Card, CardBody } from '../components';

export function TermsPage() {
  return (
    <Container className="py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
      
      <Card className="mb-6">
        <CardBody>
          <h2 className="text-2xl font-semibold mb-4">Terms and Conditions</h2>
          <p className="text-muted-foreground mb-4">
            This is a placeholder terms of service page. In production, this would contain:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>User responsibilities and acceptable use</li>
            <li>Content ownership and licensing</li>
            <li>Prohibited activities</li>
            <li>Limitation of liability</li>
            <li>Dispute resolution</li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-2xl font-semibold mb-4">Contact</h2>
          <p className="text-muted-foreground">
            For questions about these terms, please contact us at legal@clipper.com
          </p>
        </CardBody>
      </Card>
    </Container>
  );
}

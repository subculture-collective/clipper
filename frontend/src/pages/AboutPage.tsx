import { Container, Card, CardBody } from '../components';

export function AboutPage() {
  return (
    <Container className="py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">About Clipper</h1>
      
      <Card className="mb-6">
        <CardBody>
          <h2 className="text-2xl font-semibold mb-4">What is Clipper?</h2>
          <p className="text-muted-foreground mb-4">
            Clipper is a modern platform for discovering and sharing gaming highlights. 
            We aggregate the best clips from Twitch and make them easy to find, watch, 
            and share with your friends.
          </p>
          <p className="text-muted-foreground">
            Our mission is to celebrate great gaming moments and connect the gaming community 
            through shared experiences.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>We sync clips from Twitch automatically</li>
            <li>Users can browse, search, and filter clips by game, creator, or tag</li>
            <li>Save your favorite clips for later viewing</li>
            <li>Share clips with the community</li>
          </ul>
        </CardBody>
      </Card>
    </Container>
  );
}

import { Container, SEO } from '../components';
import { ClipFeed } from '../components/clip';
import { DiscoveryListCard } from '../components/discovery';
import { useDiscoveryLists } from '../hooks/useDiscoveryLists';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function HomePage() {
  // Fetch featured discovery lists
  const { data: featuredLists, isLoading } = useDiscoveryLists({
    featured: true,
    limit: 3,
  });

  return (
    <>
      <SEO
        title="Home"
        description="Discover and share the best Twitch clips curated by the community. Vote on your favorite moments, explore trending clips, and join the conversation."
        canonicalUrl="/"
      />
      <Container className="py-4 xs:py-6 md:py-8">
        {/* Featured Discovery Lists Section */}
        {!isLoading && featuredLists && featuredLists.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Curated Collections
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Handpicked lists of amazing clips
                </p>
              </div>
              <Link
                to="/discover/lists"
                className="flex items-center gap-1 text-primary-500 hover:text-primary-600 text-sm font-medium transition-colors"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredLists.map((list) => (
                <DiscoveryListCard key={list.id} list={list} />
              ))}
            </div>
          </div>
        )}

        {/* Main Clip Feed */}
        <ClipFeed
          title="Home Feed"
          description="Discover the best Twitch clips"
          defaultSort="hot"
        />
      </Container>
    </>
  );
}

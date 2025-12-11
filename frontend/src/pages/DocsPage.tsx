import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Container, Card, CardBody, SEO } from '../components';
import axios from 'axios';

interface DocNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DocNode[];
}

interface DocContent {
  path: string;
  content: string;
  github_url?: string;
}

interface SearchResult {
  path: string;
  name: string;
  matches: string[];
  score: number;
}

/**
 * Documentation Hub Page
 * Displays documentation served from the backend /docs folder
 */
export function DocsPage() {
  const [searchParams] = useSearchParams();
  const [docs, setDocs] = useState<DocNode[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchDocsList();
<<<<<<< HEAD

=======
    
>>>>>>> main
    // Check for doc parameter in URL
    const docParam = searchParams.get('doc');
    if (docParam) {
      fetchDoc(docParam);
    }
  }, [searchParams]);

  const fetchDocsList = async () => {
    try {
      const response = await axios.get('/api/v1/docs');
      setDocs(response.data.docs);
      setLoading(false);
    } catch (err) {
      setError('Failed to load documentation');
      setLoading(false);
    }
  };

  const fetchDoc = async (path: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/docs/${path}`);
      setSelectedDoc(response.data);
      setViewingDoc(true);
      setLoading(false);
      window.scrollTo(0, 0);
    } catch (err) {
      setError('Failed to load document');
      setLoading(false);
    }
  };

  const handleBackToIndex = () => {
    setViewingDoc(false);
    setSelectedDoc(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
<<<<<<< HEAD

=======
    
>>>>>>> main
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await axios.get(`/api/v1/docs/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.results || []);
      setSearching(false);
    } catch (err) {
      console.error('Search failed:', err);
      setSearching(false);
    }
  };

  const renderDocTree = (nodes: DocNode[], level = 0) => {
    return (
      <div className={level > 0 ? 'ml-4' : ''}>
        {nodes.map((node) => (
          <div key={node.path} className="mb-2">
            {node.type === 'directory' ? (
              <>
                <h3 className={`font-semibold ${level === 0 ? 'text-xl mt-4 mb-2' : 'text-lg mt-2 mb-1'}`}>
                  {node.name.charAt(0).toUpperCase() + node.name.slice(1).replace(/-/g, ' ')}
                </h3>
                {node.children && renderDocTree(node.children, level + 1)}
              </>
            ) : (
              <button
                onClick={() => fetchDoc(node.path)}
                className="text-left text-primary hover:underline block py-1"
              >
                {node.name.replace(/-/g, ' ')}
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Custom components for markdown rendering
  const markdownComponents = {
    // Style links
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
      // Convert wikilinks [[page]] to clickable doc links
      const wikiLinkMatch = href?.match(/^\[\[(.+)\]\]$/);
      if (wikiLinkMatch) {
        const docPath = wikiLinkMatch[1];
        return (
          <button
            onClick={() => fetchDoc(docPath)}
            className="text-primary hover:underline"
          >
            {children}
          </button>
        );
      }
<<<<<<< HEAD

=======
      
>>>>>>> main
      // Handle relative doc links
      if (href?.endsWith('.md') && !href.startsWith('http')) {
        const cleanPath = href.replace(/^\.\.\//, '').replace(/\.md$/, '');
        return (
          <button
            onClick={() => fetchDoc(cleanPath)}
            className="text-primary hover:underline"
          >
            {children}
          </button>
        );
      }

      // External links
      return (
        <a
          href={href}
          target={href?.startsWith('http') ? '_blank' : undefined}
          rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="text-primary hover:underline"
        >
          {children}
        </a>
      );
    },
    // Style code blocks
    code: ({ inline, className, children }: { inline?: boolean; className?: string; children?: React.ReactNode }) => {
      if (inline) {
        return <code className="px-1 py-0.5 bg-muted rounded text-sm">{children}</code>;
      }
      return (
        <code className={`block p-4 bg-muted rounded-lg overflow-x-auto ${className || ''}`}>
          {children}
        </code>
      );
    },
    // Style headings
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-4xl font-bold mb-4 mt-6">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-3xl font-semibold mb-3 mt-5">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-2xl font-semibold mb-2 mt-4">{children}</h3>
    ),
    // Style lists
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>
    ),
    // Style blockquotes
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-4 border-primary pl-4 italic my-4">{children}</blockquote>
    ),
  };

  if (loading && !viewingDoc) {
    return (
      <Container className="py-8">
        <p className="text-center text-muted-foreground">Loading documentation...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-8">
        <Card>
          <CardBody>
            <p className="text-center text-destructive">{error}</p>
          </CardBody>
        </Card>
      </Container>
    );
  }

  return (
    <>
      <SEO
        title={viewingDoc && selectedDoc ? selectedDoc.path : 'Documentation'}
        description="Comprehensive documentation for Clipper - architecture, APIs, operations, user guides, and contributor information."
        canonicalUrl="/docs"
      />
      <Container className="py-8 max-w-6xl">
        {viewingDoc && selectedDoc ? (
          // Document viewer
          <div>
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={handleBackToIndex}
                className="text-primary hover:underline flex items-center gap-2"
              >
                ← Back to Documentation Index
              </button>
              {selectedDoc.github_url && (
                <a
                  href={selectedDoc.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  ✏️ Edit on GitHub
                </a>
              )}
            </div>
            <Card>
              <CardBody className="prose prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {selectedDoc.content}
                </ReactMarkdown>
              </CardBody>
            </Card>
          </div>
        ) : (
          // Documentation index
          <div>
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">Documentation Hub</h1>
              <p className="text-lg text-muted-foreground mb-4">
                Comprehensive guides, API references, and operational procedures
              </p>
<<<<<<< HEAD

=======
              
>>>>>>> main
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {searching && (
                  <div className="absolute right-3 top-3 text-muted-foreground">
                    Searching...
                  </div>
                )}
              </div>
            </div>

            {/* Search Results */}
            {searchQuery && searchResults.length > 0 && (
              <Card className="mb-8">
                <CardBody>
                  <h2 className="text-2xl font-semibold mb-4">
                    Search Results ({searchResults.length})
                  </h2>
                  <div className="space-y-4">
                    {searchResults.map((result) => (
                      <div
                        key={result.path}
                        className="border-b border-border pb-4 last:border-0"
                      >
                        <button
                          onClick={() => {
                            fetchDoc(result.path);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          className="text-left w-full hover:bg-accent p-2 rounded transition-colors"
                        >
                          <h3 className="font-semibold text-primary mb-1">
                            {result.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {result.path}
                          </p>
                          {result.matches.map((match, idx) => (
                            <p
                              key={idx}
                              className="text-sm text-muted-foreground italic"
                            >
                              {match}
                            </p>
                          ))}
                        </button>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* No Results */}
            {searchQuery && searchResults.length === 0 && !searching && (
              <Card className="mb-8">
                <CardBody>
                  <p className="text-center text-muted-foreground">
                    No results found for "{searchQuery}"
                  </p>
                </CardBody>
              </Card>
            )}

            {/* Documentation Tree (show only when not searching) */}
            {!searchQuery && (
              <Card>
                <CardBody>
                  {renderDocTree(docs)}
                </CardBody>
              </Card>
            )}

            {/* Additional Resources */}
            <Card className="mt-8">
              <CardBody>
                <h2 className="text-2xl font-semibold mb-4">External Resources</h2>
                <div className="space-y-3">
                  <div>
                    <a
                      href="https://github.com/subculture-collective/clipper"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      GitHub Repository
                    </a>
                    <p className="text-sm text-muted-foreground">View source code and open issues</p>
                  </div>
                  <div>
                    <a
                      href="https://github.com/subculture-collective/clipper/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      Issue Tracker
                    </a>
                    <p className="text-sm text-muted-foreground">Report bugs or request features</p>
                  </div>
                  <div>
                    <a
                      href="https://github.com/subculture-collective/clipper/discussions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      Discussions
                    </a>
                    <p className="text-sm text-muted-foreground">Ask questions and share ideas</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </Container>
    </>
  );
}
<<<<<<< HEAD
<<<<<<< HEAD
=======

  // Documentation sections organized by category
  const docSections = [
    {
      title: 'Getting Started',
      id: 'getting-started',
      docs: [
        {
          title: 'User Guide',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/user-guide.md',
          description: 'How to use Clipper as a user'
        },
        {
          title: 'FAQ',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/faq.md',
          description: 'Frequently asked questions'
        },
        {
          title: 'Community Guidelines',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/guidelines.md',
          description: 'Rules and best practices for the community'
        }
      ]
    },
    {
      title: 'Development',
      id: 'development',
      docs: [
        {
          title: 'Development Setup',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/development.md',
          description: 'Get started with local development'
        },
        {
          title: 'Contributing Guide',
          path: 'https://github.com/subculture-collective/clipper/blob/main/CONTRIBUTING.md',
          description: 'How to contribute to the project'
        },
        {
          title: 'Testing Guide',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/TESTING.md',
          description: 'Testing strategy and tools'
        },
        {
          title: 'Component Library',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/COMPONENT-LIBRARY.md',
          description: 'Reusable React components'
        },
        {
          title: 'Internationalization (i18n)',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/I18N.md',
          description: 'Multi-language support'
        }
      ]
    },
    {
      title: 'Architecture & Design',
      id: 'architecture',
      docs: [
        {
          title: 'System Architecture',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/ARCHITECTURE.md',
          description: 'High-level system design and architecture'
        },
        {
          title: 'Database Schema',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/DATABASE-SCHEMA.md',
          description: 'Database structure and relationships'
        },
        {
          title: 'Database Management',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/database.md',
          description: 'Database operations and migrations'
        },
        {
          title: 'Authentication',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/AUTHENTICATION.md',
          description: 'Authentication and authorization system'
        },
        {
          title: 'Caching Strategy',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/CACHING_STRATEGY.md',
          description: 'Redis caching implementation'
        },
        {
          title: 'Search Platform',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/SEARCH.md',
          description: 'OpenSearch setup and usage'
        }
      ]
    },
    {
      title: 'API Documentation',
      id: 'api',
      docs: [
        {
          title: 'REST API Reference',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/API.md',
          description: 'Complete API endpoints documentation'
        },
        {
          title: 'Clip API',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/CLIP_API.md',
          description: 'Clip management endpoints'
        },
        {
          title: 'Comment API',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/COMMENT_API.md',
          description: 'Comment system endpoints'
        },
        {
          title: 'Twitch Integration',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/TWITCH_INTEGRATION.md',
          description: 'Twitch API integration details'
        }
      ]
    },
    {
      title: 'Operations & Infrastructure',
      id: 'operations',
      docs: [
        {
          title: 'Runbook',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/RUNBOOK.md',
          description: 'Operational procedures and incident response'
        },
        {
          title: 'Deployment Guide',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/DEPLOYMENT.md',
          description: 'Production deployment instructions'
        },
        {
          title: 'Infrastructure Guide',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/INFRASTRUCTURE.md',
          description: 'Infrastructure setup and configuration'
        },
        {
          title: 'CI/CD Pipeline',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/CI-CD.md',
          description: 'Continuous integration and deployment'
        },
        {
          title: 'Monitoring & Observability',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/MONITORING.md',
          description: 'Error tracking and monitoring setup'
        },
        {
          title: 'Redis Operations',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/REDIS_OPERATIONS.md',
          description: 'Redis cache management'
        },
        {
          title: 'Secrets Management',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/SECRETS_MANAGEMENT.md',
          description: 'Managing sensitive configuration'
        }
      ]
    },
    {
      title: 'Features & Systems',
      id: 'features',
      docs: [
        {
          title: 'RBAC (Role-Based Access Control)',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/RBAC.md',
          description: 'User roles and permissions'
        },
        {
          title: 'Reputation System',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/REPUTATION_SYSTEM.md',
          description: 'Karma and reputation mechanics'
        },
        {
          title: 'Tagging System',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/TAGGING_SYSTEM.md',
          description: 'Content tagging and organization'
        },
        {
          title: 'Discovery Lists',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/DISCOVERY_LISTS.md',
          description: 'Curated content collections'
        },
        {
          title: 'Analytics',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/ANALYTICS.md',
          description: 'Analytics and tracking implementation'
        },
        {
          title: 'User Settings',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/USER_SETTINGS.md',
          description: 'User preferences and configuration'
        },
        {
          title: 'Subscriptions',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/SUBSCRIPTIONS.md',
          description: 'Stripe subscription system'
        },
        {
          title: 'Subscription Privileges Matrix',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/SUBSCRIPTION_PRIVILEGES_MATRIX.md',
          description: 'Features and limits by tier'
        }
      ]
    },
    {
      title: 'Security',
      id: 'security',
      docs: [
        {
          title: 'Security Overview',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/SECURITY.md',
          description: 'Security practices and policies'
        },
        {
          title: 'Security Summaries',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/SECURITY_SUMMARY.md',
          description: 'Security audit results'
        },
        {
          title: 'CSS Injection Prevention',
          path: 'https://github.com/subculture-collective/clipper/blob/main/docs/CSS_INJECTION_PREVENTION.md',
          description: 'Protection against CSS attacks'
        }
      ]
    }
  ];

  return (
    <>
      <SEO
        title="Documentation"
        description="Comprehensive documentation for Clipper - architecture, APIs, operations, user guides, and contributor information."
        canonicalUrl="/docs"
      />
      <Container className="py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Documentation Hub</h1>
          <p className="text-lg text-muted-foreground mb-2">
            Central hub for architecture, APIs, operations, and user guides
          </p>
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        {/* Quick Links */}
        <Card className="mb-8">
          <CardBody>
            <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="https://github.com/subculture-collective/clipper/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <h3 className="font-semibold mb-1 text-foreground">Contributing Guide</h3>
                <p className="text-sm text-muted-foreground">Learn how to contribute to Clipper</p>
              </a>
              <a
                href="https://github.com/subculture-collective/clipper/blob/main/docs/RUNBOOK.md"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <h3 className="font-semibold mb-1 text-foreground">Operations Runbook</h3>
                <p className="text-sm text-muted-foreground">Incident response and procedures</p>
              </a>
              <a
                href="https://github.com/subculture-collective/clipper"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <h3 className="font-semibold mb-1 text-foreground">GitHub Repository</h3>
                <p className="text-sm text-muted-foreground">View source code and issues</p>
              </a>
            </div>
          </CardBody>
        </Card>

        {/* Documentation Sections */}
        <div className="space-y-8">
          {docSections.map((section) => (
            <Card key={section.id} id={section.id}>
              <CardBody>
                <h2 className="text-2xl font-semibold mb-4">{section.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.docs.map((doc) => (
                    <a
                      key={doc.path}
                      href={doc.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 border border-border rounded-lg hover:bg-accent transition-colors group"
                    >
                      <h3 className="font-semibold mb-1 text-foreground group-hover:text-primary transition-colors">
                        {doc.title} →
                      </h3>
                      <p className="text-sm text-muted-foreground">{doc.description}</p>
                    </a>
                  ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Additional Resources */}
        <Card className="mt-8">
          <CardBody>
            <h2 className="text-2xl font-semibold mb-4">Additional Resources</h2>
            <div className="space-y-3">
              <div>
                <a
                  href="https://github.com/subculture-collective/clipper/blob/main/CODE_OF_CONDUCT.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Code of Conduct
                </a>
                <p className="text-sm text-muted-foreground">Community standards and expectations</p>
              </div>
              <div>
                <a
                  href="https://github.com/subculture-collective/clipper/blob/main/CHANGELOG.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Changelog
                </a>
                <p className="text-sm text-muted-foreground">Version history and changes</p>
              </div>
              <div>
                <a
                  href="https://github.com/subculture-collective/clipper/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Issue Tracker
                </a>
                <p className="text-sm text-muted-foreground">Report bugs or request features</p>
              </div>
              <div>
                <a
                  href="https://github.com/subculture-collective/clipper/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Discussions
                </a>
                <p className="text-sm text-muted-foreground">Ask questions and share ideas</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Status Page Note */}
        <Card className="mt-8 bg-muted/50">
          <CardBody>
            <h2 className="text-xl font-semibold mb-2">System Status</h2>
            <p className="text-muted-foreground">
              For real-time system status and incident updates, visit our status page (coming soon).
              In the meantime, check our{' '}
              <a
                href="https://github.com/subculture-collective/clipper/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub issues
              </a>
              {' '}for known issues and updates.
            </p>
          </CardBody>
        </Card>
      </Container>
    </>
  );
}
>>>>>>> main
=======
>>>>>>> main

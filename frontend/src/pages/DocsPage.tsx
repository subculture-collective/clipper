import { Container, Card, CardBody, SEO } from '../components';

/**
 * Documentation Hub Page
 * Central hub for architecture, APIs, operations, and user guides
 */
export function DocsPage() {
  const lastUpdated = 'October 29, 2024';

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

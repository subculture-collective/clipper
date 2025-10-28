import { Link } from 'react-router-dom';

/**
 * ExternalLink component that checks if link should work in current environment
 * Shows placeholder notice for docs/status in local development
 */
function ExternalLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const isDev = import.meta.env.DEV;
  const isDocsOrStatus = href.includes('docs.clipper.com') || href.includes('status.clipper.com');
  
  // In development, show placeholder notice for docs/status links
  if (isDev && isDocsOrStatus) {
    return (
      <span 
        className={`${className} cursor-not-allowed opacity-60`}
        title="Available in production. Documentation and status pages are external services."
      >
        {children} <span className="text-xs">⚠️</span>
      </span>
    );
  }
  
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <h3 className="font-semibold mb-4">About</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  About Clipper
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/subculture-collective/clipper"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Section */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/privacy"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Community Section */}
          <div>
            <h3 className="font-semibold mb-4">Community</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/community-rules"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Community Rules
                </Link>
              </li>
              <li>
                <a
                  href="https://discord.gg/clipper"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Discord
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com/clipper"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Twitter
                </a>
              </li>
            </ul>
          </div>

          {/* Resources Section */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <ExternalLink
                  href="https://docs.clipper.com"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Documentation
                </ExternalLink>
              </li>
              <li>
                <ExternalLink
                  href="https://status.clipper.com"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Status
                </ExternalLink>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-border text-center text-muted-foreground">
          <p>© {currentYear} Clipper. Built with React, TypeScript, and TailwindCSS 💜</p>
        </div>
      </div>
    </footer>
  );
}

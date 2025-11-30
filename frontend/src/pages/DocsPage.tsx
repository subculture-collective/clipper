import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DocEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DocEntry[];
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

const DocsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Fetch documentation tree on mount
  useEffect(() => {
    fetch('/api/v1/docs')
      .then(res => res.json())
      .then(data => {
        setDocs(data.docs);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load docs:', err);
        setLoading(false);
      });
  }, []);

  // Check for doc parameter in URL
  useEffect(() => {
    const docPath = searchParams.get('doc');
    if (docPath) {
      fetchDoc(docPath);
    }
  }, [searchParams]);

  // Fetch specific document
  const fetchDoc = (path: string) => {
    setLoading(true);
    setSearchQuery(''); // Clear search when viewing doc
    setSearchResults([]);
    fetch(`/api/v1/docs/${path}`)
      .then(res => res.json())
      .then(data => {
        setSelectedDoc(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load document:', err);
        setLoading(false);
      });
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/v1/docs/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  // Navigate back to index
  const handleBackToIndex = () => {
    setSelectedDoc(null);
    setSearchQuery('');
    setSearchResults([]);
    setSearchParams({}); // Clear URL params
  };

  // Render documentation tree
  const renderTree = (entries: DocEntry[]) => {
    return (
      <ul className="space-y-1">
        {entries.map((entry) => (
          <li key={entry.path}>
            {entry.type === 'directory' ? (
              <details className="group">
                <summary className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded">
                  <span className="font-medium">{entry.name}</span>
                </summary>
                <div className="ml-4 mt-1">
                  {entry.children && renderTree(entry.children)}
                </div>
              </details>
            ) : (
              <button
                onClick={() => fetchDoc(entry.path)}
                className="w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded"
              >
                {entry.name}
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  };

  // Custom markdown components
  const components = {
    a: ({ href, children }: any) => {
      // Convert wikilinks [[page]] to navigation
      if (href && href.startsWith('[[')) {
        const match = href.match(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/);
        if (match) {
          const path = match[1];
          const label = match[3] || children;
          return (
            <button
              onClick={() => fetchDoc(path)}
              className="text-blue-600 hover:underline"
            >
              {label}
            </button>
          );
        }
      }
      return <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>;
    },
    code: ({ inline, children }: any) => {
      if (inline) {
        return <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">{children}</code>;
      }
      return <code className="block bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto">{children}</code>;
    },
    h1: ({ children }: any) => <h1 className="text-3xl font-bold mt-6 mb-4">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-2xl font-bold mt-5 mb-3">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-xl font-semibold mt-4 mb-2">{children}</h3>,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading documentation...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <h2 className="text-xl font-bold mb-4">Documentation</h2>
          
          {/* Search */}
          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-3 py-2 border rounded"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {searching ? '...' : '🔍'}
              </button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 ? (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </h3>
              <ul className="space-y-2">
                {searchResults.map((result) => (
                  <li key={result.path}>
                    <button
                      onClick={() => fetchDoc(result.path)}
                      className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      <div className="font-medium">{result.name}</div>
                      {result.matches.length > 0 && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {result.matches[0]}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Doc Tree */}
          {!searchQuery && renderTree(docs)}
        </div>

        {/* Content */}
        <div className="flex-1">
          {selectedDoc ? (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <button
                  onClick={handleBackToIndex}
                  className="text-blue-600 hover:underline"
                >
                  ← Back to Index
                </button>
                {selectedDoc.github_url && (
                  <a
                    href={selectedDoc.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    ✏️ Edit on GitHub
                  </a>
                )}
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                  {selectedDoc.content}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
              <h2 className="text-2xl font-bold mb-4">Clipper Documentation</h2>
              <p>Select a document from the sidebar to get started.</p>
              <p className="mt-2">Or use the search bar to find specific topics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocsPage;

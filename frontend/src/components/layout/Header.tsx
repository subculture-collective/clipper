import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button, Input } from '../ui';
import { UserMenu } from './UserMenu';

export function Header() {
  const { isAuthenticated, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="text-2xl font-bold text-gradient">Clipper</div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/">
              <Button variant="ghost" size="sm">
                Hot
              </Button>
            </Link>
            <Link to="/new">
              <Button variant="ghost" size="sm">
                New
              </Button>
            </Link>
            <Link to="/top">
              <Button variant="ghost" size="sm">
                Top
              </Button>
            </Link>
            <Link to="/rising">
              <Button variant="ghost" size="sm">
                Rising
              </Button>
            </Link>
            <Link to="/leaderboards">
              <Button variant="ghost" size="sm">
                🏆 Leaderboards
              </Button>
            </Link>
          </nav>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-md mx-4">
            <Input
              type="search"
              placeholder="Search clips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <div className="hidden md:flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme('light')}
                className={theme === 'light' ? 'bg-primary-100 dark:bg-primary-900' : ''}
              >
                ☀️
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme('dark')}
                className={theme === 'dark' ? 'bg-primary-100 dark:bg-primary-900' : ''}
              >
                🌙
              </Button>
            </div>

            {/* User Menu or Login */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/submit">
                  <Button variant="primary" size="sm">
                    Submit Clip
                  </Button>
                </Link>
                <UserMenu />
              </div>
            ) : (
              <Link to="/login" className="hidden md:block">
                <Button variant="primary" size="sm">
                  Login
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-2 mb-4">
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  Hot
                </Button>
              </Link>
              <Link to="/new" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  New
                </Button>
              </Link>
              <Link to="/top" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  Top
                </Button>
              </Link>
              <Link to="/rising" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  Rising
                </Button>
              </Link>
            </nav>

            <form onSubmit={handleSearch} className="mb-4">
              <Input
                type="search"
                placeholder="Search clips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>

            {isAuthenticated ? (
              <div className="flex flex-col gap-2">
                <Link to="/submit" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Submit Clip
                  </Button>
                </Link>
                <Link to="/favorites" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    Favorites
                  </Button>
                </Link>
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    Profile
                  </Button>
                </Link>
                <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    Settings
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-error-600"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" size="sm" className="w-full">
                  Login
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

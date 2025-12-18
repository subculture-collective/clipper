import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { checkTwitchAuthStatus } from '../../lib/twitch-api';

export interface TwitchChatEmbedProps {
  channel: string;
  position?: 'side' | 'bottom';
}

export function TwitchChatEmbed({ channel, position = 'side' }: TwitchChatEmbedProps) {
  const [showChat, setShowChat] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { isAuthenticated: isUserLoggedIn } = useAuth();

  useEffect(() => {
    if (isUserLoggedIn) {
      checkAuth();
    } else {
      setIsCheckingAuth(false);
      setIsAuthenticated(false);
    }
  }, [isUserLoggedIn]);

  const checkAuth = async () => {
    try {
      const status = await checkTwitchAuthStatus();
      setIsAuthenticated(status.authenticated);
    } catch (error) {
      console.error('Failed to check Twitch auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleTwitchLogin = () => {
    // Redirect to backend OAuth endpoint
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
    window.location.href = `${apiBaseUrl}/twitch/oauth/authorize`;
  };

  const containerClasses = position === 'bottom'
    ? 'w-full h-96 mt-4'
    : 'w-full h-full min-h-[600px]';

  return (
    <div className={`border rounded-lg overflow-hidden bg-white dark:bg-gray-800 ${containerClasses}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-gray-900 dark:text-white">Twitch Chat</h3>
          <button
            onClick={() => setShowChat(!showChat)}
            className="text-sm px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            aria-label={showChat ? 'Hide chat' : 'Show chat'}
          >
            {showChat ? '−' : '+'}
          </button>
        </div>
        
        {isUserLoggedIn && !isCheckingAuth && !isAuthenticated && (
          <button
            onClick={handleTwitchLogin}
            className="text-sm px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
          >
            Login to Chat
          </button>
        )}
        
        {isAuthenticated && (
          <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Connected
          </span>
        )}
      </div>

      {/* Chat Embed */}
      {showChat && (
        <div className="w-full h-full">
          <iframe
            src={`https://www.twitch.tv/embed/${channel}/chat?parent=${window.location.hostname}&darkpopout`}
            className="w-full h-full border-0"
            title={`${channel} Twitch Chat`}
            sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals"
          />
        </div>
      )}

      {!showChat && (
        <div className="flex items-center justify-center p-8 text-gray-500 dark:text-gray-400">
          <p>Chat is hidden</p>
        </div>
      )}
    </div>
  );
}

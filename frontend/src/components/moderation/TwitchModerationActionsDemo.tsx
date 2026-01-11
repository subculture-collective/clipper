import { useState } from 'react';
import { TwitchModerationActions } from './TwitchModerationActions';
import { useAuth } from '../../context/AuthContext';
import { Container } from '@/components';
import { Card } from '@/components/ui';

/**
 * Demo page for TwitchModerationActions component
 * 
 * This demonstrates how to integrate the Twitch ban/unban functionality
 * into your application.
 */
export function TwitchModerationActionsDemo() {
    const { user } = useAuth();
    
    // Example channel and user data
    const [channelId] = useState('12345678'); // Example Twitch broadcaster ID
    const [targetUser] = useState({
        id: 'target-user-id',
        twitch_id: '87654321',
        username: 'exampleuser',
        is_banned: false,
    });

    // Example: Check if current user is the broadcaster
    // In a real app, you'd compare the user's Twitch ID with the channel ID
    const isBroadcaster = user?.twitch_id === channelId;

    // Example: Check if current user is a Twitch moderator
    // In a real app, you'd fetch this from your backend or Twitch API
    const [isTwitchModerator] = useState(false);

    const handleSuccess = () => {
        console.log('Ban/unban action completed successfully');
        // In a real app, you would:
        // - Refresh the user's ban status
        // - Update the UI to reflect the change
        // - Show a success notification
    };

    return (
        <Container className="py-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">
                    Twitch Moderation Actions Demo
                </h1>

                <div className="space-y-6">
                    {/* Permission Status */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Permission Status</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">
                                    Logged In:
                                </span>
                                <span className={user ? 'text-green-600' : 'text-red-600'}>
                                    {user ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">
                                    Is Broadcaster:
                                </span>
                                <span className={isBroadcaster ? 'text-green-600' : 'text-gray-600'}>
                                    {isBroadcaster ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">
                                    Is Twitch Moderator:
                                </span>
                                <span className={isTwitchModerator ? 'text-green-600' : 'text-gray-600'}>
                                    {isTwitchModerator ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">
                                    Site Moderator:
                                </span>
                                <span className={user?.role === 'moderator' ? 'text-orange-600' : 'text-gray-600'}>
                                    {user?.role === 'moderator' ? 'Yes (View Only)' : 'No'}
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Target User Card */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Target User</h2>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">{targetUser.username}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Twitch ID: {targetUser.twitch_id}
                                    </p>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`text-sm px-3 py-1 rounded-full ${
                                            targetUser.is_banned
                                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                        }`}
                                    >
                                        {targetUser.is_banned ? 'Banned' : 'Active'}
                                    </span>
                                </div>
                            </div>

                            {/* Moderation Actions */}
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Moderation Actions
                                    </div>
                                    
                                    <TwitchModerationActions
                                        broadcasterID={channelId}
                                        userID={targetUser.twitch_id}
                                        username={targetUser.username}
                                        isBanned={targetUser.is_banned}
                                        isBroadcaster={isBroadcaster}
                                        isTwitchModerator={isTwitchModerator}
                                        onSuccess={handleSuccess}
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Instructions */}
                    <Card className="p-6 bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                        <h2 className="text-xl font-semibold mb-4 text-blue-900 dark:text-blue-400">
                            Instructions
                        </h2>
                        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                            <p>
                                <strong>To see the buttons:</strong> You must be logged in and either:
                            </p>
                            <ul className="list-disc list-inside ml-4 space-y-1">
                                <li>Be the broadcaster (your Twitch ID matches the channel ID)</li>
                                <li>Be a Twitch-recognized moderator for this channel</li>
                            </ul>
                            <p className="pt-2">
                                <strong>Note:</strong> Site moderators are view-only and cannot perform Twitch actions.
                            </p>
                            <p className="pt-2">
                                This demo uses example IDs. In a real application, these would come from:
                            </p>
                            <ul className="list-disc list-inside ml-4 space-y-1">
                                <li>The Twitch channel you're viewing</li>
                                <li>The user's Twitch profile</li>
                                <li>Your backend API or Twitch API</li>
                            </ul>
                        </div>
                    </Card>

                    {/* Integration Example */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Integration Example</h2>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
{`import { TwitchModerationActions } from '@/components/moderation';

function UserCard({ user, channelId }) {
  const { user: currentUser } = useAuth();
  
  const isBroadcaster = currentUser?.twitch_id === channelId;
  const isTwitchModerator = false; // Fetch from API
  
  return (
    <div>
      <h3>{user.username}</h3>
      
      <TwitchModerationActions
        broadcasterID={channelId}
        userID={user.twitch_id}
        username={user.username}
        isBanned={user.is_banned_on_twitch}
        isBroadcaster={isBroadcaster}
        isTwitchModerator={isTwitchModerator}
        onSuccess={() => {
          // Refresh data
          queryClient.invalidateQueries(['user', user.id]);
        }}
      />
    </div>
  );
}`}
                        </pre>
                    </Card>
                </div>
            </div>
        </Container>
    );
}

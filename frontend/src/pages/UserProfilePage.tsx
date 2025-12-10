import { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Container, Spinner, SEO, Button } from '../components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { 
    fetchUserProfile, 
    fetchUserClips, 
    fetchUserActivity, 
    fetchUserFollowers, 
    fetchUserFollowing,
    followUser,
    unfollowUser,
    type UserProfile
} from '../lib/user-api';
import { UserPlus, UserMinus, Calendar } from 'lucide-react';
import { ClipCard } from '../components/clip';

type TabType = 'clips' | 'activity' | 'followers' | 'following';

export function UserProfilePage() {
    const { username } = useParams<{ username: string }>();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('clips');
    const queryClient = useQueryClient();

    // First fetch user by username to get ID
    const { data: basicUserData, isLoading: isLoadingBasic } = useQuery({
        queryKey: ['user-by-username', username],
        queryFn: async () => {
            const response = await api.get<{ success: boolean; data: UserProfile }>(
                `/api/v1/users/by-username/${username}`
            );
            return response.data.data;
        },
        enabled: !!username,
    });

    // Then fetch full profile with stats
    const { data: userData, isLoading, error } = useQuery({
        queryKey: ['user-profile', basicUserData?.id],
        queryFn: () => fetchUserProfile(basicUserData!.id),
        enabled: !!basicUserData?.id,
    });

    // If viewing own profile, redirect to /profile
    if (user && user.username === username) {
        return <Navigate to="/profile" replace />;
    }

    // Follow/unfollow mutation
    const followMutation = useMutation({
        mutationFn: (userId: string) => followUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-profile', basicUserData?.id] });
        },
    });

    const unfollowMutation = useMutation({
        mutationFn: (userId: string) => unfollowUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-profile', basicUserData?.id] });
        },
    });

    // Fetch data based on active tab
    const { data: clipsData } = useQuery({
        queryKey: ['user-clips', basicUserData?.id, 1],
        queryFn: () => fetchUserClips(basicUserData!.id, 1, 20),
        enabled: !!basicUserData?.id && activeTab === 'clips',
    });

    const { data: activityData } = useQuery({
        queryKey: ['user-activity', basicUserData?.id, 1],
        queryFn: () => fetchUserActivity(basicUserData!.id, 1, 20),
        enabled: !!basicUserData?.id && activeTab === 'activity',
    });

    const { data: followersData } = useQuery({
        queryKey: ['user-followers', basicUserData?.id, 1],
        queryFn: () => fetchUserFollowers(basicUserData!.id, 1, 20),
        enabled: !!basicUserData?.id && activeTab === 'followers',
    });

    const { data: followingData } = useQuery({
        queryKey: ['user-following', basicUserData?.id, 1],
        queryFn: () => fetchUserFollowing(basicUserData!.id, 1, 20),
        enabled: !!basicUserData?.id && activeTab === 'following',
    });

    if (isLoadingBasic || isLoading) {
        return (
            <>
                <SEO title="Loading Profile..." noindex />
                <Container className="py-8">
                    <div className="flex justify-center items-center min-h-[400px]">
                        <Spinner size="lg" />
                    </div>
                </Container>
            </>
        );
    }

    if (error || !userData) {
        return (
            <>
                <SEO title="User Not Found" noindex />
                <Container className="py-8">
                    <div className="text-center py-12">
                        <h2 className="text-2xl font-bold mb-4">User Not Found</h2>
                        <p className="text-muted-foreground">
                            The user profile you're looking for doesn't exist.
                        </p>
                    </div>
                </Container>
            </>
        );
    }

    const handleFollowToggle = () => {
        if (userData.is_following) {
            unfollowMutation.mutate(userData.id);
        } else {
            followMutation.mutate(userData.id);
        }
    };

    return (
        <>
            <SEO 
                title={`${userData.display_name} (@${userData.username})`}
                description={userData.bio || `View ${userData.display_name}'s profile on clpr`}
            />
            <Container className="py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Profile Header */}
                    <div className="bg-card border border-border rounded-xl p-6 mb-6">
                        <div className="flex items-start gap-4">
                            {userData.avatar_url && (
                                <img
                                    src={userData.avatar_url}
                                    alt={userData.display_name}
                                    className="w-20 h-20 rounded-full"
                                />
                            )}
                            <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h1 className="text-2xl font-bold mb-1">{userData.display_name}</h1>
                                        <p className="text-muted-foreground">@{userData.username}</p>
                                    </div>
                                    {user && user.id !== userData.id && (
                                        <Button
                                            onClick={handleFollowToggle}
                                            variant={userData.is_following ? 'outline' : 'default'}
                                            size="sm"
                                            disabled={followMutation.isPending || unfollowMutation.isPending}
                                        >
                                            {userData.is_following ? (
                                                <>
                                                    <UserMinus className="w-4 h-4 mr-2" />
                                                    Unfollow
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="w-4 h-4 mr-2" />
                                                    Follow
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                                {userData.bio && (
                                    <p className="text-sm mb-4">{userData.bio}</p>
                                )}
                                <div className="flex gap-6 text-sm">
                                    <div>
                                        <span className="font-semibold">{userData.stats.clips_submitted}</span>
                                        <span className="text-muted-foreground ml-1">Clips</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold">{userData.follower_count}</span>
                                        <span className="text-muted-foreground ml-1">Followers</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold">{userData.following_count}</span>
                                        <span className="text-muted-foreground ml-1">Following</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold">{userData.karma_points}</span>
                                        <span className="text-muted-foreground ml-1">Karma</span>
                                    </div>
                                    <div className="flex items-center text-muted-foreground">
                                        <Calendar className="w-4 h-4 mr-1" />
                                        Joined {new Date(userData.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-border mb-6">
                        <nav className="flex gap-6">
                            <button
                                onClick={() => setActiveTab('clips')}
                                className={`pb-3 border-b-2 transition-colors ${
                                    activeTab === 'clips'
                                        ? 'border-primary text-foreground font-medium'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Clips
                            </button>
                            <button
                                onClick={() => setActiveTab('activity')}
                                className={`pb-3 border-b-2 transition-colors ${
                                    activeTab === 'activity'
                                        ? 'border-primary text-foreground font-medium'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Activity
                            </button>
                            <button
                                onClick={() => setActiveTab('followers')}
                                className={`pb-3 border-b-2 transition-colors ${
                                    activeTab === 'followers'
                                        ? 'border-primary text-foreground font-medium'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Followers ({userData.follower_count})
                            </button>
                            <button
                                onClick={() => setActiveTab('following')}
                                className={`pb-3 border-b-2 transition-colors ${
                                    activeTab === 'following'
                                        ? 'border-primary text-foreground font-medium'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Following ({userData.following_count})
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'clips' && (
                        <div>
                            {clipsData && clipsData.clips.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {clipsData.clips.map((clip) => (
                                        <ClipCard key={clip.id} clip={clip} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    No clips submitted yet.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div>
                            {activityData && activityData.data.length > 0 ? (
                                <div className="space-y-4">
                                    {activityData.data.map((activity) => (
                                        <div key={activity.id} className="bg-card border border-border rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                {activity.user_avatar && (
                                                    <img
                                                        src={activity.user_avatar}
                                                        alt={activity.username}
                                                        className="w-10 h-10 rounded-full"
                                                    />
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-sm">
                                                        <span className="font-semibold">{activity.username}</span>
                                                        {' '}
                                                        {activity.activity_type === 'clip_submitted' && 'submitted a clip'}
                                                        {activity.activity_type === 'upvote' && 'upvoted a clip'}
                                                        {activity.activity_type === 'comment' && 'commented'}
                                                        {activity.activity_type === 'user_followed' && 'followed a user'}
                                                    </p>
                                                    {activity.clip_title && (
                                                        <Link
                                                            to={`/clip/${activity.clip_id}`}
                                                            className="text-primary hover:underline text-sm mt-1 block"
                                                        >
                                                            {activity.clip_title}
                                                        </Link>
                                                    )}
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {new Date(activity.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    No recent activity.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'followers' && (
                        <div>
                            {followersData && followersData.data.length > 0 ? (
                                <div className="space-y-4">
                                    {followersData.data.map((follower) => (
                                        <div key={follower.id} className="bg-card border border-border rounded-lg p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {follower.avatar_url && (
                                                        <img
                                                            src={follower.avatar_url}
                                                            alt={follower.display_name}
                                                            className="w-12 h-12 rounded-full"
                                                        />
                                                    )}
                                                    <div>
                                                        <Link
                                                            to={`/user/${follower.username}`}
                                                            className="font-semibold hover:text-primary"
                                                        >
                                                            {follower.display_name}
                                                        </Link>
                                                        <p className="text-sm text-muted-foreground">
                                                            @{follower.username}
                                                        </p>
                                                        {follower.bio && (
                                                            <p className="text-sm mt-1">{follower.bio}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    No followers yet.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'following' && (
                        <div>
                            {followingData && followingData.data.length > 0 ? (
                                <div className="space-y-4">
                                    {followingData.data.map((followedUser) => (
                                        <div key={followedUser.id} className="bg-card border border-border rounded-lg p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {followedUser.avatar_url && (
                                                        <img
                                                            src={followedUser.avatar_url}
                                                            alt={followedUser.display_name}
                                                            className="w-12 h-12 rounded-full"
                                                        />
                                                    )}
                                                    <div>
                                                        <Link
                                                            to={`/user/${followedUser.username}`}
                                                            className="font-semibold hover:text-primary"
                                                        >
                                                            {followedUser.display_name}
                                                        </Link>
                                                        <p className="text-sm text-muted-foreground">
                                                            @{followedUser.username}
                                                        </p>
                                                        {followedUser.bio && (
                                                            <p className="text-sm mt-1">{followedUser.bio}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    Not following anyone yet.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Container>
        </>
    );
}

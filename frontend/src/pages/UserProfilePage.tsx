import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Container, Spinner, SEO } from '../components';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

interface UserProfileData {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    bio?: string;
    karma_points: number;
    role: string;
    created_at: string;
}

export function UserProfilePage() {
    const { username } = useParams<{ username: string }>();
    const { user } = useAuth();

    // If viewing own profile, redirect to /profile
    if (user && user.username === username) {
        return <Navigate to="/profile" replace />;
    }

    // Fetch public user data
    const { data: userData, isLoading, error } = useQuery({
        queryKey: ['user-profile', username],
        queryFn: async () => {
            const response = await api.get<{ success: boolean; data: UserProfileData }>(
                `/api/v1/users/by-username/${username}`
            );
            return response.data.data;
        },
        enabled: !!username,
    });

    if (isLoading) {
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

    return (
        <>
            <SEO 
                title={`${userData.display_name} (@${userData.username})`}
                description={userData.bio || `View ${userData.display_name}'s profile on Clipper`}
            />
            <Container className="py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-card border-border rounded-xl p-6 mb-6">
                        <div className="flex items-start gap-4">
                            {userData.avatar_url && (
                                <img
                                    src={userData.avatar_url}
                                    alt={userData.display_name}
                                    className="w-20 h-20 rounded-full"
                                />
                            )}
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold mb-1">{userData.display_name}</h1>
                                <p className="text-muted-foreground mb-2">@{userData.username}</p>
                                {userData.bio && (
                                    <p className="text-sm mb-4">{userData.bio}</p>
                                )}
                                <div className="flex gap-4 text-sm">
                                    <div>
                                        <span className="font-semibold">{userData.karma_points}</span>
                                        <span className="text-muted-foreground ml-1">Karma</span>
                                    </div>
                                    <div className="text-muted-foreground">
                                        Joined {new Date(userData.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="text-center text-muted-foreground py-8">
                        <p>Full user activity history and statistics coming soon.</p>
                        <p className="text-sm mt-2">
                            For now, you can see clips submitted by this user in the feed.
                        </p>
                    </div>
                </div>
            </Container>
        </>
    );
}

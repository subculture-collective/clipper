import { useState } from 'react';
import { Container } from '../../components';
import { ModeratorManager } from '../../components/moderation';
import { useAuth } from '../../context/AuthContext';

/**
 * Admin page for managing site moderators
 * 
 * This page allows admins to:
 * - Create new moderators with permission selection
 * - View all moderators
 * - Remove moderators
 * - Update moderator permissions
 * - Send invitation emails to new moderators
 */
export function AdminModeratorsPage() {
    const { user } = useAuth();
    const [selectedChannelId] = useState<string>('site'); // Default to site-level moderation
    
    // Check if user is admin
    const isAdmin = user?.role === 'admin';

    return (
        <Container className='py-4 xs:py-6 md:py-8'>
            <div className="mb-6">
                <h1 className='text-2xl xs:text-3xl font-bold mb-2'>
                    Moderator Management
                </h1>
                <p className="text-muted-foreground">
                    Create and manage moderators for the platform. Assign permissions and track moderator activity.
                </p>
            </div>

            {!isAdmin ? (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                    <p className="font-medium">Access Denied</p>
                    <p className="text-sm mt-1">You must be an admin to access this page.</p>
                </div>
            ) : (
                <ModeratorManager 
                    channelId={selectedChannelId}
                    canManage={true}
                />
            )}
        </Container>
    );
}

export default AdminModeratorsPage;

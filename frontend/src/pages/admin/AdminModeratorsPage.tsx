import { Container } from '../../components';
import { ModeratorManager } from '../../components/moderation';

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

            <ModeratorManager 
                channelId="site"
                canManage={true}
            />
        </Container>
    );
}

export default AdminModeratorsPage;

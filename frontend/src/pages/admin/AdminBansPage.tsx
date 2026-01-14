import { useState } from 'react';
import { Container, Button } from '../../components';
import { BanListViewer, SyncBansModal } from '../../components/moderation';
import { useAuth } from '../../context/AuthContext';

/**
 * Admin page for managing bans
 * 
 * This page allows moderators and admins to:
 * - View all active and expired bans
 * - Sync bans from Twitch
 * - Revoke bans (if permitted)
 * - Filter and search bans
 * 
 * Permission Requirements:
 * - Must be a moderator or admin (enforced by AdminRoute)
 */
export function AdminBansPage() {
    const { isModeratorOrAdmin } = useAuth();
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleSyncSuccess = () => {
        setShowSyncModal(false);
        // Trigger a refresh of the ban list
        setRefreshKey((prev) => prev + 1);
    };

    return (
        <Container className="py-4 xs:py-6 md:py-8">
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl xs:text-3xl font-bold mb-2">Ban Management</h1>
                        <p className="text-muted-foreground">
                            View and manage bans across the platform. Sync bans from Twitch channels.
                        </p>
                    </div>
                    {isModeratorOrAdmin && (
                        <Button
                            onClick={() => setShowSyncModal(true)}
                            variant="primary"
                            className="self-start sm:self-auto"
                        >
                            Sync Bans
                        </Button>
                    )}
                </div>
            </div>

            <BanListViewer
                key={refreshKey}
                channelId="site"
                canManage={isModeratorOrAdmin}
            />

            <SyncBansModal
                open={showSyncModal}
                onClose={() => setShowSyncModal(false)}
                channelId="site"
                onSuccess={handleSyncSuccess}
            />
        </Container>
    );
}

export default AdminBansPage;

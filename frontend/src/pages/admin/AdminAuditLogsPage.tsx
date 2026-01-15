import { Container } from '../../components';
import { AuditLogViewer } from '../../components/moderation';

/**
 * Admin page for viewing audit logs
 * 
 * This page allows moderators and admins to:
 * - View moderation actions and audit trails
 * - Filter logs by actor, action, target, and date range
 * - Search audit logs
 * - Export logs to CSV
 * 
 * Permission Requirements:
 * - Must be a moderator or admin (enforced by AdminRoute)
 */
export function AdminAuditLogsPage() {
    return (
        <Container className="py-4 xs:py-6 md:py-8">
            <div className="mb-6">
                <h1 className="text-2xl xs:text-3xl font-bold mb-2">Audit Logs</h1>
                <p className="text-muted-foreground">
                    View and search moderation actions and system audit trails.
                </p>
            </div>

            <AuditLogViewer />
        </Container>
    );
}

export default AdminAuditLogsPage;

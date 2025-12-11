<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
    - [Design Principles](#design-principles)
  - [Roles](#roles)
    - [User (Default)](#user-default)
    - [Moderator](#moderator)
    - [Admin](#admin)
  - [Role Matrix](#role-matrix)
  - [Backend Implementation](#backend-implementation)
    - [Role Constants](#role-constants)
    - [Middleware](#middleware)
    - [Route Protection](#route-protection)
    - [JWT Claims](#jwt-claims)
  - [Frontend Implementation](#frontend-implementation)
    - [Type Definitions](#type-definitions)
    - [Auth Context](#auth-context)
    - [Route Guards](#route-guards)
    - [Conditional Rendering](#conditional-rendering)
    - [403 Forbidden State](#403-forbidden-state)
  - [Audit Logging](#audit-logging)
    - [Logged Actions](#logged-actions)
    - [Audit Log Structure](#audit-log-structure)
    - [Viewing Audit Logs](#viewing-audit-logs)
  - [Local Development Setup](#local-development-setup)
    - [Setting Up Admin/Moderator Users](#setting-up-adminmoderator-users)
    - [Seeding Test Moderators](#seeding-test-moderators)
  - [Production User Management](#production-user-management)
    - [Promoting Users to Moderator/Admin](#promoting-users-to-moderatoradmin)
    - [Best Practices](#best-practices)
    - [Revoking Access](#revoking-access)
  - [Security Considerations](#security-considerations)
  - [Troubleshooting](#troubleshooting)
    - [User Can't Access Admin Panel](#user-cant-access-admin-panel)
    - [403 Forbidden Error](#403-forbidden-error)
    - [Audit Logs Not Appearing](#audit-logs-not-appearing)
  - [Future Enhancements](#future-enhancements)
  - [Related Documentation](#related-documentation)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Role-Based Access Control (RBAC)"
summary: "User roles, permissions, and access control configuration."
tags: ["backend", "rbac", "security", "permissions"]
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["rbac", "roles", "permissions", "access control"]
---

# Role-Based Access Control (RBAC)

This document describes the role-based access control system in Clipper, including roles, permissions, and how to configure user access.

## Table of Contents

- [Overview](#overview)
- [Roles](#roles)
- [Role Matrix](#role-matrix)
- [Backend Implementation](#backend-implementation)
- [Frontend Implementation](#frontend-implementation)
- [Audit Logging](#audit-logging)
- [Local Development Setup](#local-development-setup)
- [Production User Management](#production-user-management)

## Overview

Clipper uses a role-based access control system to manage user permissions. Each user is assigned a single role that determines their level of access to various features and administrative functions.

### Design Principles

1. **Single Role Assignment**: Each user has exactly one role at a time
2. **Hierarchical Permissions**: Higher roles include all permissions of lower roles
3. **Backend Enforcement**: All authorization checks are enforced server-side
4. **Frontend Enhancement**: UI adapts based on user role for better UX
5. **Audit Trail**: All administrative actions are logged

## Roles

### User (Default)

The standard role assigned to all registered users.

**Permissions:**

- View and search clips
- Vote on clips and comments
- Comment on clips
- Submit clips for moderation
- Manage own profile and settings
- Add clips to favorites
- View leaderboards and analytics

### Moderator

Trusted community members who help moderate content.

**Permissions:**

- All User permissions, plus:
- Access moderation queue
- Approve/reject clip submissions
- Review and action reports
- Remove inappropriate content (clips and comments)
- View audit logs
- Manage tags

**Restrictions:**

- Cannot ban users
- Cannot manage other moderators
- Cannot access full admin analytics

### Admin

Full administrative access to the platform.

**Permissions:**

- All Moderator permissions, plus:
- User management (ban, unban, change roles)
- Full platform analytics
- Sync management (trigger clip syncs)
- System configuration
- All CRUD operations on content

## Role Matrix

| Feature | User | Moderator | Admin |
|---------|------|-----------|-------|
| View clips | ✅ | ✅ | ✅ |
| Vote on content | ✅ | ✅ | ✅ |
| Submit clips | ✅ | ✅ | ✅ |
| Comment | ✅ | ✅ | ✅ |
| **Moderation** | | | |
| Access admin panel | ❌ | ✅ | ✅ |
| View moderation queue | ❌ | ✅ | ✅ |
| Approve/reject submissions | ❌ | ✅ | ✅ |
| Remove content | ❌ | ✅ | ✅ |
| View reports | ❌ | ✅ | ✅ |
| Action reports | ❌ | ✅ | ✅ |
| View audit logs | ❌ | ✅ | ✅ |
| **Administration** | | | |
| Manage users | ❌ | ❌ | ✅ |
| Ban/unban users | ❌ | ❌ | ✅ |
| Change user roles | ❌ | ❌ | ✅ |
| Trigger clip sync | ❌ | ❌ | ✅ |
| View full analytics | ❌ | ❌ | ✅ |
| Manage tags | ❌ | ✅ | ✅ |
| Delete clips | ❌ | ❌ | ✅ |

## Backend Implementation

### Role Constants

Roles are defined as string constants in the database and Go code:

```go
const (
    RoleUser      = "user"
    RoleModerator = "moderator"
    RoleAdmin     = "admin"
)
```

### Middleware

The backend uses middleware to enforce role-based access:

#### AuthMiddleware

Validates JWT token and attaches user information to the request context.

```go
clips.POST("/:id/favorite", middleware.AuthMiddleware(authService), clipHandler.AddFavorite)
```

#### RequireRole

Checks if the authenticated user has one of the required roles.

```go
admin.Use(middleware.RequireRole("admin", "moderator"))
```

### Route Protection

Admin routes are grouped and protected:

```go
admin := v1.Group("/admin")
admin.Use(middleware.AuthMiddleware(authService))
admin.Use(middleware.RequireRole("admin", "moderator"))
{
    // Admin-only endpoints
    adminTags.DELETE("/:id", middleware.RequireRole("admin"), tagHandler.DeleteTag)

    // Moderator + Admin endpoints
    adminSubmissions.POST("/:id/approve", submissionHandler.ApproveSubmission)
}
```

### JWT Claims

User role is included in JWT tokens:

```go
type Claims struct {
    UserID   uuid.UUID `json:"user_id"`
    Username string    `json:"username"`
    Role     string    `json:"role"`
    jwt.RegisteredClaims
}
```

## Frontend Implementation

### Type Definitions

```typescript
export interface User {
  id: string;
  username: string;
  display_name: string;
  role: 'user' | 'admin' | 'moderator';
  // ... other fields
}
```

### Auth Context

The AuthContext provides role checking utilities:

```typescript
const { user, isAuthenticated, isAdmin } = useAuth();

// isAdmin is true for both 'admin' and 'moderator' roles
const isAdmin = user?.role === 'admin' || user?.role === 'moderator';
```

### Route Guards

#### ProtectedRoute

Requires authentication but no specific role.

```typescript
<Route path="/favorites" element={
  <ProtectedRoute>
    <FavoritesPage />
  </ProtectedRoute>
} />
```

#### AdminRoute

Requires admin or moderator role.

```typescript
<Route path="/admin/dashboard" element={
  <AdminRoute>
    <AdminDashboard />
  </AdminRoute>
} />
```

### Conditional Rendering

UI elements are conditionally rendered based on user role:

```typescript
{isAdmin && (
  <Link to="/admin/dashboard">
    🛡️ Admin Panel
  </Link>
)}
```

### 403 Forbidden State

The AdminRoute guard shows a 403 error when a user without proper permissions tries to access an admin route:

```typescript
if (!isAdmin) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-error-500 mb-4">403</h1>
        <p className="text-xl text-muted-foreground">Access Denied</p>
        <p className="text-muted-foreground mt-2">
          You don't have permission to access this page.
        </p>
      </div>
    </div>
  );
}
```

## Audit Logging

All moderation actions are automatically logged to the `moderation_audit_logs` table.

### Logged Actions

- `approve` - Clip submission approved
- `reject` - Clip submission rejected
- `bulk_approve` - Multiple submissions approved
- `bulk_reject` - Multiple submissions rejected
- `remove_content` - Content removed (clip/comment)
- `ban_user` - User banned
- `unban_user` - User unbanned

### Audit Log Structure

```go
type ModerationAuditLog struct {
    ID          uuid.UUID              `json:"id"`
    Action      string                 `json:"action"`
    EntityType  string                 `json:"entity_type"`
    EntityID    uuid.UUID              `json:"entity_id"`
    ModeratorID uuid.UUID              `json:"moderator_id"`
    Reason      *string                `json:"reason,omitempty"`
    Metadata    map[string]interface{} `json:"metadata,omitempty"`
    CreatedAt   time.Time              `json:"created_at"`
}
```

### Viewing Audit Logs

Moderators and admins can view audit logs:

```bash
GET /api/v1/admin/audit-logs?page=1&limit=50
GET /api/v1/admin/audit-logs?moderator_id=<uuid>
GET /api/v1/admin/audit-logs?action=approve
GET /api/v1/admin/audit-logs/export  # CSV export
```

## Local Development Setup

### Setting Up Admin/Moderator Users

For local development, you can assign roles directly in the database or use the provided setup script.

#### Option 1: Direct Database Update

1. Start your local development environment:

   ```bash
   make dev
   ```

2. Connect to the database:

   ```bash
   docker exec -it clipper-postgres psql -U clipper -d clipper
   ```

3. Update a user's role:

   ```sql
   -- Make user an admin
   UPDATE users SET role = 'admin' WHERE username = 'your_username';

   -- Make user a moderator
   UPDATE users SET role = 'moderator' WHERE username = 'your_username';

   -- Verify the change
   SELECT id, username, role FROM users WHERE username = 'your_username';
   ```

#### Option 2: Using the Setup Script

Create a script to bootstrap admin users:

```bash
# scripts/setup-admin.sh
#!/bin/bash

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-clipper}"
DB_USER="${DB_USER:-clipper}"

if [ -z "$1" ]; then
    echo "Usage: ./scripts/setup-admin.sh <username> [role]"
    echo "Role can be: admin, moderator (default: admin)"
    exit 1
fi

USERNAME=$1
ROLE=${2:-admin}

docker exec -i clipper-postgres psql -U $DB_USER -d $DB_NAME -v role="$ROLE" -v username="$USERNAME" <<EOF
UPDATE users SET role = :'role' WHERE username = :'username';
SELECT username, role FROM users WHERE username = :'username';
EOF
```

Usage:

```bash
chmod +x scripts/setup-admin.sh
./scripts/setup-admin.sh your_username admin
./scripts/setup-admin.sh moderator_username moderator
```

### Seeding Test Moderators

Add test moderators to your seed data in `backend/migrations/seed.sql`:

```sql
-- Update seed users with different roles
UPDATE users SET role = 'admin' WHERE username = 'admin_user';
UPDATE users SET role = 'moderator' WHERE username = 'mod_user';
```

## Production User Management

### Promoting Users to Moderator/Admin

⚠️ **Security Note**: Only trusted individuals should be granted moderator or admin roles.

#### Via Direct Database Access

```sql
-- Promote user to moderator
UPDATE users SET role = 'moderator' WHERE username = 'trusted_user';

-- Promote user to admin
UPDATE users SET role = 'admin' WHERE username = 'trusted_admin';

-- Verify
SELECT id, username, display_name, role, created_at
FROM users
WHERE role IN ('admin', 'moderator')
ORDER BY role, created_at;
```

#### Via Admin API (Future Enhancement)

A future enhancement could add an admin API endpoint:

```bash
PUT /api/v1/admin/users/:id/role
{
  "role": "moderator",
  "reason": "Promoted to moderator for consistent community contributions"
}
```

This would automatically create an audit log entry for the role change.

### Best Practices

1. **Principle of Least Privilege**: Grant the minimum role necessary
2. **Regular Reviews**: Periodically review users with elevated privileges
3. **Audit Monitoring**: Review audit logs regularly for suspicious activity
4. **Revocation**: Promptly revoke access when no longer needed
5. **Documentation**: Keep records of why users were granted elevated roles

### Revoking Access

```sql
-- Demote user back to regular user
UPDATE users SET role = 'user' WHERE username = 'former_moderator';
```

## Security Considerations

1. **Never Trust Client**: Always validate roles on the backend
2. **JWT Security**: Role claims in JWT are signed and tamper-proof
3. **Token Expiry**: Access tokens expire and must be refreshed
4. **HTTPS Only**: All authentication and authorization over HTTPS in production
5. **Audit Everything**: All moderation actions are logged
6. **Rate Limiting**: Admin endpoints are rate-limited to prevent abuse

## Troubleshooting

### User Can't Access Admin Panel

1. Verify user role in database:

   ```sql
   SELECT username, role FROM users WHERE username = 'username';
   ```

2. Check if JWT token includes role:
   - Decode the JWT token (use jwt.io)
   - Verify the `role` claim is present and correct

3. Clear browser cache and cookies, then login again

### 403 Forbidden Error

- User role doesn't meet route requirements
- JWT token may be stale - try logging out and back in
- Check browser console for detailed error messages

### Audit Logs Not Appearing

- Verify the `auditLogService` is injected into services
- Check that moderation actions call the audit log service
- Query database directly:

  ```sql
  SELECT * FROM moderation_audit_logs
  ORDER BY created_at DESC
  LIMIT 10;
  ```

## Future Enhancements

Potential future improvements to the RBAC system:

1. **Content Curator Role**: Read-only access to admin features
2. **Granular Permissions**: Move from roles to permission-based system
3. **Team Management**: Organize moderators into teams
4. **Role Expiry**: Time-limited moderator access
5. **2FA for Admins**: Require two-factor authentication for admin role
6. **Role History**: Track role changes over time
7. **Admin API**: Self-service role management through admin UI

## Related Documentation

- [Authentication](./AUTHENTICATION.md) - Authentication flow and JWT
- [User Guide](./user-guide.md) - User-facing documentation
- [API Documentation](./API.md) - API endpoint reference
- [Database Schema](./DATABASE-SCHEMA.md) - Database structure
- [Moderation System](./MODERATION_SYSTEM_SUMMARY.md) - Moderation features

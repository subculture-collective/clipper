/**
 * User role constants
 * These should match the backend role definitions
 */
export const USER_ROLES = {
    USER: 'user',
    MODERATOR: 'moderator',
    ADMIN: 'admin',
};
/**
 * Check if a role string is a valid user role
 */
export function isValidRole(role) {
    return Object.values(USER_ROLES).includes(role);
}
/**
 * Check if a user has a specific role
 */
export function hasRole(userRole, requiredRole) {
    return userRole === requiredRole;
}
/**
 * Check if a user has any of the specified roles
 */
export function hasAnyRole(userRole, requiredRoles) {
    if (!userRole)
        return false;
    return requiredRoles.includes(userRole);
}
/**
 * Check if a user is an admin
 */
export function isAdmin(role) {
    return role === USER_ROLES.ADMIN;
}
/**
 * Check if a user is a moderator
 */
export function isModerator(role) {
    return role === USER_ROLES.MODERATOR;
}
/**
 * Check if a user is a moderator or admin
 */
export function isModeratorOrAdmin(role) {
    return role === USER_ROLES.MODERATOR || role === USER_ROLES.ADMIN;
}
/**
 * Get a display name for a role
 */
export function getRoleDisplayName(role) {
    switch (role) {
        case USER_ROLES.ADMIN:
            return 'Admin';
        case USER_ROLES.MODERATOR:
            return 'Moderator';
        case USER_ROLES.USER:
            return 'User';
        default:
            return 'Unknown';
    }
}
/**
 * Get a role badge color
 */
export function getRoleBadgeColor(role) {
    switch (role) {
        case USER_ROLES.ADMIN:
            return 'bg-error-500 text-white';
        case USER_ROLES.MODERATOR:
            return 'bg-warning-500 text-white';
        case USER_ROLES.USER:
            return 'bg-muted text-muted-foreground';
        default:
            return 'bg-muted text-muted-foreground';
    }
}

import React from 'react';
import { Badge } from '@/components/ui';
import { USER_ROLES, type UserRole, getRoleDisplayName } from '@/lib/roles';

export interface UserRoleBadgeProps {
  /**
   * The user's role
   */
  role: UserRole | 'creator' | 'member';
  /**
   * Size of the badge
   * @default 'sm'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to show a tooltip with role permissions
   * @default true
   */
  showTooltip?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Get the badge variant for a role
 */
function getRoleBadgeVariant(role: UserRole | 'creator' | 'member'): 'error' | 'warning' | 'primary' | 'default' {
  switch (role) {
    case USER_ROLES.ADMIN:
      return 'error';
    case USER_ROLES.MODERATOR:
      return 'warning';
    case 'creator':
      return 'primary';
    case USER_ROLES.USER:
    case 'member':
    default:
      return 'default';
  }
}

/**
 * Get the display label for a role
 */
function getRoleLabel(role: UserRole | 'creator' | 'member'): string {
  if (role === 'creator') {
    return 'Creator';
  }
  if (role === 'member') {
    return 'Member';
  }
  return getRoleDisplayName(role);
}

/**
 * Get the tooltip text for a role
 */
function getRoleTooltip(role: UserRole | 'creator' | 'member'): string {
  switch (role) {
    case USER_ROLES.ADMIN:
      return 'Administrator - Full access to all platform features and moderation tools';
    case USER_ROLES.MODERATOR:
      return 'Moderator - Can review submissions, manage content, and enforce community guidelines';
    case 'creator':
      return 'Content Creator - Created or submitted this clip';
    case USER_ROLES.USER:
      return 'User - Regular community member';
    case 'member':
      return 'Member - Regular community member';
    default:
      return 'Community member';
  }
}

/**
 * UserRoleBadge component for displaying user roles with consistent styling
 */
export const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({
  role,
  size = 'sm',
  showTooltip = true,
  className,
}) => {
  const variant = getRoleBadgeVariant(role);
  const label = getRoleLabel(role);
  const tooltip = getRoleTooltip(role);

  return (
    <Badge
      variant={variant}
      size={size}
      className={className}
      title={showTooltip ? tooltip : undefined}
    >
      {label}
    </Badge>
  );
};

import type { Permission, ResourceAccess, Role } from './domain';

/** Presentation-side checks for preview UI; never a substitute for API authorization. */
export const rolePermissions: Record<Role, readonly Permission[]> = {
  owner: ['org:manage', 'members:invite', 'members:manage', 'resource:create', 'resource:view', 'audit:view'],
  admin: ['members:invite', 'members:manage', 'resource:create', 'resource:view', 'audit:view'],
  member: ['resource:create', 'resource:view'],
  viewer: ['resource:view'],
};

export const roleLabels: Record<Role, string> = {
  owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer',
};
export const roleDescriptions: Record<Role, string> = {
  owner: 'Full control over the organization and access.',
  admin: 'Manage team members, access, and activity.',
  member: 'View and contribute to shared resources.',
  viewer: 'Read access to shared resources only.',
};
export const accessLabels: Record<ResourceAccess, string> = {
  everyone: 'All members', contributors: 'Members & above', administrators: 'Admins & owners',
};
export const hasPermission = (role: Role | null, permission: Permission): boolean =>
  role !== null && rolePermissions[role].includes(permission);

export const canReadResource = (role: Role | null, access: ResourceAccess): boolean => {
  if (!role || !hasPermission(role, 'resource:view')) return false;
  if (access === 'everyone') return true;
  if (access === 'contributors') return role !== 'viewer';
  return role === 'owner' || role === 'admin';
};

export const canChangeRole = (actingRole: Role | null, targetRole: Role, nextRole: Role): boolean => {
  if (!actingRole || !hasPermission(actingRole, 'members:manage')) return false;
  if (nextRole === 'owner' || targetRole === 'owner') return false;
  if (actingRole === 'admin' && (targetRole === 'admin' || nextRole === 'admin')) return false;
  return true;
};

export type Role = 'owner' | 'admin' | 'member' | 'viewer';
export type Permission = 'org:manage' | 'members:invite' | 'members:manage' | 'resource:create' | 'resource:view' | 'audit:view';
export type ResourceAccess = 'everyone' | 'contributors' | 'administrators';
export type Page = 'overview' | 'people' | 'access' | 'activity' | 'settings';

export interface User {
  id: string;
  name: string;
  email: string;
  title: string;
  color: string;
}
export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string;
  createdAt: string;
}
export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  joinedAt: string;
}
export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: Exclude<Role, 'owner'>;
  status: 'pending' | 'accepted' | 'revoked';
  invitedBy: string;
  createdAt: string;
}
export interface Resource {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  type: 'Document' | 'Application' | 'Workspace';
  access: ResourceAccess;
  createdAt: string;
}
export interface Activity {
  id: string;
  organizationId: string;
  actorId: string;
  action: string;
  detail: string;
  createdAt: string;
}
export interface MembershipView extends Membership { user: User }
export interface ResourceView extends Resource { allowed: boolean }
export interface OrganizationView extends Organization { role: Role; memberCount: number }
export interface WorkspaceSnapshot {
  currentUser: User | null;
  organization: Organization | null;
  role: Role | null;
  organizations: OrganizationView[];
  members: MembershipView[];
  invitations: Invitation[];
  resources: ResourceView[];
  activities: Activity[];
  demoUsers: User[];
  pendingInvitesCount: number;
}
export interface Database {
  users: User[];
  organizations: Organization[];
  memberships: Membership[];
  invitations: Invitation[];
  resources: Resource[];
  activities: Activity[];
  currentUserId: string | null;
  currentOrganizationId: string | null;
  schemaVersion: number;
}
export interface CreateOrganizationInput { name: string; slug: string; industry: string }
export interface InviteInput { email: string; role: Exclude<Role, 'owner'> }
export interface CreateResourceInput { title: string; description: string; type: Resource['type']; access: ResourceAccess }

import type { AccessService } from './contracts';
import type { Activity, CreateOrganizationInput, Database, Invitation, InviteInput, Membership, Resource, Role, User, WorkspaceSnapshot } from '../lib/domain';
import { canChangeRole, canReadResource, hasPermission } from '../lib/policy';
import { seedDatabase } from '../lib/seed';

const STORAGE_KEY = 'nodal.identity.preview.v1';
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 230));
const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function read(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Database;
      if (parsed.schemaVersion === 1 && Array.isArray(parsed.organizations)) return parsed;
    }
  } catch { /* localStorage can be unavailable in private modes */ }
  return seedDatabase();
}
function write(data: Database) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch { throw new Error('Browser storage is unavailable. Enable local storage to save this preview.'); }
}
function fail(message: string): never { throw new Error(message); }
function me(db: Database): User { return db.users.find(u => u.id === db.currentUserId) ?? fail('Please select a demo account first.'); }
function context(db: Database) {
  const user = me(db);
  const membership = db.memberships.find(m => m.userId === user.id && m.organizationId === db.currentOrganizationId);
  if (!membership) fail('You do not belong to this organization.');
  const organization = db.organizations.find(o => o.id === membership.organizationId);
  if (!organization) fail('Organization not found.');
  return { user, membership, organization };
}
function requirePermission(db: Database, permission: Parameters<typeof hasPermission>[1]) {
  const ctx = context(db);
  if (!hasPermission(ctx.membership.role, permission)) fail('Your role does not allow this action.');
  return ctx;
}
function log(db: Database, action: string, detail: string, orgId: string, actorId: string) {
  const event: Activity = { id: newId(), organizationId: orgId, actorId, action, detail, createdAt: now() };
  db.activities.unshift(event);
}
function getAllowedOrgs(db: Database, userId: string) {
  return db.organizations.filter(o => db.memberships.some(m => m.organizationId === o.id && m.userId === userId));
}
function validateOrg(input: CreateOrganizationInput, db: Database, excludeId?: string) {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  if (name.length < 2 || name.length > 60) fail('Organization name must be between 2 and 60 characters.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 40) fail('Use a 3–40 character URL slug with lowercase letters, numbers, and hyphens.');
  if (db.organizations.some(o => o.slug === slug && o.id !== excludeId)) fail('That workspace URL is already in use.');
  return { name, slug, industry: input.industry.trim() || 'Other' };
}
function makeInviteUser(db: Database, email: string): User {
  const existing = db.users.find(u => u.email.toLowerCase() === email);
  if (existing) return existing;
  const stem = email.split('@')[0].replace(/[._-]+/g, ' ');
  const name = stem.split(' ').filter(Boolean).map(s => s[0].toUpperCase() + s.slice(1)).join(' ') || 'New teammate';
  const user: User = { id: newId(), email, name, title: 'Team member', color: 'blue' };
  db.users.push(user);
  return user;
}

function snapshot(db: Database): WorkspaceSnapshot {
  const currentUser = db.users.find(u => u.id === db.currentUserId) ?? null;
  const demoUsers = db.users;
  const empty: WorkspaceSnapshot = { currentUser, organization: null, role: null, organizations: [], members: [], invitations: [], resources: [], activities: [], demoUsers, pendingInvitesCount: 0 };
  if (!currentUser) return empty;
  const organizations = getAllowedOrgs(db, currentUser.id).map(o => ({
    ...o,
    role: db.memberships.find(m => m.organizationId === o.id && m.userId === currentUser.id)!.role,
    memberCount: db.memberships.filter(m => m.organizationId === o.id).length,
  }));
  if (!organizations.length) return empty;
  const active = organizations.find(o => o.id === db.currentOrganizationId) ?? organizations[0];
  const role = active.role;
  const members = db.memberships.filter(m => m.organizationId === active.id).map(m => ({ ...m, user: db.users.find(u => u.id === m.userId)! }));
  return {
    currentUser, organization: active, role, organizations, members,
    invitations: hasPermission(role, 'members:invite') ? db.invitations.filter(i => i.organizationId === active.id) : [],
    resources: db.resources.filter(r => r.organizationId === active.id).map(r => ({ ...r, allowed: canReadResource(role, r.access) })),
    activities: hasPermission(role, 'audit:view') ? db.activities.filter(a => a.organizationId === active.id).slice(0, 50) : [],
    demoUsers,
    pendingInvitesCount: hasPermission(role, 'members:invite') ? db.invitations.filter(i => i.organizationId === active.id && i.status === 'pending').length : 0,
  };
}

/** Local demo adapter. It enforces policies for UX simulation, not security. */
export const mockAccessService: AccessService = {
  async getSnapshot() { await wait(); return snapshot(read()); },
  async signInAs(userId) {
    await wait(); const db = read();
    if (!db.users.some(u => u.id === userId)) fail('Demo identity not found.');
    db.currentUserId = userId;
    db.currentOrganizationId = getAllowedOrgs(db, userId)[0]?.id ?? null;
    write(db);
  },
  async signOut() { await wait(); const db = read(); db.currentUserId = null; db.currentOrganizationId = null; write(db); },
  async switchOrganization(organizationId) {
    await wait(); const db = read(); const user = me(db);
    if (!db.memberships.some(m => m.organizationId === organizationId && m.userId === user.id)) fail('You cannot access this organization.');
    db.currentOrganizationId = organizationId; write(db);
  },
  async createOrganization(input) {
    await wait(); const db = read(); const user = me(db); const valid = validateOrg(input, db);
    const id = newId(); db.organizations.push({ id, ...valid, createdAt: now() });
    db.memberships.push({ id: newId(), organizationId: id, userId: user.id, role: 'owner', joinedAt: now() });
    db.resources.push({ id: newId(), organizationId: id, title: 'Welcome to your workspace', description: 'A shared place for your team to find the essentials. Invite a teammate to get started.', type: 'Document', access: 'everyone', createdAt: now() });
    db.currentOrganizationId = id;
    log(db, 'Organization created', `Created ${valid.name}`, id, user.id);
    write(db);
  },
  async updateOrganization(input) {
    await wait(); const db = read(); const ctx = requirePermission(db, 'org:manage');
    const valid = validateOrg(input, db, ctx.organization.id);
    Object.assign(db.organizations.find(o => o.id === ctx.organization.id)!, valid);
    log(db, 'Organization updated', `Updated workspace details for ${valid.name}`, ctx.organization.id, ctx.user.id);
    write(db);
  },
  async inviteMember(input: InviteInput) {
    await wait(); const db = read(); const ctx = requirePermission(db, 'members:invite');
    const email = normalizeEmail(input.email);
    if (!isValidEmail(email)) fail('Enter a valid email address.');
    if (!(['admin', 'member', 'viewer'] as Role[]).includes(input.role)) fail('Choose a valid invitation role.');
    if (ctx.membership.role === 'admin' && input.role === 'admin') fail('Only owners can invite administrators.');
    if (db.memberships.some(m => m.organizationId === ctx.organization.id && db.users.find(u => u.id === m.userId)?.email.toLowerCase() === email)) fail('That person is already a member of this workspace.');
    if (db.invitations.some(i => i.organizationId === ctx.organization.id && i.email === email && i.status === 'pending')) fail('A pending invitation already exists for that email.');
    const invitation: Invitation = { id: newId(), organizationId: ctx.organization.id, email, role: input.role, status: 'pending', invitedBy: ctx.user.id, createdAt: now() };
    db.invitations.unshift(invitation);
    log(db, 'Invitation created', `Invited ${email} as ${input.role}`, ctx.organization.id, ctx.user.id);
    write(db);
  },
  async acceptInvitation(invitationId) {
    await wait(); const db = read(); const ctx = requirePermission(db, 'members:invite');
    const invite = db.invitations.find(i => i.id === invitationId && i.organizationId === ctx.organization.id && i.status === 'pending');
    if (!invite) fail('This invitation is no longer pending.');
    const user = makeInviteUser(db, invite.email);
    if (db.memberships.some(m => m.organizationId === ctx.organization.id && m.userId === user.id)) fail('This person is already a member.');
    invite.status = 'accepted';
    const membership: Membership = { id: newId(), organizationId: ctx.organization.id, userId: user.id, role: invite.role, joinedAt: now() };
    db.memberships.push(membership);
    log(db, 'Invitation accepted (preview)', `${user.name} joined as ${invite.role}`, ctx.organization.id, ctx.user.id);
    write(db);
  },
  async revokeInvitation(invitationId) {
    await wait(); const db = read(); const ctx = requirePermission(db, 'members:invite');
    const invite = db.invitations.find(i => i.id === invitationId && i.organizationId === ctx.organization.id && i.status === 'pending');
    if (!invite) fail('Invitation not found or no longer pending.');
    invite.status = 'revoked';
    log(db, 'Invitation revoked', `Revoked invitation for ${invite.email}`, ctx.organization.id, ctx.user.id);
    write(db);
  },
  async changeMemberRole(membershipId, role) {
    await wait(); const db = read(); const ctx = requirePermission(db, 'members:manage');
    const target = db.memberships.find(m => m.id === membershipId && m.organizationId === ctx.organization.id);
    if (!target) fail('Member not found in this workspace.');
    if (!canChangeRole(ctx.membership.role, target.role, role)) fail('You cannot make this role change.');
    if (target.role === role) return;
    const before = target.role; target.role = role;
    const user = db.users.find(u => u.id === target.userId)!;
    log(db, 'Role changed', `${user.name}: ${before} → ${role}`, ctx.organization.id, ctx.user.id);
    write(db);
  },
  async removeMember(membershipId) {
    await wait(); const db = read(); const ctx = requirePermission(db, 'members:manage');
    const target = db.memberships.find(m => m.id === membershipId && m.organizationId === ctx.organization.id);
    if (!target || !canChangeRole(ctx.membership.role, target.role, 'viewer')) fail('You cannot remove this member.');
    const user = db.users.find(u => u.id === target.userId)!;
    db.memberships = db.memberships.filter(m => m.id !== membershipId);
    log(db, 'Member removed', `Removed ${user.name}`, ctx.organization.id, ctx.user.id);
    write(db);
  },
  async createResource(input) {
    await wait(); const db = read(); const ctx = requirePermission(db, 'resource:create');
    const title = input.title.trim();
    if (title.length < 3 || title.length > 70) fail('Resource title must be between 3 and 70 characters.');
    if (!(['Document', 'Application', 'Workspace'] as string[]).includes(input.type)) fail('Choose a valid resource type.');
    if (!(['everyone', 'contributors', 'administrators'] as string[]).includes(input.access)) fail('Choose a valid access level.');
    if (input.access === 'administrators' && ctx.membership.role === 'member') fail('Only admins can create admin-only resources.');
    const resource: Resource = { id: newId(), organizationId: ctx.organization.id, title, description: input.description.trim() || 'Shared team resource', type: input.type, access: input.access, createdAt: now() };
    db.resources.unshift(resource);
    log(db, 'Resource created', `Created ${title} (${input.access})`, ctx.organization.id, ctx.user.id);
    write(db);
  },
  async openResource(resourceId) {
    await wait(); const db = read(); const ctx = requirePermission(db, 'resource:view');
    const resource = db.resources.find(r => r.id === resourceId && r.organizationId === ctx.organization.id);
    if (!resource) fail('Resource not found in this workspace.');
    if (!canReadResource(ctx.membership.role, resource.access)) fail('Access denied. Your workspace role cannot open this resource.');
    return resource;
  },
  async resetDemo() { await wait(); write(seedDatabase()); },
};

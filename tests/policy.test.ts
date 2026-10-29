import { describe, expect, it } from 'vitest';
import { canChangeRole, canReadResource, hasPermission } from '../src/lib/policy';
import { seedDatabase } from '../src/lib/seed';

describe('role-based authorization preview policy', () => {
  it('allows only the owner to manage the organization', () => {
    expect(hasPermission('owner', 'org:manage')).toBe(true);
    for (const role of ['admin', 'member', 'viewer'] as const) expect(hasPermission(role, 'org:manage')).toBe(false);
  });
  it('does not allow members/viewers to invite', () => {
    expect(hasPermission('member', 'members:invite')).toBe(false);
    expect(hasPermission('viewer', 'members:invite')).toBe(false);
  });
  it('protects admin-only resources', () => {
    expect(canReadResource('owner', 'administrators')).toBe(true);
    expect(canReadResource('admin', 'administrators')).toBe(true);
    expect(canReadResource('member', 'administrators')).toBe(false);
    expect(canReadResource('viewer', 'administrators')).toBe(false);
  });
  it('gives viewers read access only to resources shared with everyone', () => {
    expect(canReadResource('viewer', 'everyone')).toBe(true);
    expect(canReadResource('viewer', 'contributors')).toBe(false);
  });
  it('prevents admin self-promotion and owner changes', () => {
    expect(canChangeRole('admin', 'member', 'admin')).toBe(false);
    expect(canChangeRole('admin', 'owner', 'viewer')).toBe(false);
    expect(canChangeRole('owner', 'member', 'admin')).toBe(true);
  });
});

describe('seed referential integrity', () => {
  it('relates every membership and resource to an existing organization', () => {
    const db = seedDatabase();
    const orgIds = new Set(db.organizations.map(o => o.id));
    const userIds = new Set(db.users.map(u => u.id));
    db.memberships.forEach(m => {
      expect(orgIds.has(m.organizationId)).toBe(true);
      expect(userIds.has(m.userId)).toBe(true);
    });
    db.resources.forEach(r => expect(orgIds.has(r.organizationId)).toBe(true));
  });
  it('allows one user to have different roles across organizations', () => {
    const db = seedDatabase();
    const maya = db.memberships.filter(m => m.userId === 'user-maya');
    expect(maya).toHaveLength(2);
    expect(new Set(maya.map(m => m.role)).size).toBe(2);
  });
});

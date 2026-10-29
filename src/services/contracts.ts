import type { CreateOrganizationInput, CreateResourceInput, InviteInput, Resource, Role, WorkspaceSnapshot } from '../lib/domain';

/** The React UI depends only on this interface, not on a database, SDK, or provider. */
export interface AccessService {
  getSnapshot(): Promise<WorkspaceSnapshot>;
  signInAs(userId: string): Promise<void>; // preview-only; replace with real auth redirect/login
  signOut(): Promise<void>;
  switchOrganization(organizationId: string): Promise<void>;
  createOrganization(input: CreateOrganizationInput): Promise<void>;
  updateOrganization(input: CreateOrganizationInput): Promise<void>;
  inviteMember(input: InviteInput): Promise<void>;
  acceptInvitation(invitationId: string): Promise<void>; // preview-only simulation
  revokeInvitation(invitationId: string): Promise<void>;
  changeMemberRole(membershipId: string, role: Exclude<Role, 'owner'>): Promise<void>;
  removeMember(membershipId: string): Promise<void>;
  createResource(input: CreateResourceInput): Promise<void>;
  openResource(resourceId: string): Promise<Resource>;
  resetDemo(): Promise<void>; // preview-only
}

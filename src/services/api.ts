import type { AccessService } from './contracts';
import type { Resource, WorkspaceSnapshot } from '../lib/domain';

/**
 * Future real-backend adapter. All tenant-scoped endpoints derive authorization
 * from a verified server-side session; organization IDs are not a security boundary.
 * See API_CONTRACT.md for routes, status codes, and backend requirements.
 */
const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    credentials: 'include',
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
const json = (body: unknown) => JSON.stringify(body);
const unavailable = (): never => { throw new Error('Demo-only action. Use your real authentication provider when connected to an API.'); };

export const apiAccessService: AccessService = {
  getSnapshot: () => request<WorkspaceSnapshot>('/session'),
  signInAs: async () => unavailable(),
  signOut: () => request<void>('/session/logout', { method: 'POST' }),
  switchOrganization: (organizationId) => request<void>('/session/organization', { method: 'PUT', body: json({ organizationId }) }),
  createOrganization: (input) => request<void>('/organizations', { method: 'POST', body: json(input) }),
  updateOrganization: (input) => request<void>('/organizations/current', { method: 'PATCH', body: json(input) }),
  inviteMember: (input) => request<void>('/organizations/current/invitations', { method: 'POST', body: json(input) }),
  acceptInvitation: async () => unavailable(),
  revokeInvitation: (id) => request<void>(`/organizations/current/invitations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  changeMemberRole: (id, role) => request<void>(`/organizations/current/members/${encodeURIComponent(id)}`, { method: 'PATCH', body: json({ role }) }),
  removeMember: (id) => request<void>(`/organizations/current/members/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createResource: (input) => request<void>('/organizations/current/resources', { method: 'POST', body: json(input) }),
  openResource: (id) => request<Resource>(`/organizations/current/resources/${encodeURIComponent(id)}`),
  resetDemo: async () => unavailable(),
};

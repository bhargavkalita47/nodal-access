# Backend activation contract (planned)

The **frontend is ready**, but this is a plan, not a running server. The next release can implement the following endpoints in Express, Fastify, Django, Hono, or another framework. The UI expects the same JSON shapes regardless of framework.

## Runtime configuration

- `VITE_DATA_MODE=mock`: browser-only demo, initial default.
- `VITE_DATA_MODE=api`: `src/services/api.ts` sends requests to `VITE_API_BASE_URL` (default `/api`).
- All API calls use `credentials: 'include'` for server-created, HttpOnly session cookies.
- For deployment across origins, configure explicit CORS origin/credentials and correct cookie policy; do not enable wildcard credentialed CORS.
- The example API adapter uses JSON requests and an `Error` message parsed from `{ "message": "..." }`. `204` responses for writes are supported.

## Required endpoints

| Method | Path | Purpose | Suggested authorization |
|---|---|---|---|
| `GET` | `/api/session` | Return `WorkspaceSnapshot`; unauthenticated has `currentUser: null` | Session optional |
| `POST` | `/api/session/logout` | Revoke server session | Authenticated |
| `PUT` | `/api/session/organization` | Choose active org from user memberships | Must belong to org |
| `POST` | `/api/organizations` | Create org + owner membership atomically | Authenticated |
| `PATCH` | `/api/organizations/current` | Change org name, slug, industry | Owner |
| `POST` | `/api/organizations/current/invitations` | Create & email a pending invitation | Owner/Admin; Admin cannot invite Admin |
| `DELETE` | `/api/organizations/current/invitations/:id` | Revoke pending invitation | Owner/Admin |
| `PATCH` | `/api/organizations/current/members/:id` | Change member role | Owner (Admin only for Member/Viewer changes) |
| `DELETE` | `/api/organizations/current/members/:id` | Remove member | Owner/Admin, never Owner or self-last-owner |
| `POST` | `/api/organizations/current/resources` | Add resource | Owner/Admin/Member (Member cannot set admin-only) |
| `GET` | `/api/organizations/current/resources/:id` | Open/read accessible resource | Membership + visibility policy |

**Mock-only methods** `signInAs`, `acceptInvitation`, and `resetDemo` have **no API equivalents**. Replace demo sign-in with a real OAuth/passwordless/password flow, and implement invitation acceptance through single-use server tokens. The frontend should show the actual verification/redeem path once implemented.

## `GET /api/session` response

Use interfaces from [`src/lib/domain.ts`](./src/lib/domain.ts). Send fields exactly as defined there, with all arrays present (empty if none):

```json
{
  "currentUser": { "id": "uuid", "name": "Maya Patel", "email": "maya@example.com", "title": "Founder", "color": "lavender" },
  "organization": { "id": "uuid", "name": "Northline Studio", "slug": "northline-studio", "industry": "Design & creative", "createdAt": "2026-10-01T00:00:00Z" },
  "role": "owner",
  "organizations": [{ "id": "uuid", "name": "Northline Studio", "slug": "northline-studio", "industry": "Design & creative", "createdAt": "2026-10-01T00:00:00Z", "role": "owner", "memberCount": 4 }],
  "members": [{ "id": "uuid", "organizationId": "uuid", "userId": "uuid", "role": "owner", "joinedAt": "2026-10-01T00:00:00Z", "user": { "id": "uuid", "name": "Maya Patel", "email": "maya@example.com", "title": "Founder", "color": "lavender" } }],
  "invitations": [],
  "resources": [{ "id": "uuid", "organizationId": "uuid", "title": "Brand handbook", "description": "Guidelines", "type": "Document", "access": "everyone", "createdAt": "2026-10-01T00:00:00Z", "allowed": true }],
  "activities": [],
  "demoUsers": [],
  "pendingInvitesCount": 0
}
```

For authenticated sessions, derive `currentUser`, active org, and role from trusted server-side state and memberships. **Never accept `role`, `userId`, or `allowed` values from the browser as authorization evidence.** `demoUsers` must be `[]` in production and omitted from any account-switch UI.

The `resources` array can contain safe, discoverable metadata for locked resources, but **must not** expose secret data or content. Protected content is only returned by the permission-checked `GET /resources/:id` route. Alternatively, omit inaccessible resources entirely if your data classification requires that.

## Database model (recommended PostgreSQL)

- `users(id, email UNIQUE, name, created_at, ...)`
- `organizations(id, name, slug UNIQUE, created_at, ...)`
- `memberships(id, user_id, organization_id, role, created_at, UNIQUE(user_id, organization_id))`
- `invitations(id, organization_id, email, role, token_hash, expires_at, accepted_at, revoked_at, invited_by, ...)`
- `resources(id, organization_id, title, description, type, access, created_by, created_at, ...)`
- `audit_events(id, organization_id, actor_id, action, target_type, target_id, metadata, created_at, ...)`
- `sessions(id, user_id, expires_at, revoked_at, ...)` or a reliable external auth/session provider.

In every tenant-scoped database query, bind the authorized organization ID **from server-side membership verification**; avoid fetching a row solely by its global resource ID. Where possible add database row-level security as a second protection layer. Index tenant IDs, user membership uniqueness, and audit event timestamps.

## Security requirements before full-stack release

1. Authenticate the user on the server; avoid browser-owned sessions or localStorage tokens.
2. Enforce authorization on every endpoint and sensitive row, including read/list/query and mutation paths.
3. Prevent horizontal cross-tenant IDOR even when users share multiple organizations; never trust a supplied org ID.
4. Ensure an org always has at least one owner; handle transfers and deletion explicitly.
5. Validate inputs on the server, rate-limit sensitive operations, and apply CSRF protections for cookie sessions.
6. Hash invitation tokens, expire them, invalidate on use, and verify recipient identity.
7. Ensure role changes and resource writes are transactional; generate trusted audit entries in the same transaction.
8. Isolate tenant-scoped pagination/search/export/background jobs and attachment storage.
9. Test role escalation, revocation mid-session, audit access, token replay, session expiry, and two concurrent role changes.
10. Add health checks, error reporting, backups, migrations, and a data-retention policy.

## Release checklist

- [ ] Real authentication and secure session management
- [ ] Database migrations + seeded development environment
- [ ] Server-side tenant isolation and authorization policies
- [ ] Real invitation email + token acceptance UI
- [ ] Shared API error types, loading, and 401/403 handling
- [ ] Server audit log with tamper-resistant storage
- [ ] Integration and security tests (different users & tenants)
- [ ] Staging, monitoring, production configuration and backups

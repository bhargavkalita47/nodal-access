# Nodal — Multi-Tenant Identity & Access

A frontend-first, **backend-ready** multi-tenant identity and authorization product for an FDE portfolio. Built with React, TypeScript, Vite, native CSS, and an async service-adapter boundary. No Supabase, Vercel, or paid hosting required for the frontend preview.

> **Security status: FRONTEND PREVIEW ONLY.** Login identities are selectable demo profiles. Role checks, invitation acceptance, audit events, and tenant separation are simulated in browser code and **are not security controls**. No email invitations are sent. Do not use this project in production or store sensitive data until a real auth backend enforces authorization and tenant isolation server-side.

## What's working in the frontend preview

- One-click entry as a seeded Owner, Admin, Member, or Viewer.
- Create a new organization with a unique slug; automatic owner membership.
- Switch between organizations (including an account belonging to two organizations with different roles).
- See members, invite people, assign roles, and remove members.
- Simulate acceptance or revocation of a pending invitation (no email delivery).
- Create shared resources with different visibility levels and attempt to open them.
- View explicit “access denied” feedback for restricted resources.
- Review workspace-scoped activity history (Owner and Admin only).
- Edit organization details (Owner only).
- Switch demo identities to observe role-specific UI and access decisions.
- Persist changes with `localStorage` in the same browser, reset back to seed data.
- Responsive desktop/mobile navigation, helpful empty states and loading states.
- Typed asynchronous mock service with API adapter and tests for role policy.

## Start locally

Requirements: **Node.js 20.19+ or 22.12+** and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Open the URL shown by Vite, usually `http://localhost:5173`.

```bash
npm run build     # type-check and create dist/
npm run preview   # locally preview the dist/ production build
npm run test      # unit tests
```

The app works out of the box in `mock` mode if you don't create an `.env` file.

## Deploy for free on Cloudflare Pages

1. Create a GitHub repository, and push **the contents of this folder** to it.
2. Go to Cloudflare Dashboard → **Workers & Pages** → Create → **Pages** → Import an existing Git repository.
3. Choose the repo. Framework preset: **Vite** (or configure manually).
4. Build command: **`npm run build`**. Build output directory: **`dist`**. Root directory: your project root. Set `NODE_VERSION=22` if the Pages builder defaults to an incompatible Node version.
5. Deploy. Cloudflare will provide a free `*.pages.dev` URL.
6. Subsequent pushes to your selected branch will rebuild and deploy the frontend.

This is a client-rendered single-page app. `public/_redirects` supports SPA fallbacks on Pages. You don't need a backend, database service, Cloudflare account secrets, or a credit card for the frontend demo. Cloudflare free-tier usage limits still apply.

**Cloudflare Workers alternative:** Static asset hosting also works, but Pages is the simplest Git-connected option for this React/Vite preview.

## Explore the main loop

**Maya Patel (Owner) → Northline Studio → Invite teammate → Pick a role → People & invites → Simulate acceptance → Access explorer → Switch preview identity.**

A second organization, Orbit Systems, appears under Maya's workspace switcher, where she is a Viewer rather than an Owner. This lets you preview tenant context and per-organization roles.

Other built-in demo identities: Jonah Reed (Admin), Leila Morgan (Member), Ellis Kim (Viewer), Harper Lee (Owner at Orbit), and Samira Khan (Admin at Orbit).

## Architecture

```text
src/
  components/          Shared UI primitives (dialogs, avatars, badges, headers)
  features/            Domain-focused forms
  lib/
    domain.ts          Shared entity and API-facing data types
    policy.ts          Explicit presentation policy (NOT backend security)
    seed.ts            Realistic demo records across two organizations
    utils.ts           Formatting helpers
  services/
    contracts.ts       AccessService interface (UI's single dependency)
    mock.ts            Asynchronous localStorage adapter
    api.ts             HTTP/cookie-session adapter scaffold
    index.ts           Adapter selection through environment setting
  styles/main.css      Bespoke Nodal design language, desktop and mobile
  App.tsx              Pages, workflows, navigation, modals, app state
  main.tsx             React entry
public/
  _redirects           Pages SPA fallback
  favicon.svg
API_CONTRACT.md         Reference REST contract and backend activation plan
tests/policy.test.ts    Baseline policy and data integrity tests
```

### Swap the backend later without rebuilding the frontend

The app calls `accessService.getSnapshot()`, `inviteMember()`, `changeMemberRole()`, etc. All application components use only the `AccessService` contract and domain types; they never read browser storage or call fetch directly.

1. Build the server endpoints described in [`API_CONTRACT.md`](./API_CONTRACT.md).
2. Add a real login flow (OAuth/passwordless/password with protected sessions); the demo identity picker is mock-only and must be removed/replaced.
3. Set environment variables at build time:
   ```bash
   VITE_DATA_MODE=api
   VITE_API_BASE_URL=https://your-backend.example.com/api
   ```
4. Make your backend `GET /api/session` respond with `WorkspaceSnapshot` as documented; map write endpoints to service methods.
5. Configure secure cookies, CORS if cross-origin, and CSRF defenses where needed.
6. Enforce permissions and organization membership on **every** server route and database query. Never trust frontend role checks or organization IDs supplied by a client.
7. Replace simulated invitation acceptance with a real single-use invitation-token flow and server-delivered email.
8. Add automated server integration tests for cross-tenant denial, IDOR, role escalation, invite replay, session revocation, and audit integrity.

### Keeping roles and UX realistic

The default policy intentionally makes `Owner` distinct from `Admin`. Owners can edit the organization and assign other admins; Admins can manage Members/Viewers and invite them, but cannot promote themselves or modify Owners. Members can create and view permitted resources; Viewers can only open resources shared with everyone.

This is a **sample policy**, not a universal IAM standard. Update both backend and UI policies together when requirements change.

## Important limitations

- Browser storage is **per-browser and per-origin**; changes do not sync across devices or users.
- Preview personas are not actual authenticated identities.
- The UI hides/denies actions as a UX simulation, not as a security boundary.
- Backend adapter (`api.ts`) is scaffolding. Setting `VITE_DATA_MODE=api` without implementing its endpoints will not make a functional backend.
- Seed records are fictional examples. Initial data may vary when browser storage already contains a previous preview.
- No real file/document contents, external integrations, invitation email, or transactional database exist yet.

## Portfolio description

*Nodal is a multi-organization identity and authorization console. The frontend preview demonstrates organization creation, membership workflows, invitations, role-based access exploration, and tenant-specific workspace views using a typed mock service. A full-stack release will add real authentication, session security, tenant-isolated persistence, server-enforced RBAC, and audit logs.*

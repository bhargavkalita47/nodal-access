import type { Database, Resource } from './domain';

const dateAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export const seedDatabase = (): Database => {
  const resources: Resource[] = [
    { id: 'r-01', organizationId: 'org-north', title: 'Brand & team handbook', description: 'A shared home for the team\'s processes, principles, and working agreements.', type: 'Document', access: 'everyone', createdAt: dateAgo(32) },
    { id: 'r-02', organizationId: 'org-north', title: 'Product workspace', description: 'Project references, sprint plans, and active product initiatives.', type: 'Workspace', access: 'contributors', createdAt: dateAgo(21) },
    { id: 'r-03', organizationId: 'org-north', title: 'Infrastructure console', description: 'Restricted operational tools and environment configurations.', type: 'Application', access: 'administrators', createdAt: dateAgo(15) },
    { id: 'r-04', organizationId: 'org-north', title: 'Company announcements', description: 'A read-only destination for team updates and internal news.', type: 'Document', access: 'everyone', createdAt: dateAgo(9) },
    { id: 'r-05', organizationId: 'org-orbit', title: 'Partner guidelines', description: 'Getting started at Orbit, company policies, and shared knowledge.', type: 'Document', access: 'everyone', createdAt: dateAgo(22) },
    { id: 'r-06', organizationId: 'org-orbit', title: 'Delivery roadmap', description: 'Internal delivery commitments and team milestones.', type: 'Workspace', access: 'contributors', createdAt: dateAgo(13) },
    { id: 'r-07', organizationId: 'org-orbit', title: 'Security center', description: 'Administrative security and account-management resources.', type: 'Application', access: 'administrators', createdAt: dateAgo(4) },
  ];
  return {
    schemaVersion: 1,
    users: [
      { id: 'user-maya', name: 'Maya Patel', email: 'maya@northline.design', title: 'Founder & Design Lead', color: 'lavender' },
      { id: 'user-jonah', name: 'Jonah Reed', email: 'jonah@northline.design', title: 'Engineering Lead', color: 'citrus' },
      { id: 'user-leila', name: 'Leila Morgan', email: 'leila@northline.design', title: 'Product Designer', color: 'peach' },
      { id: 'user-ellis', name: 'Ellis Kim', email: 'ellis@northline.design', title: 'Advisor', color: 'blue' },
      { id: 'user-harper', name: 'Harper Lee', email: 'harper@orbit.systems', title: 'Operations Director', color: 'mint' },
      { id: 'user-samira', name: 'Samira Khan', email: 'samira@orbit.systems', title: 'Product Manager', color: 'rose' },
    ],
    organizations: [
      { id: 'org-north', name: 'Northline Studio', slug: 'northline-studio', industry: 'Design & creative', createdAt: dateAgo(105) },
      { id: 'org-orbit', name: 'Orbit Systems', slug: 'orbit-systems', industry: 'Technology', createdAt: dateAgo(67) },
    ],
    memberships: [
      { id: 'mem-1', organizationId: 'org-north', userId: 'user-maya', role: 'owner', joinedAt: dateAgo(105) },
      { id: 'mem-2', organizationId: 'org-north', userId: 'user-jonah', role: 'admin', joinedAt: dateAgo(80) },
      { id: 'mem-3', organizationId: 'org-north', userId: 'user-leila', role: 'member', joinedAt: dateAgo(41) },
      { id: 'mem-4', organizationId: 'org-north', userId: 'user-ellis', role: 'viewer', joinedAt: dateAgo(14) },
      { id: 'mem-5', organizationId: 'org-orbit', userId: 'user-harper', role: 'owner', joinedAt: dateAgo(67) },
      { id: 'mem-6', organizationId: 'org-orbit', userId: 'user-samira', role: 'admin', joinedAt: dateAgo(53) },
      { id: 'mem-7', organizationId: 'org-orbit', userId: 'user-maya', role: 'viewer', joinedAt: dateAgo(19) },
    ],
    invitations: [
      { id: 'inv-1', organizationId: 'org-north', email: 'alex@northline.design', role: 'member', status: 'pending', invitedBy: 'user-maya', createdAt: dateAgo(2) },
    ],
    resources,
    activities: [
      { id: 'act-1', organizationId: 'org-north', actorId: 'user-maya', action: 'Invitation sent', detail: 'Invited alex@northline.design as Member', createdAt: dateAgo(2) },
      { id: 'act-2', organizationId: 'org-north', actorId: 'user-jonah', action: 'Resource created', detail: 'Added Infrastructure console', createdAt: dateAgo(15) },
      { id: 'act-3', organizationId: 'org-north', actorId: 'user-maya', action: 'Member joined', detail: 'Ellis Kim joined as Viewer', createdAt: dateAgo(14) },
      { id: 'act-4', organizationId: 'org-orbit', actorId: 'user-harper', action: 'Member joined', detail: 'Maya Patel joined as Viewer', createdAt: dateAgo(19) },
    ],
    currentUserId: null,
    currentOrganizationId: null,
  };
};

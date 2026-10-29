import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity as ActivityIcon, ArrowLeftRight, ArrowRight, ArrowUpRight, Building2,
  Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck, Clock3,
  FileKey2, FileText, Fingerprint, FolderLock, Globe2, KeyRound, Layers3, LayoutDashboard,
  LockKeyhole, LogOut, Menu, Plus, SearchCheck, Settings2, Shield,
  ShieldAlert, ShieldCheck, ShieldOff, Trash2, UserPlus, Users, X,
} from 'lucide-react';
import { Avatar, Dialog, EmptyState, Logo, PageHeader, RoleBadge } from './components/Ui';
import { InviteForm, OrganizationForm, ResourceForm } from './features/Forms';
import { accessService, isDemoMode } from './services';
import type { MembershipView, Page, Resource, ResourceView, Role, User, WorkspaceSnapshot } from './lib/domain';
import { accessLabels, canChangeRole, hasPermission, roleDescriptions, roleLabels, rolePermissions } from './lib/policy';
import { formatDate, initials, timeAgo } from './lib/utils';
import './styles/main.css';

const nav: { page: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { page: 'overview', label: 'Overview', icon: LayoutDashboard },
  { page: 'people', label: 'People & invites', icon: Users },
  { page: 'access', label: 'Access explorer', icon: FolderLock },
  { page: 'activity', label: 'Activity log', icon: ActivityIcon },
];
const pageTitles: Record<Page, string> = { overview: 'Overview', people: 'People & invites', access: 'Access explorer', activity: 'Activity log', settings: 'Settings' };
type Modal = 'invite' | 'organization' | 'edit-organization' | 'resource' | 'reset' | null;
type Notice = { type: 'success' | 'error'; text: string } | null;

export default function App() {
  const [data, setData] = useState<WorkspaceSnapshot | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState<Page>('overview');
  const [modal, setModal] = useState<Modal>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [removeTarget, setRemoveTarget] = useState<MembershipView | null>(null);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    accessService.getSnapshot().then(setData).catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'Unable to load the application.')).finally(() => setInitialLoading(false));
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') { setModal(null); setSelectedResource(null); setRemoveTarget(null); setOrgMenuOpen(false); setUserMenuOpen(false); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const execute = async (action: () => Promise<unknown>, success: string, after?: () => void): Promise<boolean> => {
    setBusy(true); setNotice(null);
    try {
      await action();
      const latest = await accessService.getSnapshot();
      setData(latest);
      setNotice({ type: 'success', text: success });
      after?.();
      return true;
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Something went wrong. Try again.' });
      return false;
    } finally { setBusy(false); }
  };
  const selectPage = (next: Page) => { setPage(next); setSidebarOpen(false); setOrgMenuOpen(false); setUserMenuOpen(false); setNotice(null); };
  const openResource = async (resource: ResourceView) => {
    setBusy(true); setNotice(null);
    try { const result = await accessService.openResource(resource.id); setSelectedResource(result); }
    catch (error) { setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Unable to open resource.' }); }
    finally { setBusy(false); }
  };

  if (initialLoading) return <div className="splash"><Logo/><div className="spinner"/><p>Preparing your workspace…</p></div>;
  if (loadError || !data) return <div className="splash"><Logo/><h2>Could not load your workspace</h2><p>{loadError}</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button></div>;
  if (!data.currentUser) return <>
    <SignIn onSignIn={id => execute(() => accessService.signInAs(id), 'Preview workspace is ready.')} users={data.demoUsers} busy={busy}/>
    <NoticeToast notice={notice} close={() => setNotice(null)}/>
  </>;

  const can = (permission: Parameters<typeof hasPermission>[1]) => hasPermission(data.role, permission);
  const chooseIdentity = async (id: string) => {
    setUserMenuOpen(false); setOrgMenuOpen(false);
    await execute(() => accessService.signInAs(id), 'Switched demo identity.', () => setPage('overview'));
  };
  const chooseOrganization = async (id: string) => {
    setOrgMenuOpen(false); await execute(() => accessService.switchOrganization(id), 'Workspace switched.', () => setPage('overview'));
  };
  const openModal = (name: Modal) => { setNotice(null); setModal(name); };

  return <div className="app-shell">
    {sidebarOpen && <button aria-label="Close sidebar" className="mobile-scrim" onClick={() => setSidebarOpen(false)}/>}
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-logo"><Logo inverse/><span className="sidebar-logo-sub">IDENTITY & ACCESS</span></div>
      <div className="sidebar-workspace">
        <span className="sidebar-caption">CURRENT WORKSPACE</span>
        <div className="dropdown-anchor">
          <button className="workspace-switch" onClick={() => { setOrgMenuOpen(!orgMenuOpen); setUserMenuOpen(false); }} aria-expanded={orgMenuOpen}>
            <span className="workspace-symbol">{data.organization ? initials(data.organization.name).slice(0, 2) : <Building2 size={18}/>}</span>
            <span className="workspace-switch-name"><strong>{data.organization?.name ?? 'No workspace'}</strong><small>{data.role ? `${roleLabels[data.role]} access` : 'Create a workspace'}</small></span>
            <ChevronDown size={15} className={orgMenuOpen ? 'rotate' : ''}/>
          </button>
          {orgMenuOpen && <div className="floating-menu org-menu">
            <p className="menu-label">YOUR WORKSPACES</p>
            {data.organizations.map(o => <button key={o.id} className="menu-org" onClick={() => void chooseOrganization(o.id)}><span className="org-menu-symbol">{initials(o.name).slice(0, 2)}</span><span><strong>{o.name}</strong><small>{roleLabels[o.role]} · {o.memberCount} people</small></span>{data.organization?.id === o.id && <Check size={17}/>}</button>)}
            <button className="menu-create" onClick={() => { setOrgMenuOpen(false); openModal('organization'); }}><Plus size={16}/> Create new workspace</button>
          </div>}
        </div>
      </div>
      <div className="sidebar-nav">
        <p className="sidebar-caption">WORKSPACE</p>
        {nav.map(item => { const Icon = item.icon; return <button key={item.page} onClick={() => selectPage(item.page)} className={`nav-link ${page === item.page ? 'active' : ''}`}><Icon size={18} strokeWidth={1.9}/><span>{item.label}</span>{item.page === 'people' && data.pendingInvitesCount > 0 && <span className="nav-count">{data.pendingInvitesCount}</span>}{item.page === 'activity' && !can('audit:view') && <LockKeyhole size={13} className="nav-lock"/>}</button>; })}
        <div className="sidebar-divider"/>
        <p className="sidebar-caption">PREFERENCES</p>
        <button onClick={() => selectPage('settings')} className={`nav-link ${page === 'settings' ? 'active' : ''}`}><Settings2 size={18} strokeWidth={1.9}/><span>Settings</span></button>
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-help"><div className="help-icon"><ShieldCheck size={19}/></div><strong>Clarity at every level.</strong><p>Give everyone the right access, without the guesswork.</p><button onClick={() => selectPage('access')}>Explore access <ArrowRight size={14}/></button></div>
        <div className="sidebar-version"><span className="online-dot"/> {isDemoMode ? 'FRONTEND PREVIEW' : 'CONNECTED WORKSPACE'} <span>v1.0</span></div>
      </div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-btn mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar"><Menu size={21}/></button><span className="breadcrumb-parent">Workspace</span><ChevronRight size={15} className="breadcrumb-chevron"/><span className="breadcrumb-current">{pageTitles[page]}</span></div>
        <div className="topbar-right">{isDemoMode && <span className="preview-pill"><span className="online-dot"/> Live frontend preview</span>}
          <div className="dropdown-anchor">
            <button className="identity-trigger" onClick={() => { setUserMenuOpen(!userMenuOpen); setOrgMenuOpen(false); }} aria-expanded={userMenuOpen} aria-label="Account and demo identities"><Avatar user={data.currentUser} size="sm"/><span className="identity-name">{data.currentUser.name}</span><ChevronDown size={14}/></button>
            {userMenuOpen && <div className="floating-menu identity-menu"><div className="menu-current"><Avatar user={data.currentUser}/><div><strong>{data.currentUser.name}</strong><small>{data.currentUser.email}</small></div></div>
              {isDemoMode && <><p className="menu-label">PREVIEW AS ANOTHER PERSON</p><p className="menu-hint">Switch identities to test real-looking role restrictions. No password is required in preview.</p><div className="menu-user-list">{data.demoUsers.filter(u => u.id !== data.currentUser?.id).map(u => <button key={u.id} className="menu-user" onClick={() => void chooseIdentity(u.id)}><Avatar user={u} size="sm"/><span>{u.name}<small>{u.email}</small></span><ArrowRight size={14}/></button>)}</div></>}
              <button className="menu-signout" onClick={() => { setUserMenuOpen(false); void execute(() => accessService.signOut(), 'Signed out of the preview.', () => setPage('overview')); }}><LogOut size={16}/> Sign out</button>
            </div>}
          </div>
        </div>
      </header>
      <main className="main-content" key={`${data.organization?.id ?? 'none'}-${page}`}>
        {!data.organization ? <div className="no-org"><span className="circle-illustration"><Building2 size={36}/></span><h1>Make a place for your team.</h1><p>Create your first workspace, then invite people and decide what they can access.</p><button className="btn btn-primary" onClick={() => openModal('organization')}><Plus size={17}/> Create workspace</button></div> : <>
          {page === 'overview' && <Overview data={data} onInvite={() => openModal('invite')} onCreateOrg={() => openModal('organization')} onPage={selectPage} canInvite={can('members:invite')}/>}
          {page === 'people' && <People data={data} canInvite={can('members:invite')} canManage={can('members:manage')} busy={busy} onInvite={() => openModal('invite')} onAccept={id => void execute(() => accessService.acceptInvitation(id), 'Invitation accepted in preview. The new teammate is now a member.')} onRevoke={id => void execute(() => accessService.revokeInvitation(id), 'Invitation revoked.')} onRole={(id, role) => void execute(() => accessService.changeMemberRole(id, role), 'Member role updated.')} onRemove={setRemoveTarget}/>}
          {page === 'access' && <AccessExplorer data={data} onCreate={() => openModal('resource')} onOpen={r => void openResource(r)} canCreate={can('resource:create')} busy={busy} onPeople={() => selectPage('people')}/>}
          {page === 'activity' && <ActivityLog data={data} allowed={can('audit:view')} onPeople={() => selectPage('people')}/>}
          {page === 'settings' && <Settings data={data} canManage={can('org:manage')} onEdit={() => openModal('edit-organization')} onReset={() => openModal('reset')} onOrg={() => openModal('organization')}/>}
        </>}
        <footer className="content-footer"><span><span className="footer-symbol">◈</span> Nodal / identity made understandable</span><span>{isDemoMode ? 'Preview data stays in this browser · No real authentication' : 'Connected to your API'}</span></footer>
      </main>
    </div>
    <NoticeToast notice={notice} close={() => setNotice(null)}/>
    {modal === 'organization' && <Dialog eyebrow="NEW WORKSPACE" title="Create your organization" description="A dedicated space for your people, roles, and resources." onClose={() => setModal(null)}><OrganizationForm busy={busy} onClose={() => setModal(null)} onSubmit={v => execute(() => accessService.createOrganization(v), 'Workspace created. Invite your first teammate next.', () => setPage('overview'))}/></Dialog>}
    {modal === 'edit-organization' && data.organization && <Dialog eyebrow="WORKSPACE DETAILS" title="Edit organization" description="Update the name and address of this workspace." onClose={() => setModal(null)}><OrganizationForm original={data.organization} busy={busy} onClose={() => setModal(null)} onSubmit={v => execute(() => accessService.updateOrganization(v), 'Workspace details updated.')}/></Dialog>}
    {modal === 'invite' && data.role && <Dialog eyebrow="TEAM ACCESS" title="Invite a teammate" description="Choose who to invite and what they'll be able to do." onClose={() => setModal(null)}><InviteForm busy={busy} actorRole={data.role} onClose={() => setModal(null)} onSubmit={v => execute(() => accessService.inviteMember(v), 'Invitation created. Simulate acceptance from People & invites.', () => setPage('people'))}/></Dialog>}
    {modal === 'resource' && data.role && <Dialog eyebrow="ACCESS EXPLORER" title="Add a resource" description="Decide what your team can see and who can open it." onClose={() => setModal(null)}><ResourceForm busy={busy} actorRole={data.role} onClose={() => setModal(null)} onSubmit={v => execute(() => accessService.createResource(v), 'New resource added to this workspace.')}/></Dialog>}
    {modal === 'reset' && <Dialog eyebrow="PREVIEW CONTROLS" title="Reset demo data?" description="This restores the original sample workspaces and removes changes saved in this browser." onClose={() => setModal(null)}><div className="form-actions"><button className="btn btn-secondary" onClick={() => setModal(null)}>Keep my changes</button><button className="btn btn-danger" disabled={busy} onClick={() => void execute(() => accessService.resetDemo(), 'Sample data restored.', () => { setModal(null); setPage('overview'); })}>{busy ? 'Resetting…' : 'Reset preview'}</button></div></Dialog>}
    {removeTarget && <Dialog eyebrow="MEMBER ACCESS" title={`Remove ${removeTarget.user.name}?`} description="They will no longer be able to access this workspace. This does not remove their account from other organizations." onClose={() => setRemoveTarget(null)}><div className="form-actions"><button className="btn btn-secondary" onClick={() => setRemoveTarget(null)}>Cancel</button><button disabled={busy} className="btn btn-danger" onClick={() => void execute(() => accessService.removeMember(removeTarget.id), 'Member removed from this workspace.', () => setRemoveTarget(null))}>{busy ? 'Removing…' : 'Remove member'}</button></div></Dialog>}
    {selectedResource && <Dialog eyebrow="RESOURCE PREVIEW" title={selectedResource.title} description={selectedResource.description} onClose={() => setSelectedResource(null)}><div className="resource-detail"><span className="resource-open-icon"><FileKey2 size={26}/></span><h3>You have access to this resource.</h3><p>Permission check passed for your current role in <strong>{data.organization?.name}</strong>. This preview represents a protected resource; it isn't connected to a file or external app.</p><div className="detail-facts"><span>Type <strong>{selectedResource.type}</strong></span><span>Access <strong>{accessLabels[selectedResource.access]}</strong></span></div></div><div className="form-actions"><button className="btn btn-primary" onClick={() => setSelectedResource(null)}>Done <Check size={16}/></button></div></Dialog>}
  </div>;
}

function NoticeToast({ notice, close }: { notice: Notice; close: () => void }) {
  if (!notice) return null;
  return <div className={`toast toast-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}><span className="toast-icon">{notice.type === 'success' ? <CheckCircle2 size={20}/> : <ShieldAlert size={20}/>}</span><p>{notice.text}</p><button onClick={close} aria-label="Dismiss message"><X size={17}/></button></div>;
}

function SignIn({ onSignIn, users, busy }: { onSignIn: (id: string) => void; users: User[]; busy: boolean }) {
  const maya = users.find(u => u.id === 'user-maya') ?? users[0];
  return <div className="welcome-layout">
    <section className="welcome-visual"><div className="welcome-brand"><Logo inverse/><span>IDENTITY, SIMPLIFIED.</span></div><div className="welcome-visual-content"><span className="welcome-kicker"><span className="welcome-kicker-line"/> WORK BETTER, TOGETHER</span><h1>Good access<br/>makes great<br/><em>work possible.</em></h1><p>One thoughtful place for your organizations, people, and permissions. Nothing more complicated than it needs to be.</p><div className="welcome-graphic" aria-hidden="true"><span className="graphic-center"><ShieldCheck size={31}/></span><span className="graphic-node graphic-a">MP</span><span className="graphic-node graphic-b">JR</span><span className="graphic-node graphic-c">LM</span><span className="graphic-orbit graphic-orbit-a"/><span className="graphic-orbit graphic-orbit-b"/></div></div><div className="welcome-visual-footer"><span>SECURE BY DESIGN. SIMPLE BY NATURE.</span><span>© NODAL 2026</span></div></section>
    <section className="welcome-form-side"><div className="welcome-form-top"><span className="demo-tag"><span className="online-dot"/> INTERACTIVE PRODUCT PREVIEW</span></div><div className="welcome-form-inner"><span className="eyebrow">WELCOME TO NODAL</span><h2>See how simple access can be.</h2><p>Start with a ready-to-explore workspace. Invite people, assign roles, and see access rules in action.</p><div className="welcome-persona"><Avatar user={maya} size="lg"/><span><strong>{maya.name}</strong><small>Workspace owner · Northline Studio</small></span><span className="recommended">RECOMMENDED</span></div><button className="btn btn-primary welcome-continue" disabled={busy} onClick={() => onSignIn(maya.id)}>{busy ? 'Opening workspace…' : 'Explore as workspace owner'}<ArrowRight size={18}/></button><div className="or-divider"><span/>OR PREVIEW ANOTHER ROLE<span/></div><div className="alternative-personas">{users.filter(u => ['user-jonah', 'user-leila', 'user-ellis'].includes(u.id)).map(u => <button disabled={busy} onClick={() => onSignIn(u.id)} key={u.id}><Avatar user={u} size="sm"/><span>{u.name}<small>{u.id === 'user-jonah' ? 'Admin' : u.id === 'user-leila' ? 'Member' : 'Viewer'}</small></span><ArrowUpRight size={16}/></button>)}</div><p className="welcome-disclaimer"><Shield size={15}/> Frontend preview. Accounts and access checks are simulated in your browser; no real sign-in or email delivery occurs.</p></div><div className="welcome-form-bottom"><span>Designed for teams of every size.</span><span>01 / 01</span></div></section>
  </div>;
}

function Overview({ data, onInvite, onCreateOrg, onPage, canInvite }: { data: WorkspaceSnapshot; onInvite: () => void; onCreateOrg: () => void; onPage: (p: Page) => void; canInvite: boolean }) {
  const { organization, members, resources, invitations, currentUser, role } = data;
  const firstName = currentUser?.name.split(' ')[0] ?? 'there';
  const pendingCount = invitations.filter(i => i.status === 'pending').length;
  return <div className="page-enter">
    <div className="overview-intro"><div><span className="eyebrow">YOUR WORKSPACE AT A GLANCE</span><h1>Welcome back, {firstName}<span className="headline-period">.</span></h1><p>Everything you need to manage your team's access, in one place.</p></div><button className="btn btn-secondary btn-desktop" onClick={onCreateOrg}><Plus size={17}/> New organization</button></div>
    <section className="hero-panel"><div className="hero-panel-content"><span className="hero-overline"><span className="hero-signal"/> ACCESS, WITHOUT THE COMPLEXITY</span><h2>Right people.<br/><em>Right access.</em></h2><p>Invite your team, give them a role, and keep everything connected to {organization?.name}.</p><button className="btn btn-light" onClick={canInvite ? onInvite : () => onPage('access')}>{canInvite ? <><UserPlus size={17}/> Invite a teammate <ArrowRight size={17}/></> : <><FolderLock size={17}/> Explore access <ArrowRight size={17}/></>}</button></div><div className="hero-art" aria-hidden="true"><div className="hero-art-orbit one"/><div className="hero-art-orbit two"/><div className="hero-art-orbit three"/><div className="hero-art-card art-card-one"><span className="tiny-circle"/> TEAM MEMBER <Check size={15}/></div><div className="hero-art-center"><ShieldCheck size={49} strokeWidth={1.3}/></div><div className="hero-art-card art-card-two"><span className="tiny-circle"/> ACCESS VERIFIED <Check size={15}/></div></div></section>
    <div className="stat-grid"><Stat label="People with access" value={members.length.toString().padStart(2, '0')} icon={<Users size={20}/>} sub="Active members"/><Stat label="Pending invitations" value={String(pendingCount).padStart(2, '0')} icon={<UserPlus size={20}/>} sub={canInvite ? 'Waiting to join' : 'Managed by admins'}/><Stat label="Shared resources" value={resources.length.toString().padStart(2, '0')} icon={<Layers3 size={20}/>} sub="Workspace resources"/></div>
    <div className="overview-bottom-grid"><section className="surface-card guide-card"><div className="section-heading"><div><span className="eyebrow">GETTING STARTED</span><h2>Three steps to a connected team.</h2></div><span className="section-index">01 — 03</span></div><div className="guide-steps"><GuideStep number="01" icon={<Building2 size={20}/>} title="Create a workspace" sub="Give every team its own space." done={Boolean(organization)} action={onCreateOrg}/><GuideStep number="02" icon={<UserPlus size={20}/>} title="Invite your people" sub="Add teammates with the right role." done={members.length > 1} action={canInvite ? onInvite : () => onPage('people')}/><GuideStep number="03" icon={<SearchCheck size={20}/>} title="Explore access" sub="See exactly what each role can open." done={false} action={() => onPage('access')}/></div></section>
      <section className="surface-card team-preview"><div className="section-heading"><div><span className="eyebrow">PEOPLE & PERMISSIONS</span><h2>Who's in your workspace</h2></div><button className="text-link" onClick={() => onPage('people')}>View all <ArrowUpRight size={16}/></button></div><div className="preview-team-list">{members.slice(0, 4).map(m => <div className="preview-team-row" key={m.id}><Avatar user={m.user}/><span><strong>{m.user.name}{m.user.id === currentUser?.id && <small className="you-label">YOU</small>}</strong><small>{m.user.title}</small></span><RoleBadge role={m.role}/></div>)}</div><button className="card-foot-link" onClick={() => onPage('people')}>Manage people & invitations <ArrowRight size={17}/></button></section></div>
    {role === 'viewer' && <div className="hint-banner"><Shield size={18}/><span>You're viewing this workspace as a <strong>Viewer</strong>. To explore administration, switch to Maya Patel using the profile menu.</span></div>}
  </div>;
}
function Stat({ label, value, icon, sub }: { label: string; value: string; icon: ReactNode; sub: string }) {
  return <div className="stat-card"><div className="stat-head"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{value}</strong><small><span className="tiny-positive-dot"/> {sub}</small></div>;
}
function GuideStep({ number, icon, title, sub, done, action }: { number: string; icon: ReactNode; title: string; sub: string; done: boolean; action: () => void }) {
  return <button className="guide-step" onClick={action}><span className="guide-step-num">{number}</span><span className="guide-step-icon">{icon}</span><span className="guide-step-copy"><strong>{title}</strong><small>{sub}</small></span>{done ? <span className="step-done"><Check size={15}/></span> : <ArrowUpRight size={17} className="step-link"/>}</button>;
}

function People({ data, canInvite, canManage, busy, onInvite, onAccept, onRevoke, onRole, onRemove }: { data: WorkspaceSnapshot; canInvite: boolean; canManage: boolean; busy: boolean; onInvite: () => void; onAccept: (id: string) => void; onRevoke: (id: string) => void; onRole: (id: string, role: Exclude<Role, 'owner'>) => void; onRemove: (m: MembershipView) => void }) {
  const invites = data.invitations.filter(i => i.status === 'pending');
  return <div className="page-enter"><PageHeader eyebrow="TEAM MANAGEMENT / 01" title="People & invitations" description="One clear place to manage who's in your workspace and what they can do." action={canInvite && <button className="btn btn-primary" onClick={onInvite}><UserPlus size={17}/> Invite teammate</button>}/>
    <div className="context-strip"><span className="context-icon"><Users size={20}/></span><div><strong>{data.members.length} active people in {data.organization?.name}</strong><span>Each person has one role in this organization. Roles may be different in other workspaces.</span></div><span className="context-decoration">TEAM</span></div>
    <section className="surface-card table-card"><div className="section-heading table-heading"><div><h2>Team members</h2><p>Change a role to update what that person can access.</p></div><span className="count-tag">{data.members.length} PEOPLE</span></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>PERSON</th><th>ROLE / ACCESS</th><th>JOINED</th><th className="right-th">MANAGE</th></tr></thead><tbody>{data.members.map(m => {
        const editable = canManage && canChangeRole(data.role, m.role, 'viewer');
        return <tr key={m.id}><td><div className="table-person"><Avatar user={m.user}/><div><strong>{m.user.name}{m.user.id === data.currentUser?.id && <small className="you-label">YOU</small>}</strong><span>{m.user.email}</span></div></div></td><td><div className="role-cell">{editable ? <select className="role-select" disabled={busy} aria-label={`Role for ${m.user.name}`} value={m.role} onChange={e => onRole(m.id, e.target.value as Exclude<Role, 'owner'>)}>{(['admin', 'member', 'viewer'] as const).map(role => <option value={role} key={role} disabled={!canChangeRole(data.role, m.role, role)}>{roleLabels[role]}</option>)}</select> : <RoleBadge role={m.role}/>}<small className="role-cell-hint">{m.role === 'owner' ? 'Full control' : m.role === 'admin' ? 'Manage access' : m.role === 'member' ? 'Contribute' : 'Read only'}</small></div></td><td className="muted-cell">{formatDate(m.joinedAt)}</td><td><div className="table-actions">{editable ? <button title={`Remove ${m.user.name}`} aria-label={`Remove ${m.user.name}`} className="icon-btn danger-icon" onClick={() => onRemove(m)}><Trash2 size={17}/></button> : <span className="table-dash">—</span>}</div></td></tr>;
      })}</tbody></table></div></section>
    {canInvite && <section className="surface-card invitations-card"><div className="section-heading"><div><h2>Pending invitations</h2><p>Invitations waiting to become team memberships.</p></div><span className="count-tag">{invites.length} PENDING</span></div>{invites.length ? <div className="invite-list">{invites.map(i => <div className="invite-row" key={i.id}><span className="invite-avatar"><UserPlus size={18}/></span><div className="invite-info"><strong>{i.email}</strong><small>Invited {timeAgo(i.createdAt)} · {roleLabels[i.role]} access</small></div><div className="invite-row-actions"><button className="btn btn-secondary btn-compact" disabled={busy} onClick={() => onRevoke(i.id)}>Revoke</button>{isDemoMode && <button className="btn btn-primary btn-compact" disabled={busy} onClick={() => onAccept(i.id)}>Simulate acceptance <Check size={15}/></button>}</div></div>)}</div> : <EmptyState icon={<UserPlus size={22}/>} title="No invitations waiting" description="Everyone you invited has joined, or you haven't invited anyone yet." action={<button className="btn btn-secondary" onClick={onInvite}><Plus size={16}/> Invite someone</button>}/>}<div className="invite-note"><CircleHelp size={17}/> In preview, accepting an invitation is simulated here. No emails are delivered.</div></section>}
    <section className="surface-card role-help"><div className="section-heading"><div><h2>Understanding roles</h2><p>Keep access understandable. Start with the least access someone needs.</p></div><ShieldCheck size={24} className="muted-icon"/></div><div className="role-explainer-grid">{(['owner', 'admin', 'member', 'viewer'] as const).map(role => <div className="role-explainer" key={role}><RoleBadge role={role}/><p>{roleDescriptions[role]}</p></div>)}</div></section>
  </div>;
}

function AccessExplorer({ data, canCreate, busy, onCreate, onOpen, onPeople }: { data: WorkspaceSnapshot; canCreate: boolean; busy: boolean; onCreate: () => void; onOpen: (r: ResourceView) => void; onPeople: () => void }) {
  const resourceIcons = { Document: FileText, Application: KeyRound, Workspace: Layers3 };
  const accessible = data.resources.filter(r => r.allowed).length;
  return <div className="page-enter"><PageHeader eyebrow="PERMISSIONS / 02" title="Access explorer" description="See what your role can open, and how permissions work across your workspace." action={canCreate && <button className="btn btn-primary" onClick={onCreate}><Plus size={17}/> Add resource</button>}/>
    <div className="access-summary"><div className="access-summary-icon"><Fingerprint size={32}/></div><div className="access-summary-copy"><span className="eyebrow">YOUR CURRENT ACCESS</span><h2>{roleLabels[data.role!]} in {data.organization?.name}</h2><p>You can open <strong>{accessible} of {data.resources.length}</strong> resources. Switch demo identities from your profile to see how access changes.</p></div><RoleBadge role={data.role!}/></div>
    <div className="section-heading resource-heading"><div><h2>Workspace resources</h2><p>Open a resource to test its permission check. Restricted items are marked with a lock.</p></div><span className="count-tag">{data.resources.length} RESOURCES</span></div>
    <div className="resource-grid">{data.resources.map(r => { const Icon = resourceIcons[r.type]; return <button disabled={busy} key={r.id} className={`resource-card ${!r.allowed ? 'resource-locked' : ''}`} onClick={() => onOpen(r)}><div className="resource-card-top"><span className={`resource-icon resource-icon-${r.type.toLowerCase()}`}><Icon size={23}/></span><span className={`resource-state ${r.allowed ? 'resource-state-allowed' : 'resource-state-locked'}`}>{r.allowed ? <><CheckCircle2 size={14}/> Accessible</> : <><LockKeyhole size={14}/> Restricted</>}</span></div><h3>{r.title}</h3><p>{r.description}</p><div className="resource-card-foot"><span><Users size={15}/> {accessLabels[r.access]}</span><span>{r.allowed ? 'Open' : 'Try access'} <ArrowUpRight size={15}/></span></div></button>; })}</div>
    <section className="surface-card permission-card"><div className="section-heading"><div><span className="eyebrow">ROLE REFERENCE</span><h2>Know exactly who can do what.</h2><p>These are the rules used by this frontend preview.</p></div><button className="text-link" onClick={onPeople}>Manage roles <ArrowUpRight size={16}/></button></div><div className="table-scroll"><table className="permission-table"><thead><tr><th>PERMISSION</th>{(['owner', 'admin', 'member', 'viewer'] as const).map(r => <th key={r}>{roleLabels[r]}</th>)}</tr></thead><tbody>{([['Manage organization', 'org:manage'], ['Invite teammates', 'members:invite'], ['Change member roles', 'members:manage'], ['Add resources', 'resource:create'], ['View shared resources', 'resource:view'], ['View activity history', 'audit:view']] as const).map(([label, perm]) => <tr key={perm}><td>{label}</td>{(['owner', 'admin', 'member', 'viewer'] as const).map(r => <td key={r}><span className={`permission-icon ${rolePermissions[r].includes(perm) ? 'permission-yes' : 'permission-no'}`}>{rolePermissions[r].includes(perm) ? <Check size={16}/> : <X size={15}/>}</span></td>)}</tr>)}</tbody></table></div><div className="permission-caution"><ShieldAlert size={17}/> This preview models authorization rules locally. A real backend must independently enforce every permission and tenant boundary.</div></section>
  </div>;
}

function ActivityLog({ data, allowed, onPeople }: { data: WorkspaceSnapshot; allowed: boolean; onPeople: () => void }) {
  if (!allowed) return <AccessDenied title="Activity history is restricted" description="Only workspace admins and owners can review the activity log. Your current role doesn't have that permission." action={<button className="btn btn-secondary" onClick={onPeople}><ArrowRight size={16}/> See your team</button>}/>;
  return <div className="page-enter"><PageHeader eyebrow="SECURITY / 03" title="Activity log" description="A clear record of membership, invitation, and resource changes in this workspace."/><div className="context-strip"><span className="context-icon"><ClipboardCheck size={20}/></span><div><strong>Workspace-scoped activity</strong><span>Only events from {data.organization?.name} appear here, never from your other organizations.</span></div></div>
    <section className="surface-card activity-card"><div className="section-heading"><div><h2>Recent changes</h2><p>Who changed what, and when.</p></div><span className="count-tag">LATEST {data.activities.length}</span></div>{data.activities.length ? <div className="activity-list">{data.activities.map(a => { const actor = data.demoUsers.find(u => u.id === a.actorId); return <div className="activity-row" key={a.id}><span className="activity-symbol"><ActivityIcon size={18}/></span><div><strong>{a.action}</strong><p>{a.detail}</p><small>{actor?.name ?? 'System'} · {formatDate(a.createdAt)}</small></div><span className="activity-time">{timeAgo(a.createdAt)}</span></div>; })}</div> : <EmptyState icon={<Clock3 size={22}/>} title="No activity yet" description="Invitations, role changes, and other workspace updates will be recorded here."/>}</section>
    <div className="hint-banner"><ShieldCheck size={19}/><span>In the full-stack release, audit events will be written server-side to a tamper-resistant history. Current events are editable browser preview data.</span></div>
  </div>;
}

function Settings({ data, canManage, onEdit, onReset, onOrg }: { data: WorkspaceSnapshot; canManage: boolean; onEdit: () => void; onReset: () => void; onOrg: () => void }) {
  return <div className="page-enter"><PageHeader eyebrow="WORKSPACE / 04" title="Workspace settings" description="Manage the details of your organization and understand the preview environment."/><section className="surface-card settings-card"><div className="section-heading"><div><h2>Organization details</h2><p>Basic information for this workspace.</p></div>{canManage && <button className="btn btn-secondary" onClick={onEdit}>Edit details <ArrowUpRight size={16}/></button>}</div><div className="settings-detail-grid"><div><span>WORKSPACE NAME</span><strong>{data.organization?.name}</strong></div><div><span>WORKSPACE SLUG</span><strong>{data.organization?.slug}</strong></div><div><span>INDUSTRY</span><strong>{data.organization?.industry}</strong></div><div><span>YOUR ROLE</span><RoleBadge role={data.role!}/></div></div>{!canManage && <div className="inline-restriction"><LockKeyhole size={17}/> Only the organization owner can edit these details.</div>}</section>
    <section className="surface-card settings-card"><div className="section-heading"><div><h2>Organizations</h2><p>You're a member of {data.organizations.length} workspace{data.organizations.length === 1 ? '' : 's'}.</p></div><button className="btn btn-secondary" onClick={onOrg}><Plus size={16}/> New workspace</button></div><div className="settings-org-list">{data.organizations.map(o => <div key={o.id}><span className="settings-org-icon">{initials(o.name).slice(0, 2)}</span><span><strong>{o.name}</strong><small>{o.slug}</small></span><RoleBadge role={o.role}/>{o.id === data.organization?.id && <span className="current-tag">Current</span>}</div>)}</div></section>
    {isDemoMode && <section className="surface-card settings-card preview-settings"><div className="section-heading"><div><h2>Preview environment</h2><p>Everything here is simulated and stored locally in your browser.</p></div><span className="preview-settings-badge">MOCK MODE</span></div><div className="preview-points"><p><CheckCircle2 size={18}/> Interactions, memberships, resources, and role checks work in this preview.</p><p><ShieldOff size={18}/> There is no secure login, server-enforced permission, or real invitation email.</p><p><Globe2 size={18}/> The real backend will replace the mock service without changing these screens.</p></div><div className="settings-reset"><div><strong>Start fresh</strong><p>Restore the original sample accounts, workspaces, and permissions.</p></div><button className="btn btn-secondary" onClick={onReset}><ArrowLeftRight size={16}/> Reset preview data</button></div></section>}
  </div>;
}
function AccessDenied({ title, description, action }: { title: string; description: string; action: ReactNode }) {
  return <div className="access-denied page-enter"><span className="denied-icon"><LockKeyhole size={28}/></span><span className="eyebrow">ACCESS RESTRICTED</span><h1>{title}</h1><p>{description}</p>{action}</div>;
}

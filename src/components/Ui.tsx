import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Role, User } from '../lib/domain';
import { roleLabels } from '../lib/policy';
import { initials } from '../lib/utils';

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return <span className={`brand ${inverse ? 'brand-inverse' : ''}`}>
    <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
    <span className="brand-name">nodal<span className="brand-dot">.</span></span>
  </span>;
}
export function Avatar({ user, size = 'md' }: { user: User; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`avatar avatar-${user.color} avatar-${size}`} title={user.email} aria-label={user.name}>{initials(user.name)}</span>;
}
export function RoleBadge({ role }: { role: Role }) {
  return <span className={`role-badge role-${role}`}><span className="role-dot" />{roleLabels[role]}</span>;
}
export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
export function Dialog({ title, eyebrow, description, onClose, children, wide = false }: { title: string; eyebrow?: string; description?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="dialog-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} role="presentation">
    <section role="dialog" aria-modal="true" aria-label={title} className={`dialog ${wide ? 'dialog-wide' : ''}`}>
      <div className="dialog-head"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div><button type="button" className="icon-btn dialog-x" onClick={onClose} aria-label="Close dialog"><X size={19}/></button></div>
      <div className="dialog-body">{children}</div>
    </section>
  </div>;
}
export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action && <div className="page-action">{action}</div>}</div>;
}
export function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return <button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Working…' : children}</button>;
}

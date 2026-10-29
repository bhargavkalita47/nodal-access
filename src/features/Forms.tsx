import { useState, type FormEvent } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import type { CreateOrganizationInput, CreateResourceInput, InviteInput, Organization, Role } from '../lib/domain';
import { roleDescriptions, roleLabels } from '../lib/policy';
import { SubmitButton } from '../components/Ui';

const toSlug = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
type Props<T> = { busy: boolean; onClose: () => void; onSubmit: (value: T) => Promise<boolean> };

export function OrganizationForm({ busy, onClose, onSubmit, original }: Props<CreateOrganizationInput> & { original?: Organization }) {
  const [name, setName] = useState(original?.name ?? '');
  const [slug, setSlug] = useState(original?.slug ?? '');
  const [industry, setIndustry] = useState(original?.industry ?? 'Technology');
  const [slugEdited, setSlugEdited] = useState(Boolean(original));
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await onSubmit({ name, slug, industry })) onClose(); };
  return <form className="app-form" onSubmit={submit}>
    <label className="field"><span>Organization name <b>*</b></span><input required autoFocus minLength={2} maxLength={60} value={name} placeholder="e.g. Meridian Studio" onChange={e => { setName(e.target.value); if (!slugEdited) setSlug(toSlug(e.target.value)); }}/></label>
    <label className="field"><span>Workspace URL <b>*</b></span><div className="input-prefix"><span>nodal.app/</span><input required minLength={3} maxLength={40} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} placeholder="meridian-studio" onChange={e => { setSlugEdited(true); setSlug(e.target.value.toLowerCase()); }}/></div><small>Lowercase letters, numbers, and hyphens only. Preview URL; not a live hosted route.</small></label>
    <label className="field"><span>Industry</span><select value={industry} onChange={e => setIndustry(e.target.value)}><option>Technology</option><option>Design & creative</option><option>Finance</option><option>Retail & commerce</option><option>Operations</option><option>Education</option><option>Other</option></select></label>
    {!original && <p className="info-note"><Info size={16}/>You'll automatically become the owner and can invite teammates next.</p>}
    <div className="form-actions"><button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button><SubmitButton busy={busy}>{original ? 'Save changes' : <>Create workspace <ArrowRight size={16}/></>}</SubmitButton></div>
  </form>;
}

export function InviteForm({ busy, onClose, onSubmit, actorRole }: Props<InviteInput> & { actorRole: Role }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteInput['role']>('member');
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await onSubmit({ email, role })) onClose(); };
  const roles: InviteInput['role'][] = actorRole === 'owner' ? ['admin', 'member', 'viewer'] : ['member', 'viewer'];
  return <form className="app-form" onSubmit={submit}>
    <label className="field"><span>Email address <b>*</b></span><input autoFocus type="email" required placeholder="teammate@company.com" value={email} onChange={e => setEmail(e.target.value)} /></label>
    <div className="field"><span>Choose their access</span><div className="role-choices">{roles.map(item => <label key={item} className={`role-choice ${role === item ? 'selected' : ''}`}><input type="radio" name="role" checked={role === item} onChange={() => setRole(item)}/><span className="choice-radio"/><span className="choice-copy"><strong>{roleLabels[item]}</strong><small>{roleDescriptions[item]}</small></span></label>)}</div></div>
    <p className="info-note"><Info size={16}/>Preview mode: this creates a pending invitation in your browser. No email is sent. You can simulate acceptance from the People page.</p>
    <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><SubmitButton busy={busy}>Create invitation <ArrowRight size={16}/></SubmitButton></div>
  </form>;
}

export function ResourceForm({ busy, onClose, onSubmit, actorRole }: Props<CreateResourceInput> & { actorRole: Role }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CreateResourceInput['type']>('Document');
  const [access, setAccess] = useState<CreateResourceInput['access']>('everyone');
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await onSubmit({ title, description, type, access })) onClose(); };
  return <form className="app-form" onSubmit={submit}>
    <label className="field"><span>Resource name <b>*</b></span><input autoFocus required minLength={3} maxLength={70} placeholder="e.g. Quarterly planning" value={title} onChange={e => setTitle(e.target.value)}/></label>
    <label className="field"><span>Description</span><textarea rows={3} maxLength={240} placeholder="What can your team find here?" value={description} onChange={e => setDescription(e.target.value)}/></label>
    <div className="two-fields"><label className="field"><span>Resource type</span><select value={type} onChange={e => setType(e.target.value as CreateResourceInput['type'])}><option>Document</option><option>Application</option><option>Workspace</option></select></label><label className="field"><span>Who can open it?</span><select value={access} onChange={e => setAccess(e.target.value as CreateResourceInput['access'])}><option value="everyone">All members</option><option value="contributors">Members & above</option>{actorRole !== 'member' && <option value="administrators">Admins & owners</option>}</select></label></div>
    <p className="info-note"><Info size={16}/>This creates a sample resource record, not an external document or application.</p>
    <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><SubmitButton busy={busy}>Add resource <ArrowRight size={16}/></SubmitButton></div>
  </form>;
}

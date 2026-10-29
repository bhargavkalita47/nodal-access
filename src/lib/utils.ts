import type { User } from './domain';

export const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
export const formatDate = (iso: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
export const timeAgo = (iso: string) => {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return formatDate(iso);
};
export const avatarProps = (user: User) => ({ title: user.email, 'aria-label': user.name });

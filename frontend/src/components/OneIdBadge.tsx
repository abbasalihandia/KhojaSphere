import { ShieldCheck, ShieldAlert, Clock, ShieldOff } from 'lucide-react';
import { isVerifiedState, resolveOwnerBadge, type OneIdState, type OwnerOneId } from '../api/oneId';
import { useOneId } from '../context/OneIdContext';

type Size = 'icon' | 'chip' | 'full';

interface BadgeProps {
  state: OneIdState;
  size?: Size;
  /** Jamaat name, shown in the tooltip only (and only if the member chose to share it) */
  jamaat?: string | null;
  className?: string;
}

const LABEL: Record<OneIdState, string> = {
  none: '',
  active: 'Verified Jamaat Member',
  expiring: 'Verified Jamaat Member',
  pending: 'One ID pending',
  expired: 'One ID expired',
  inactive: 'One ID inactive',
  suspended: 'One ID on hold',
};

const STYLE: Record<OneIdState, string> = {
  none: '',
  active: 'bg-brand-50 text-brand-700 border-brand-200',
  expiring: 'bg-brand-50 text-brand-700 border-brand-200',
  pending: 'bg-gold-50 text-gold-700 border-gold-200',
  expired: 'bg-gray-100 text-gray-600 border-gray-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
  suspended: 'bg-gray-100 text-gray-600 border-gray-200',
};

function Icon({ state, className }: { state: OneIdState; className: string }) {
  if (state === 'pending') return <Clock className={className} aria-hidden="true" />;
  if (state === 'expired' || state === 'inactive') return <ShieldAlert className={className} aria-hidden="true" />;
  if (state === 'suspended') return <ShieldOff className={className} aria-hidden="true" />;
  return <ShieldCheck className={className} aria-hidden="true" />;
}

/**
 * The One ID indicator. Icon + text always travel together (colour is never the only signal).
 * Public surfaces should use <OwnerBadge/> below, which only ever renders the verified state.
 */
export default function OneIdBadge({ state, size = 'chip', jamaat, className = '' }: BadgeProps) {
  if (state === 'none') return null;
  const label = LABEL[state];
  const tip = isVerifiedState(state)
    ? `${label}${jamaat ? ` · ${jamaat}` : ''}. Identity confirmed through the community One ID.`
    : label;

  if (size === 'icon') {
    return (
      <span title={tip} role="img" aria-label={label} className={`inline-flex items-center justify-center rounded-full border p-0.5 ${STYLE[state]} ${className}`}>
        <Icon state={state} className="w-3.5 h-3.5" />
      </span>
    );
  }
  return (
    <span title={tip} className={`inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap ${size === 'full' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs'} ${STYLE[state]} ${className}`}>
      <Icon state={state} className={size === 'full' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      {label}
    </span>
  );
}

interface OwnerBadgeProps {
  /** the listing / mentor / search result the badge belongs to */
  item: { id: number; isOwner?: boolean; ownerOneId?: OwnerOneId | null };
  kind: 'business' | 'professional' | 'property' | 'marketplace' | 'mentor';
  size?: Size;
  className?: string;
}

/**
 * Badge for "the person behind this listing". Renders nothing unless the owner is verified AND chose to show the badge.
 * Adds a "Same Jamaat" pill when both people have chosen to share their Jamaat and it matches.
 */
export function OwnerBadge({ item, kind, size = 'chip', className = '' }: OwnerBadgeProps) {
  const one = useOneId();
  if (!one.enabled) return null;

  // Your own listings reflect your own live One ID state and privacy settings.
  if (item.isOwner) {
    if (!one.visibility.showBadge || !isVerifiedState(one.state)) return null;
    return <OneIdBadge state={one.state === 'expiring' ? 'active' : one.state} size={size} jamaat={one.visibility.showJamaat ? one.profile?.jamaat.name : null} className={className} />;
  }

  const owner = resolveOwnerBadge(item, kind);
  if (!owner) return null;
  const mine = one.visibility.showJamaat && isVerifiedState(one.state) ? one.profile?.jamaat.name : null;
  const same = !!mine && !!owner.jamaat && mine.trim().toLowerCase() === owner.jamaat.trim().toLowerCase();

  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      <OneIdBadge state="active" size={size} jamaat={owner.jamaat} />
      {same && size !== 'icon' && <span className="text-xs px-2 py-0.5 rounded-full bg-gold-50 text-gold-700 border border-gold-200 whitespace-nowrap">Same Jamaat</span>}
    </span>
  );
}

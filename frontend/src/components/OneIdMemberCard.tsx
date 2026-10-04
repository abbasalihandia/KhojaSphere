import { useRef, useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Camera } from 'lucide-react';
import { formatValidUntil, maskOneId, type OneIdProfile, type OneIdState } from '../api/oneId';

const STATUS_LABEL: Record<OneIdState, string> = {
  none: '', active: 'Active', expiring: 'Expiring soon', pending: 'Pending', expired: 'Expired', inactive: 'Inactive', suspended: 'On hold',
};
const STATUS_DOT: Record<OneIdState, string> = {
  none: 'bg-gray-400', active: 'bg-emerald-400', expiring: 'bg-gold-300', pending: 'bg-gold-300',
  expired: 'bg-gray-400', inactive: 'bg-gray-400', suspended: 'bg-gray-400',
};

interface Props {
  profile: OneIdProfile;
  state: OneIdState;
  /** name to print on the card (demo mode prints the signed-in member's own name) */
  name: string;
  photoUrl?: string | null;
  /** demo only: let the member pick a photo for the sample card */
  onPickPhoto?: (file: File) => void;
  demo?: boolean;
}

/**
 * A member-only "ID card" view of the linked One ID. KhojaSphere's own design: the issuer's logos and wordmark are
 * intentionally NOT reproduced; swap in official artwork only once the One ID team provides and approves it.
 */
export default function OneIdMemberCard({ profile, state, name, photoUrl, onPickPhoto, demo }: Props) {
  const [reveal, setReveal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dim = state === 'expired' || state === 'inactive' || state === 'suspended';

  return (
    <div>
      <div
        className={`relative overflow-hidden rounded-2xl text-white shadow-lg aspect-[1.586/1] w-full max-w-md ${dim ? 'opacity-80 saturate-50' : ''}`}
        style={{
          backgroundColor: 'var(--color-brand-950)',
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 14px), radial-gradient(120% 90% at 100% 0%, rgba(211,170,53,0.18), transparent 55%)',
        }}
        role="group"
        aria-label={`One ID card for ${name}`}
      >
        {/* gold corner band */}
        <div className="absolute top-0 right-0 h-2 w-2/5 bg-gold-400" aria-hidden="true" />
        {demo && (
          <span className="absolute top-3 right-3 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-gold-400 text-brand-950">Demo card</span>
        )}

        <div className="absolute inset-0 p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-gold-300" aria-hidden="true" />
            <div className="leading-tight">
              <div className="font-display font-bold text-base">One ID</div>
              <div className="text-[11px] text-white/60">{profile.jamaat.name} · {profile.federation.name}</div>
            </div>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="font-display font-bold text-xl sm:text-2xl leading-tight break-words">{name}</div>
              <div className="mt-1 flex items-center gap-2 text-sm text-white/80">
                <span className="font-mono tracking-wide" aria-label={reveal ? 'One ID number' : 'One ID number, hidden'}>
                  {reveal ? profile.oneIdNumber : maskOneId(profile.oneIdNumber)}
                </span>
                <button
                  type="button" onClick={() => setReveal((v) => !v)}
                  aria-label={reveal ? 'Hide One ID number' : 'Show One ID number'} aria-pressed={reveal}
                  className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10"
                >
                  {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-xs">
                <dt className="text-white/50">Status</dt>
                <dd className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${STATUS_DOT[state]}`} aria-hidden="true" />{STATUS_LABEL[state]}</dd>
                <dt className="text-white/50">Valid until</dt>
                <dd>{formatValidUntil(profile.validUntil)}</dd>
              </dl>
            </div>

            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-gold-400/80 bg-brand-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {photoUrl ? (
                <img src={photoUrl} alt={`Photo of ${name}`} className="w-full h-full object-cover" />
              ) : (
                <span className="font-display font-bold text-3xl text-gold-300" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {onPickPhoto && (
        <>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="Choose a photo for the sample card"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickPhoto(f); e.target.value = ''; }} />
          <button type="button" onClick={() => fileRef.current?.click()} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-900">
            <Camera className="w-3.5 h-3.5" />{photoUrl ? 'Change photo' : 'Add a photo'}
          </button>
          <p className="text-xs text-gray-400 mt-1">Demo only: the photo stays in this browser. With the real One ID, the photo comes from your One ID.</p>
        </>
      )}
    </div>
  );
}

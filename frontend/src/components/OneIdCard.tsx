import { useState } from 'react';
import { ShieldCheck, Store, MessageSquare, Users } from 'lucide-react';
import { getOneIdState } from '../api/oneId';
import { useAuth } from '../context/AuthContext';
import { useOneId } from '../context/OneIdContext';
import OneIdBadge from './OneIdBadge';
import OneIdLinkModal from './OneIdLinkModal';
import OneIdMemberCard from './OneIdMemberCard';

// Demo only: a locally stored photo for the sample card (downscaled so it fits in localStorage).
const photoKey = (id: number) => `khojasphere.mock.oneid.photo.${id}`;
const readPhoto = (id: number) => { try { return localStorage.getItem(photoKey(id)); } catch { return null; } };
function downscale(file: File, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not an image we can read.')); };
    img.src = url;
  });
}

const STATE_NOTE: Record<string, string> = {
  active: 'Your badge is visible to other members.',
  expiring: 'Still valid. Renew with your Jamaat before the date below to keep your badge.',
  pending: 'Waiting for confirmation. Your badge will appear once it is confirmed.',
  expired: 'Expired, so your badge is hidden. Renew with your Jamaat, then link again.',
  inactive: 'Inactive, so your badge is hidden. Contact your Jamaat office.',
  suspended: 'On hold, so your badge is hidden. Contact your Jamaat office.',
};

/** "My Profile → One ID" panel: link prompt when unlinked, status card when linked. */
export default function OneIdCard() {
  const one = useOneId();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [localPhoto, setLocalPhoto] = useState<string | null>(() => (user ? readPhoto(user.id) : null));
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!one.enabled) return null;

  const state = getOneIdState(one.profile);
  const p = one.profile;

  const pickPhoto = async (file: File) => {
    setPhotoError(null);
    try {
      const data = await downscale(file);
      setLocalPhoto(data);
      if (user) { try { localStorage.setItem(photoKey(user.id), data); } catch { /* photo just won't persist */ } }
    } catch (e) { setPhotoError(e instanceof Error ? e.message : 'Could not use that photo.'); }
  };

  const unlink = async () => {
    setBusy(true);
    try { await one.unlink(); setConfirmUnlink(false); } catch { /* error is shown from context */ } finally { setBusy(false); }
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5" aria-labelledby="oneid-card-title">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 id="oneid-card-title" className="font-display font-semibold text-brand-900 text-base">One ID</h2>
          <p className="text-xs text-gray-400 mt-0.5">Your community identity</p>
        </div>
        {p && <OneIdBadge state={state} size="chip" />}
      </div>

      {one.loading ? (
        <p className="text-sm text-gray-400" role="status">Checking your One ID…</p>
      ) : !p ? (
        <div>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">Link your One ID to show you are a verified Jamaat member. It helps others trust your listings, inquiries, and mentoring.</p>
          <ul className="grid sm:grid-cols-3 gap-2 mb-5 text-xs text-gray-600">
            <li className="flex items-center gap-2 bg-brand-50 rounded-xl px-3 py-2"><Store className="w-4 h-4 text-brand-600 flex-shrink-0" />Trusted listings</li>
            <li className="flex items-center gap-2 bg-brand-50 rounded-xl px-3 py-2"><MessageSquare className="w-4 h-4 text-brand-600 flex-shrink-0" />Inquiries that get answered</li>
            <li className="flex items-center gap-2 bg-brand-50 rounded-xl px-3 py-2"><Users className="w-4 h-4 text-brand-600 flex-shrink-0" />Find your own Jamaat</li>
          </ul>
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-800 text-white text-sm font-semibold rounded-xl hover:bg-brand-700">
            <ShieldCheck className="w-4 h-4 text-gold-300" />Link One ID
          </button>
        </div>
      ) : (
        <div>
          <OneIdMemberCard
            profile={p}
            state={state}
            name={one.mode === 'mock' && user ? user.name : p.fullName}
            photoUrl={user?.avatarUrl ?? localPhoto}
            demo={one.mode === 'mock'}
            onPickPhoto={one.mode === 'mock' ? pickPhoto : undefined}
          />
          {photoError && <p role="alert" className="text-xs text-red-600 mt-1">{photoError}</p>}
          <p className="text-xs text-gray-500 mt-5 bg-surface rounded-xl px-3 py-2.5">{STATE_NOTE[state]}</p>

          <div className="flex flex-wrap gap-2 mt-4">
            {state !== 'active' && <button onClick={() => setOpen(true)} className="px-4 py-2 text-sm font-medium text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50">Link again</button>}
            {!confirmUnlink ? (
              <button onClick={() => setConfirmUnlink(true)} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Unlink One ID</button>
            ) : (
              <div className="flex items-center gap-2 text-sm" role="alertdialog" aria-label="Confirm unlink">
                <span className="text-gray-600">Remove your badge and unlink?</span>
                <button onClick={unlink} disabled={busy} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-60">{busy ? 'Unlinking…' : 'Unlink'}</button>
                <button onClick={() => setConfirmUnlink(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600">Keep</button>
              </div>
            )}
          </div>
        </div>
      )}

      {one.error && <p role="alert" className="mt-3 text-xs text-red-600">{one.error}</p>}
      {open && <OneIdLinkModal onClose={() => setOpen(false)} />}
    </section>
  );
}

import { useState } from 'react';
import { isVerifiedState } from '../api/oneId';
import { useOneId } from '../context/OneIdContext';

function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
      <div>
        <div className="text-sm font-medium text-gray-800">{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{hint}</div>
      </div>
      <button
        type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors disabled:opacity-50 ${checked ? 'bg-brand-600' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

/** What other members can see. Only shown once an ID is linked. */
export default function VisibilitySettings() {
  const one = useOneId();
  const [busy, setBusy] = useState(false);
  if (!one.enabled || !one.profile) return null;

  const verified = isVerifiedState(one.state);
  const set = async (patch: Partial<typeof one.visibility>) => {
    setBusy(true);
    try { await one.saveVisibility({ ...one.visibility, ...patch }); } catch { /* error shown from context */ } finally { setBusy(false); }
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5" aria-labelledby="oneid-vis-title">
      <h2 id="oneid-vis-title" className="font-display font-semibold text-brand-900 text-base">Who can see what</h2>
      <p className="text-xs text-gray-400 mt-0.5 mb-2">Applies to your listings, inquiries, and mentor profile.</p>
      <Toggle
        checked={one.visibility.showBadge} disabled={busy || !verified}
        onChange={(v) => set({ showBadge: v, ...(v ? {} : { showJamaat: false }) })}
        label="Show my Verified Jamaat Member badge"
        hint={verified ? 'Other members see the badge next to your name.' : 'Available once your One ID is active.'}
      />
      <Toggle
        checked={one.visibility.showJamaat && one.visibility.showBadge} disabled={busy || !verified || !one.visibility.showBadge}
        onChange={(v) => set({ showJamaat: v })}
        label="Show my Jamaat"
        hint="Lets members from your Jamaat see a Same Jamaat label. Off by default."
      />
      <p className="text-xs text-gray-400 mt-3">Your full One ID number, photo, and other details are never shown to other members.</p>
    </section>
  );
}

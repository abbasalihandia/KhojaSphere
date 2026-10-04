import { useEffect, useRef, useState } from 'react';
import { X, ShieldCheck, Info, Loader2 } from 'lucide-react';
import { formatValidUntil, getOneIdState, isVerifiedState, maskOneId } from '../api/oneId';
import { useOneId } from '../context/OneIdContext';
import OneIdBadge from './OneIdBadge';

const RESULT_COPY = {
  active: 'Your One ID is linked. You now show as a Verified Jamaat Member wherever you appear on KhojaSphere.',
  expiring: 'Your One ID is linked and still valid, but it expires soon. Renew it with your Jamaat to keep your badge.',
  pending: 'Your One ID is registered but not confirmed yet. Your badge will appear once it is confirmed.',
  expired: 'This One ID has expired, so no badge is shown. Renew it with your Jamaat, then link again.',
  inactive: 'This One ID is inactive, so no badge is shown. Contact your Jamaat office for help.',
  suspended: 'This One ID is on hold, so no badge is shown. Contact your Jamaat office for help.',
  none: '',
} as const;

export default function OneIdLinkModal({ onClose }: { onClose: () => void }) {
  const one = useOneId();
  const [scenario, setScenario] = useState(one.scenarios[0]?.id ?? 'active');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await one.link(scenario);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not reach One ID. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const state = getOneIdState(one.profile);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="oneid-title" className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="oneid-title" className="font-display font-bold text-brand-900 text-lg">Link your One ID</h2>
          <button ref={closeRef} onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        {!done ? (
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0"><ShieldCheck className="w-5 h-5 text-brand-600" /></span>
              <p className="text-sm text-gray-600 leading-relaxed">
                Link your community One ID to show other members that you are a verified Jamaat member. You will confirm your identity on the One ID sign-in page; KhojaSphere never sees your password.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">What KhojaSphere will receive</h3>
              <ul className="text-sm text-gray-600 space-y-1.5 list-disc pl-5">
                <li>That your One ID is valid, and until when</li>
                <li>Your name and your Jamaat</li>
                <li>A reference to your One ID (shown to you masked)</li>
              </ul>
              <p className="text-xs text-gray-400 mt-2">Other members only see the badge. Your Jamaat stays hidden unless you choose to share it. You can unlink at any time.</p>
            </div>

            {one.mode === 'mock' && (
              <fieldset className="rounded-xl border border-dashed border-gold-300 bg-gold-50/60 p-4">
                <legend className="px-1 text-xs font-semibold text-gold-700">Demo mode: no real One ID is contacted</legend>
                <p className="text-xs text-gray-500 mb-2">Pick a test member to see how each state looks.</p>
                <div className="space-y-1.5">
                  {one.scenarios.map((s) => (
                    <label key={s.id} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer text-sm ${scenario === s.id ? 'border-brand-400 bg-white' : 'border-transparent hover:bg-white/70'}`}>
                      <input type="radio" name="oneid-scenario" value={s.id} checked={scenario === s.id} onChange={() => setScenario(s.id)} className="mt-1 accent-[var(--color-brand-600)]" />
                      <span><span className="font-medium text-gray-800">{s.label}</span><span className="block text-xs text-gray-500">{s.hint}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {error && <div role="alert" className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

            <div className="flex gap-2">
              <button onClick={onClose} className="px-5 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={submit} disabled={busy} className="flex-1 py-3 bg-brand-800 text-white font-semibold rounded-xl hover:bg-brand-700 text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" />Connecting…</> : 'Continue with One ID'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5" role="status">
            <div className="rounded-xl border border-gray-100 bg-surface p-4 space-y-2">
              <OneIdBadge state={state} size="full" />
              {one.profile && (
                <dl className="text-sm text-gray-600 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pt-1">
                  <dt className="text-gray-400">One ID</dt><dd>{maskOneId(one.profile.oneIdNumber)}</dd>
                  <dt className="text-gray-400">Jamaat</dt><dd>{one.profile.jamaat.name}</dd>
                  <dt className="text-gray-400">Valid until</dt><dd>{formatValidUntil(one.profile.validUntil)}</dd>
                </dl>
              )}
            </div>
            <p className="text-sm text-gray-600 flex items-start gap-2"><Info className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />{RESULT_COPY[state]}</p>
            {!isVerifiedState(state) && <p className="text-xs text-gray-400">You can try again from My Profile at any time.</p>}
            <button onClick={onClose} className="w-full py-3 bg-brand-800 text-white font-semibold rounded-xl hover:bg-brand-700 text-sm">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

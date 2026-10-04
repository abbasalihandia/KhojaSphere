import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { reports, errorMessage, type EntityType } from '../api';
import { useAuth } from '../context/AuthContext';

const REASONS = ['Incorrect contact info', 'Photos do not match listing', 'Suspected duplicate listing', 'Missing business details',
  'Scam or fraud', 'Inappropriate content', 'Other'];

interface Props { entityType: EntityType; entityId: number; title: string; onClose: () => void; onSignIn?: () => void }

export default function ReportModal({ entityType, entityId, title, onClose, onSignIn }: Props) {
  const { user } = useAuth();
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await reports.create({ entityType, entityId, reason, details: details.trim() || undefined });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-display font-bold text-brand-900 text-lg flex items-center gap-2"><Flag className="w-4 h-4 text-red-500" />Report listing</h2>
            <p className="text-sm text-gray-500 truncate max-w-[16rem]">{title}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        {!user ? (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-600 text-sm mb-5">Please sign in so our moderators can follow up on your report.</p>
            <button onClick={() => { onClose(); onSignIn?.(); }} className="px-6 py-2.5 bg-brand-800 text-white rounded-xl text-sm font-medium hover:bg-brand-700">Sign In</button>
          </div>
        ) : sent ? (
          <div className="px-6 py-8 text-center">
            <h3 className="font-display font-bold text-gray-800 text-lg mb-2">Thanks for the report</h3>
            <p className="text-gray-500 text-sm mb-5">Our moderators will review this listing.</p>
            <button onClick={onClose} className="px-6 py-2.5 bg-brand-800 text-white rounded-xl text-sm font-medium hover:bg-brand-700">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-200">
                {REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Details <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={1000} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 resize-none" />
            </div>
            {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2" role="alert">{error}</div>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={busy} className="flex-1 px-4 py-2.5 rounded-xl bg-brand-800 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-60">{busy ? 'Sending…' : 'Submit report'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

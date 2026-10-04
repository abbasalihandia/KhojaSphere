import { useState } from 'react';
import { X, Mail, Phone, MessageSquare, Info } from 'lucide-react';
import { inquiries, errorMessage, type EntityType, type OwnerOneId } from '../api';
import { useAuth } from '../context/AuthContext';
import { OwnerBadge } from './OneIdBadge';

interface InquiryModalProps {
  targetType: EntityType | 'mentor';
  targetId: number;
  /** shown in the header (business name, listing title, mentor name) */
  businessName: string;
  onClose: () => void;
  /** called when a signed-out visitor chooses to sign in */
  onSignIn?: () => void;
  /** One ID info for the recipient, when the caller already has it (the backend will send this later) */
  ownerOneId?: OwnerOneId | null;
}

export default function InquiryModal({ targetType, targetId, businessName, onClose, onSignIn, ownerOneId }: InquiryModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState(
    `Hi, I'm interested in your services. Could you share your availability and pricing?`
  );
  const [contactMethod, setContactMethod] = useState<'email' | 'phone' | 'platform'>('platform');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await inquiries.send({ targetType, targetId, name, message, contactMethod });
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-display font-bold text-brand-900 text-lg">Send Inquiry</h2>
            <p className="text-sm text-gray-500">{businessName}</p>
            <OwnerBadge item={{ id: targetId, ownerOneId }} kind={targetType} className="mt-1.5" />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!user ? (
          <div className="px-6 py-10 text-center">
            <h3 className="font-display font-bold text-gray-800 text-lg mb-2">Sign in to send an inquiry</h3>
            <p className="text-gray-500 text-sm mb-6">Inquiries are routed through your KhojaSphere account, so replies reach you safely.</p>
            <button
              onClick={() => { onClose(); onSignIn?.(); }}
              className="px-6 py-2.5 bg-brand-800 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        ) : sent ? (
          <div className="px-6 py-10 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-gray-800 text-xl mb-2">Inquiry Sent</h3>
            <p className="text-gray-500 text-sm mb-6">
              Your message has been forwarded. You will be notified when the business responds.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-brand-800 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Privacy note */}
            <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Your personal contact information is not shared directly with the business. All messages are routed through KhojaSphere.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Contact Method</label>
              <div className="flex gap-2">
                {([
                  { value: 'platform', label: 'Platform', Icon: MessageSquare },
                  { value: 'email', label: 'Email', Icon: Mail },
                  { value: 'phone', label: 'Phone', Icon: Phone },
                ] as const).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setContactMethod(value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      contactMethod === value
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2" role="alert">{error}</div>}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brand-800 text-white text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-60"
              >
                {busy ? 'Sending…' : 'Send Inquiry'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

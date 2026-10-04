import { useState } from 'react';
import { Eye, EyeOff, Sparkles, ArrowLeft, ShieldCheck } from 'lucide-react';
import type { PageProps, PageKey } from '../types';
import { ApiError, authApi, errorMessage, type AccountType } from '../api';
import { useAuth } from '../context/AuthContext';
import { useOneId } from '../context/OneIdContext';

type AuthMode = 'signin' | 'register' | 'forgot' | 'reset';

const accountTypes = [
  { value: 'member', label: 'Community Member' },
  { value: 'business', label: 'Business Owner' },
  { value: 'professional', label: 'Professional' },
  { value: 'property', label: 'Property Lister' },
  { value: 'seller', label: 'Marketplace Seller' },
  { value: 'mentor', label: 'Mentor' },
];

interface Props extends PageProps {
  mode?: AuthMode;
}

export default function Auth({ navigate, params }: Props) {
  const initialMode: AuthMode = (params?.mode as AuthMode) || 'signin';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPw, setShowPw] = useState(false);
  const { login, register } = useAuth();
  const oneId = useOneId();
  const [oneIdNote, setOneIdNote] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<string>(params?.role === 'mentor' ? 'mentor' : 'member');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const resetToken = typeof params?.token === 'string' ? params.token : '';
  const notice = typeof params?.notice === 'string' ? params.notice : null;
  const next = typeof params?.next === 'string' && params.next.startsWith('#/') ? params.next : '';
  const goAfterAuth = (fallback: PageKey, fallbackParams: Record<string, unknown> = {}) => {
    if (next) window.location.hash = next;
    else navigate(redirect?.page ?? fallback, redirect?.params ?? fallbackParams);
  };
  const redirect = params?.redirect as { page: PageKey; params?: Record<string, unknown> } | undefined;

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setError(null);
    setFieldErrors({});
    setSubmitted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      if (mode === 'forgot') {
        await authApi.forgotPassword(email);
        setSubmitted(true);
      } else if (mode === 'reset') {
        await authApi.resetPassword(resetToken, password);
        setSubmitted(true);
      } else if (mode === 'register') {
        await register({ name, email, password, city, accountType: accountType as AccountType });
        goAfterAuth(accountType === 'mentor' ? 'dashboard' : 'home', accountType === 'mentor' ? { section: 'profile' } : {});
      } else {
        await login(email, password);
        goAfterAuth('home');
      }
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError && err.details.length) {
        setFieldErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      }
    } finally {
      setBusy(false);
    }
  };

  const fieldErr = (f: string) => fieldErrors[f] && <p className="text-xs text-red-600 mt-1">{fieldErrors[f]}</p>;

  return (
    <div className="pt-16 pb-20 lg:pb-0 min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-800 to-brand-500 flex items-center justify-center shadow-md">
            <span className="text-white font-bold font-display">K</span>
          </div>
          <span className="font-display font-bold text-brand-900 text-xl">
            Khoja<span className="text-brand-500">Sphere</span>
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tabs (sign in / register) */}
          {mode !== 'forgot' && mode !== 'reset' && (
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => switchMode('signin')}
                className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                  mode === 'signin' ? 'text-brand-700 border-b-2 border-brand-700 bg-white' : 'text-gray-500 bg-gray-50 hover:text-gray-700'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => switchMode('register')}
                className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                  mode === 'register' ? 'text-brand-700 border-b-2 border-brand-700 bg-white' : 'text-gray-500 bg-gray-50 hover:text-gray-700'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {oneId.enabled && (mode === 'signin' || mode === 'register') && (
              <div>
                <button
                  type="button"
                  onClick={async () => { setOneIdNote(null); const r = await oneId.startLogin(); if (!r.ok) setOneIdNote(r.message ?? 'One ID is not available right now.'); }}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-brand-200 text-brand-800 font-semibold rounded-xl hover:bg-brand-50 transition-colors text-sm"
                >
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  Continue with One ID
                </button>
                {oneIdNote && <p className="mt-2 text-xs text-gray-500 bg-surface rounded-xl px-3 py-2" role="status">{oneIdNote}</p>}
                <div className="flex items-center gap-3 mt-4 text-xs text-gray-400" aria-hidden="true">
                  <span className="flex-1 h-px bg-gray-100" />or use your email<span className="flex-1 h-px bg-gray-100" />
                </div>
              </div>
            )}

            {notice && mode === 'signin' && (
              <div className="bg-brand-50 border border-brand-100 text-brand-800 text-sm rounded-xl px-4 py-3" role="status">{notice}</div>
            )}

            {mode === 'reset' && (
              <div>
                <h2 className="font-display font-bold text-brand-900 text-xl mb-1">Choose a new password</h2>
                <p className="text-gray-500 text-sm">Use at least 8 characters, with a letter and a number.</p>
              </div>
            )}

            {mode === 'forgot' && (
              <div>
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 transition-colors mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </button>
                <h2 className="font-display font-bold text-brand-900 text-xl mb-1">Reset Password</h2>
                <p className="text-gray-500 text-sm">Enter your email and we'll send a reset link.</p>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition"
                />
                {fieldErr('name')}
              </div>
            )}

            {mode !== 'reset' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition"
              />
              {fieldErr('email')}
            </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{mode === 'reset' ? 'New Password' : 'Password'}</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErr('password') || fieldErr('newPassword')}
                {mode !== 'signin' && !fieldErrors.password && !fieldErrors.newPassword && (
                  <p className="text-xs text-gray-400 mt-1">At least 8 characters, with a letter and a number.</p>
                )}
              </div>
            )}

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Mumbai"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition"
                  />
                  {fieldErr('city')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {accountTypes.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setAccountType(t.value)}
                        className={`text-xs px-3 py-2.5 rounded-xl border text-left font-medium transition-colors ${
                          accountType === t.value
                            ? 'border-brand-400 bg-brand-50 text-brand-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3" role="alert">{error}</div>
            )}

            {submitted && mode === 'forgot' ? (
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                <p className="text-green-700 text-sm font-medium">Check your inbox</p>
                <p className="text-green-600 text-xs mt-1">If an account exists for that email, a reset link is on its way.</p>
              </div>
            ) : submitted && mode === 'reset' ? (
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                <p className="text-green-700 text-sm font-medium">Password updated</p>
                <button type="button" onClick={() => navigate('auth-signin')} className="text-green-700 underline text-xs mt-1">Sign in with your new password</button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={busy || (mode === 'reset' && !resetToken)}
                className="w-full py-3 bg-brand-800 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors text-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : mode === 'register' ? 'Create Account' : mode === 'reset' ? 'Update Password' : 'Send Reset Link'}
              </button>
            )}

            {mode === 'signin' && (
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="w-full text-center text-xs text-gray-400 hover:text-brand-600 transition-colors"
              >
                Forgot your password?
              </button>
            )}

            {mode === 'register' && (
              <p className="text-center text-xs text-gray-400">
                By creating an account you agree to our{' '}
                <span className="text-brand-600 cursor-pointer hover:text-brand-800 transition-colors">Terms of Service</span>{' '}
                and{' '}
                <span className="text-brand-600 cursor-pointer hover:text-brand-800 transition-colors">Privacy Policy</span>.
              </p>
            )}
          </form>
        </div>

        {/* AI note */}
        <div className="flex items-center gap-2 justify-center mt-5 text-xs text-gray-400">
          <Sparkles className="w-3.5 h-3.5 text-gold-500" />
          <span>KhojaSphere · Demo Prototype · Not a live product</span>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  MapPin, Clock, Globe, Phone, Mail, Heart, Share2, Flag,
  Camera, ChevronLeft, ArrowRight, Sparkles, AtSign,
} from 'lucide-react';
import type { PageProps } from '../types';
import { businesses as businessApi, errorMessage, type Business } from '../api';
import InquiryModal from '../components/InquiryModal';
import ReportModal from '../components/ReportModal';
import SafeImage from '../components/SafeImage';
import { OwnerBadge } from '../components/OneIdBadge';
import { useFavorites } from '../context/FavoritesContext';

export default function BusinessProfile({ navigate, params }: PageProps) {
  const id = Number(params?.id) || 0;
  const [business, setBusiness] = useState<Business | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showInquiry, setShowInquiry] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { isSaved, toggle, error: favError } = useFavorites();
  const signIn = () => navigate('auth-signin', { next: window.location.hash });

  useEffect(() => {
    if (!id) { setLoadError('No business selected.'); return; }
    let alive = true;
    businessApi.get(id).then((b) => alive && setBusiness(b)).catch((e) => alive && setLoadError(errorMessage(e)));
    return () => { alive = false; };
  }, [id]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };
  const saved = business ? isSaved('business', business.id) : false;
  const onSave = async () => {
    if (!business) return;
    const r = await toggle('business', business.id);
    if (r === 'auth') signIn();
  };
  const onShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: business?.name, url });
      else { await navigator.clipboard.writeText(url); flash('Link copied'); }
    } catch { /* share dismissed */ }
  };

  if (loadError || !business) {
    return (
      <div className="pt-28 pb-20 min-h-screen bg-surface text-center px-6" role="status">
        {loadError ? (
          <>
            <h1 className="font-display font-bold text-2xl text-brand-950 mb-2">Listing not found</h1>
            <p className="text-gray-500 text-sm mb-5">{loadError}</p>
            <button onClick={() => navigate('search')} className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700">Browse listings</button>
          </>
        ) : <p className="text-gray-500 text-sm">Loading…</p>}
      </div>
    );
  }

  return (
    <div className="pt-16 pb-20 lg:pb-0 min-h-screen bg-surface">
      {/* ── Cover ── */}
      <div className="relative h-64 md:h-80 bg-brand-800 overflow-hidden">
        {business.coverImage ? <img src={business.coverImage} alt="Cover" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-brand-800 to-brand-600" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Back */}
        <button
          onClick={() => (window.history.length > 1 ? window.history.back() : navigate('search'))}
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl text-sm hover:bg-white/30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-12 relative z-10">
        {/* ── Profile Header ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-xl bg-brand-50 border-2 border-white shadow-md overflow-hidden flex-shrink-0 -mt-10">
              <SafeImage src={business.image} alt={business.name} />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs text-brand-600 font-medium">{business.category}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{business.status}</span>
                    <OwnerBadge item={business} kind={business.kind} />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-brand-900">{business.name}</h1>
                  <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {business.location}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={onSave}
                    aria-label={saved ? 'Remove from saved' : 'Save'}
                    className={`p-2.5 rounded-xl border transition-colors ${saved ? 'bg-red-50 border-red-200 text-red-500' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                  >
                    <Heart className={`w-4 h-4 ${saved ? 'fill-red-500' : ''}`} />
                  </button>
                  <button onClick={onShare} aria-label="Share" className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:border-gray-300 transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowReport(true)} aria-label="Report listing" className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:border-gray-300 transition-colors">
                    <Flag className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {(toast || favError) && (
          <div className="mb-4 text-sm rounded-xl px-4 py-2.5 bg-brand-50 border border-brand-100 text-brand-800" role="status">{toast || favError}</div>
        )}
        {business.isOwner && business.listingStatus !== 'approved' && (
          <div className="mb-4 text-sm rounded-xl px-4 py-3 bg-amber-50 border border-amber-100 text-amber-800 flex items-center justify-between gap-3">
            <span>This listing is <strong>{business.listingStatus}</strong> and only visible to you{business.listingStatus === 'pending' ? ' until a moderator approves it' : ''}.</span>
            <button onClick={() => navigate('dashboard', { section: 'businesses' })} className="underline font-medium whitespace-nowrap">Manage</button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-5">
          {/* ── Main Content ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* About */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-display font-bold text-brand-900 text-lg mb-3">About</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{business.description}</p>
            </div>

            {/* Services */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-display font-bold text-brand-900 text-lg mb-4">Services</h2>
              <div className="space-y-3">
                {business.services.length === 0 && <p className="text-sm text-gray-400">No services listed yet.</p>}
                {business.services.map(s => (
                  <div key={s.name} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                        <Camera className="w-4 h-4 text-brand-600" />
                      </div>
                      <span className="text-gray-800 text-sm font-medium">{s.name}</span>
                    </div>
                    <span className="text-brand-700 text-sm font-semibold">{s.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-display font-bold text-brand-900 text-lg mb-4">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {business.tags.map(t => (
                  <span key={t} className="px-3 py-1.5 rounded-full border border-brand-200 text-brand-700 text-sm bg-brand-50">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Notice */}
            {business.isSample && <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800 text-xs leading-relaxed">
                <strong>Demo listing:</strong> This is sample data created for demonstration purposes. Contact details shown here are illustrative only and do not represent a real business.
              </p>
            </div>}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">
            {/* CTA */}
            <div className="bg-brand-900 rounded-2xl p-5 text-white">
              <h3 className="font-display font-bold text-lg mb-2">Interested?</h3>
              <p className="text-white/70 text-sm mb-4">Send a message and get a response through KhojaSphere's secure platform.</p>
              <button
                onClick={() => setShowInquiry(true)}
                className="w-full py-3 bg-gold-500 text-white font-semibold rounded-xl hover:bg-gold-600 transition-colors text-sm"
              >
                Send Inquiry
              </button>
              <button
                onClick={() => setShowInquiry(true)}
                className="w-full py-3 mt-2 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors text-sm border border-white/20"
              >
                Request a Quote
              </button>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <h3 className="font-display font-semibold text-brand-900 text-base">Contact</h3>
              {business.hours && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-gray-400" />
                  </div>
                  {business.hours}
                </div>
              )}
              {business.website && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-brand-600 break-all">{business.website}</span>
                </div>
              )}
              {business.email && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-brand-600 break-all">{business.email}</span>
                </div>
              )}
              {business.phone && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-gray-400" />
                  </div>
                  {business.phone}
                </div>
              )}
              {business.instagram && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <AtSign className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-brand-600">{business.instagram}</span>
                </div>
              )}
            </div>

            {/* Explore more */}
            <button
              onClick={() => navigate('search', { category: business.category })}
              className="w-full flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-4 hover:border-brand-200 hover:bg-brand-50 transition-all group"
            >
              <span className="text-sm font-medium text-brand-700">Find similar businesses</span>
              <ArrowRight className="w-4 h-4 text-brand-500 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {showInquiry && (
        <InquiryModal targetType="business" targetId={business.id} businessName={business.name} onClose={() => setShowInquiry(false)} onSignIn={signIn} />
      )}
      {showReport && (
        <ReportModal entityType="business" entityId={business.id} title={business.name} onClose={() => setShowReport(false)} onSignIn={signIn} />
      )}
    </div>
  );
}

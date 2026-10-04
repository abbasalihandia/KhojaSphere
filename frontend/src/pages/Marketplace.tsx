import { useEffect, useMemo, useState } from 'react';
import { MapPin, Heart, Tag, Clock } from 'lucide-react';
import type { PageProps } from '../types';
import { categories as categoriesApi, marketplace as marketApi, errorMessage, type MarketItem } from '../api';
import InquiryModal from '../components/InquiryModal';
import ListingDetailModal from '../components/ListingDetailModal';
import SafeImage from '../components/SafeImage';
import { OwnerBadge } from '../components/OneIdBadge';
import { useFavorites } from '../context/FavoritesContext';

const SORTS: Record<string, string> = { 'Date: Newest first': 'newest', 'Price: Low to High': 'price_asc', 'Price: High to Low': 'price_desc' };
const PAGE_SIZE = 12;

export default function Marketplace({ navigate }: PageProps) {
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortLabel, setSortLabel] = useState('Date: Newest first');
  const [items, setItems] = useState<MarketItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [inquiry, setInquiry] = useState<MarketItem | null>(null);
  const [detail, setDetail] = useState<number | null>(null);
  const { isSaved, toggle, error: favError } = useFavorites();
  const signIn = () => navigate('auth-signin', { next: window.location.hash });

  useEffect(() => {
    categoriesApi('marketplace').then((c) => setCategoryNames(c.map((x) => x.name))).catch(() => {});
  }, []);

  const query = useMemo(() => ({
    category: activeCategory === 'All' ? undefined : activeCategory, sort: SORTS[sortLabel], limit: PAGE_SIZE,
  }), [activeCategory, sortLabel]);
  useEffect(() => { setPage(1); }, [query]);

  useEffect(() => {
    const ctl = new AbortController();
    setLoading(true);
    setError(null);
    marketApi.list({ ...query, page }, ctl.signal)
      .then((r) => { setTotal(r.total); setItems((prev) => (page === 1 ? r.items : [...prev, ...r.items])); })
      .catch((e) => { if ((e as Error).name !== 'AbortError') setError(errorMessage(e)); })
      .finally(() => { if (!ctl.signal.aborted) setLoading(false); });
    return () => ctl.abort();
  }, [query, page, retry]);

  const onHeart = async (id: number) => { if ((await toggle('marketplace', id)) === 'auth') signIn(); };

  const conditionColor = (c: string) => {
    if (c === 'Like New' || c === 'New') return 'bg-green-50 text-green-700';
    if (c === 'Good') return 'bg-blue-50 text-blue-700';
    return 'bg-yellow-50 text-yellow-700';
  };

  return (
    <div className="pt-16 pb-20 lg:pb-0 min-h-screen bg-surface">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-brand-900 to-brand-700 py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Community Marketplace</h1>
          <p className="text-brand-300 text-sm">Buy and sell within the community.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Categories */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {['All', ...categoryNames].map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeCategory === c ? 'bg-brand-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Sell CTA */}
        <div className="bg-gold-50 border border-gold-200 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-gold-800 font-semibold text-sm">Have something to sell?</p>
            <p className="text-gold-700 text-xs mt-0.5">List it for free with our AI assistant.</p>
          </div>
          <button
            onClick={() => navigate('ai-listing', { type: 'marketplace' })}
            className="flex-shrink-0 px-4 py-2 bg-gold-500 text-white text-sm font-semibold rounded-xl hover:bg-gold-600 transition-colors"
          >
            Create Listing
          </button>
        </div>

        {/* Results meta */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600" role="status">
            <span className="font-semibold text-brand-700">{total}</span> {total === 1 ? 'item' : 'items'} in {activeCategory}
          </p>
          <select
            value={sortLabel}
            onChange={(e) => setSortLabel(e.target.value)}
            aria-label="Sort items"
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-white outline-none cursor-pointer"
          >
            {Object.keys(SORTS).map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {(error || favError) && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4 flex justify-between" role="alert">
            <span>{error || favError}</span>
            {error && <button onClick={() => setRetry((n) => n + 1)} className="underline font-medium">Try again</button>}
          </div>
        )}

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-5">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="relative h-52 bg-gray-100">
                <SafeImage src={item.image} alt={item.title} />
                <button
                  onClick={() => onHeart(item.id)}
                  aria-label={isSaved('marketplace', item.id) ? 'Remove from saved' : 'Save'}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                >
                  <Heart className={`w-4 h-4 ${isSaved('marketplace', item.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                </button>
                <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${conditionColor(item.condition)}`}>{item.condition}</span>
                  {item.negotiable && <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700 font-medium">Negotiable</span>}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display font-bold text-gray-800 text-base leading-tight">{item.title}</h3>
                  <div className="text-brand-800 font-bold text-lg flex-shrink-0">{item.price}</div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-2 flex-wrap">
                  {item.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location}</span>}
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{item.category}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.posted}</span>
                </div>
                <OwnerBadge item={item} kind="marketplace" className="mb-3" />
                {item.label && <div className="text-xs text-gray-400 mb-4">[{item.label}]</div>}
                <div className={`flex gap-2 ${item.label ? '' : 'mt-4'}`}>
                  <button onClick={() => setDetail(item.id)} className="flex-1 py-2 text-xs font-medium text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors">View Listing</button>
                  <button
                    onClick={() => setInquiry(item)}
                    disabled={item.isOwner}
                    className="flex-1 py-2 text-xs font-medium text-white bg-brand-800 rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    {item.isOwner ? 'Your listing' : 'Send Inquiry'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {!loading && !error && items.length === 0 && (
            <div className="sm:col-span-2 text-center py-20 bg-white rounded-2xl border border-gray-100">
              <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No items in this category yet.</p>
            </div>
          )}
        </div>

        {loading && <p className="text-center text-sm text-gray-400 mt-6" role="status">Loading…</p>}
        {!loading && items.length < total && (
          <div className="text-center mt-6">
            <button onClick={() => setPage((n) => n + 1)} className="px-6 py-2.5 text-sm font-medium text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors">
              Load more ({total - items.length} more)
            </button>
          </div>
        )}
      </div>

      {inquiry && <InquiryModal targetType="marketplace" targetId={inquiry.id} businessName={inquiry.title} onClose={() => setInquiry(null)} onSignIn={signIn} />}
      {detail !== null && <ListingDetailModal type="marketplace" id={detail} onClose={() => setDetail(null)} onSignIn={signIn} />}
    </div>
  );
}

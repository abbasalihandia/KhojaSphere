import { useEffect, useMemo, useState } from 'react';
import { MapPin, Heart, BedDouble, Bath, Maximize2, ChevronDown, SlidersHorizontal, Plus } from 'lucide-react';
import type { PageProps } from '../types';
import { properties as propertyApi, errorMessage, type ListingType, type Property } from '../api';
import InquiryModal from '../components/InquiryModal';
import ListingDetailModal from '../components/ListingDetailModal';
import SafeImage from '../components/SafeImage';
import { OwnerBadge } from '../components/OneIdBadge';
import { useFavorites } from '../context/FavoritesContext';

type Tab = ListingType;

const tabs: { key: Tab; label: string }[] = [
  { key: 'rent', label: 'For Rent' },
  { key: 'sale', label: 'For Sale' },
  { key: 'shared', label: 'Shared Accommodation' },
  { key: 'commercial', label: 'Commercial' },
];

const filterOptions = {
  Location: ['Andheri', 'Bandra', 'Juhu', 'Powai', 'Borivali'],
  'Property type': ['Apartment', 'Villa', 'Studio', 'Penthouse', 'Row House'],
  Bedrooms: ['1 BHK', '2 BHK', '3 BHK', '4+ BHK'],
  Furnishing: ['Furnished', 'Semi-furnished', 'Unfurnished'],
};
const SORTS: Record<string, string> = { 'Newest first': 'newest', 'Price: Low to High': 'price_asc', 'Price: High to Low': 'price_desc' };
const PAGE_SIZE = 12;
const TYPE_LABEL: Record<string, string> = { rent: 'For Rent', sale: 'For Sale', shared: 'Shared', commercial: 'Commercial' };

export default function Properties({ navigate }: PageProps) {
  const [tab, setTab] = useState<Tab>('rent');
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [sortLabel, setSortLabel] = useState('Newest first');
  const [items, setItems] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [inquiry, setInquiry] = useState<Property | null>(null);
  const [detail, setDetail] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState<string | null>(null);
  const { isSaved, toggle, error: favError } = useFavorites();
  const signIn = () => navigate('auth-signin', { next: window.location.hash });

  const query = useMemo(() => ({
    type: tab,
    locality: chosen.Location,
    property_type: chosen['Property type'],
    bedrooms: chosen.Bedrooms ? parseInt(chosen.Bedrooms, 10) : undefined,
    furnishing: chosen.Furnishing,
    sort: SORTS[sortLabel],
    limit: PAGE_SIZE,
  }), [tab, chosen, sortLabel]);

  useEffect(() => { setPage(1); }, [query]);

  useEffect(() => {
    const ctl = new AbortController();
    setLoading(true);
    setError(null);
    propertyApi.list({ ...query, page }, ctl.signal)
      .then((r) => { setTotal(r.total); setItems((prev) => (page === 1 ? r.items : [...prev, ...r.items])); })
      .catch((e) => { if ((e as Error).name !== 'AbortError') setError(errorMessage(e)); })
      .finally(() => { if (!ctl.signal.aborted) setLoading(false); });
    return () => ctl.abort();
  }, [query, page, retry]);

  const onHeart = async (id: number) => { if ((await toggle('property', id)) === 'auth') signIn(); };

  return (
    <div className="pt-16 pb-20 lg:pb-0 min-h-screen bg-surface">
      {/* ── Header ── */}
      <div className="bg-brand-900 py-10 px-4">
        <div className="max-w-5xl mx-auto flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Property Marketplace</h1>
            <p className="text-brand-300">Find community homes, apartments, and commercial spaces.</p>
          </div>
          <button
            onClick={() => navigate('ai-listing', { type: 'property' })}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gold-500 text-white text-sm font-semibold rounded-xl hover:bg-gold-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Post a Property
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.key ? 'bg-brand-800 text-white shadow-sm' : 'text-gray-600 hover:text-brand-700 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <SlidersHorizontal className="w-4 h-4" />
            Filter:
          </div>
          {Object.entries(filterOptions).map(([label, options]) => (
            <div key={label} className="relative">
              <button
                onClick={() => setFilterOpen(filterOpen === label ? null : label)}
                className={`flex items-center gap-1.5 px-3 py-2 bg-white border rounded-xl text-sm transition-colors ${
                  chosen[label] ? 'border-brand-400 text-brand-700 bg-brand-50' : 'border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-700'
                }`}
              >
                {chosen[label] || label}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {filterOpen === label && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1">
                  {chosen[label] && (
                    <button
                      onClick={() => { setChosen((c) => { const n = { ...c }; delete n[label]; return n; }); setFilterOpen(null); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-50"
                    >
                      Any
                    </button>
                  )}
                  {options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setChosen((c) => ({ ...c, [label]: opt })); setFilterOpen(null); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {Object.keys(chosen).length > 0 && (
            <button onClick={() => setChosen({})} className="text-xs text-brand-600 hover:text-brand-800 px-2">Clear filters</button>
          )}
        </div>

        {/* ── Results meta ── */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600" role="status">
            <span className="font-semibold text-brand-700">{total}</span> {total === 1 ? 'property' : 'properties'} found
          </p>
          <select
            value={sortLabel}
            onChange={(e) => setSortLabel(e.target.value)}
            aria-label="Sort properties"
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

        {/* ── Cards ── */}
        {items.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-5">
            {items.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all group">
                <div className="relative h-52 bg-gray-100">
                  <SafeImage src={p.image} alt={p.title} />
                  <button
                    onClick={() => onHeart(p.id)}
                    aria-label={isSaved('property', p.id) ? 'Remove from saved' : 'Save'}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                  >
                    <Heart className={`w-4 h-4 ${isSaved('property', p.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                  </button>
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className="text-xs px-2 py-1 rounded-full bg-brand-800 text-white font-medium">{TYPE_LABEL[p.type]}</span>
                    {p.label && <span className="text-xs px-2 py-1 rounded-full bg-white/90 text-gray-600">{p.label}</span>}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-display font-bold text-gray-800 text-base leading-tight">{p.title}</h3>
                    <div className="text-brand-800 font-bold text-base flex-shrink-0">{p.price}</div>
                  </div>
                  {p.location && (
                    <div className="flex items-center gap-1 text-gray-400 text-xs mb-3"><MapPin className="w-3 h-3" />{p.location}</div>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    {p.bedrooms != null && <div className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5 text-gray-400" />{p.bedrooms} Bed</div>}
                    {p.bathrooms != null && <div className="flex items-center gap-1"><Bath className="w-3.5 h-3.5 text-gray-400" />{p.bathrooms} Bath</div>}
                    {p.area && <div className="flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5 text-gray-400" />{p.area}</div>}
                  </div>
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {p.furnishing && <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">{p.furnishing}</span>}
                    {p.available && <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700">{p.available}</span>}
                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">{p.owner}</span>
                    <OwnerBadge item={p} kind="property" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setDetail(p.id)} className="flex-1 py-2 text-xs font-medium text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors">View Details</button>
                    <button
                      onClick={() => setInquiry(p)}
                      disabled={p.isOwner}
                      className="flex-1 py-2 text-xs font-medium text-white bg-brand-800 rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                      {p.isOwner ? 'Your listing' : 'Inquire'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !loading && !error ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4"><MapPin className="w-7 h-7 text-gray-400" /></div>
            <h3 className="font-display font-semibold text-gray-700 text-lg mb-2">No listings found</h3>
            <p className="text-gray-400 text-sm">{Object.keys(chosen).length ? 'Try removing a filter.' : 'Be the first to post one in this category.'}</p>
          </div>
        ) : null}

        {loading && <p className="text-center text-sm text-gray-400 mt-6" role="status">Loading…</p>}
        {!loading && items.length < total && (
          <div className="text-center mt-6">
            <button onClick={() => setPage((n) => n + 1)} className="px-6 py-2.5 text-sm font-medium text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors">
              Load more ({total - items.length} more)
            </button>
          </div>
        )}
      </div>

      {inquiry && <InquiryModal targetType="property" targetId={inquiry.id} businessName={inquiry.title} onClose={() => setInquiry(null)} onSignIn={signIn} />}
      {detail !== null && <ListingDetailModal type="property" id={detail} onClose={() => setDetail(null)} onSignIn={signIn} />}
    </div>
  );
}

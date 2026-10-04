import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Sparkles, MapPin, Heart, ChevronDown, X, SlidersHorizontal } from 'lucide-react';
import type { PageProps } from '../types';
import { categories as categoriesApi, errorMessage, search as searchApi, type EntityType, type SearchItem, type SearchPage as SearchResult } from '../api';
import InquiryModal from '../components/InquiryModal';
import ListingDetailModal from '../components/ListingDetailModal';
import SafeImage from '../components/SafeImage';
import { OwnerBadge } from '../components/OneIdBadge';
import { useOneId } from '../context/OneIdContext';
import { resolveOwnerBadge } from '../api/oneId';
import { useFavorites } from '../context/FavoritesContext';
import { useDebounce } from '../hooks/useDebounce';

const BUDGETS: Record<string, { min?: number; max?: number }> = {
  'Under ₹5,000': { max: 5000 },
  '₹5,000 – ₹25,000': { min: 5000, max: 25000 },
  '₹25,000 – ₹1L': { min: 25000, max: 100000 },
  'Above ₹1L': { min: 100000 },
};
const TYPES: Record<string, string> = { Business: 'business', Professional: 'professional', Property: 'property', Marketplace: 'marketplace' };
const CITIES = ['Mumbai', 'Pune', 'Delhi', 'Bengaluru', 'Ahmedabad'];
const LOCALITIES = ['Bandra', 'Andheri', 'Juhu', 'Fort', 'Powai'];
const SORTS: Record<string, string> = { 'Most relevant': 'relevant', 'Newest first': 'newest', 'Name A–Z': 'name' };
const PAGE_SIZE = 10;
const favType = (t: SearchItem['type']): EntityType => (t === 'professional' ? 'business' : t);

export default function SearchPage({ navigate, params }: PageProps) {
  const [searchInput, setSearchInput] = useState((params?.query as string) || '');
  const [selected, setSelected] = useState<Record<string, string>>({
    ...(params?.category ? { Category: String(params.category) } : {}),
    ...(params?.city ? { City: String(params.city) } : {}),
    ...(params?.locality ? { Locality: String(params.locality) } : {}),
  });
  const [sortLabel, setSortLabel] = useState('Most relevant');
  const [bizCategories, setBizCategories] = useState<string[]>([]);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inquiry, setInquiry] = useState<SearchItem | null>(null);
  const [detail, setDetail] = useState<SearchItem | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('Category');
  const { isSaved, toggle, error: favError } = useFavorites();
  const [retry, setRetry] = useState(0);
  const oneId = useOneId();
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const lastKey = useRef('');
  const signIn = () => navigate('auth-signin', { next: window.location.hash });

  useEffect(() => {
    categoriesApi().then((c) => setBizCategories(c.filter((x) => x.kind === 'business').map((x) => x.name))).catch(() => {});
  }, []);

  const filterSections = useMemo(() => [
    { label: 'Category', options: bizCategories },
    { label: 'City', options: CITIES },
    { label: 'Locality', options: LOCALITIES },
    { label: 'Budget', options: Object.keys(BUDGETS) },
    { label: 'Listing type', options: Object.keys(TYPES) },
  ], [bizCategories]);

  const query = useDebounce(searchInput.trim(), 450);
  const shown = useMemo(() => (verifiedOnly ? items.filter((b) => resolveOwnerBadge(b, b.type)) : items), [items, verifiedOnly]);
  const activeFilterCount = Object.values(selected).filter(Boolean).length;

  const baseQuery = useMemo(() => {
    const b = selected['Budget'] ? BUDGETS[selected['Budget']] : undefined;
    return {
      q: query || undefined, category: selected['Category'] || undefined, city: selected['City'] || undefined,
      locality: selected['Locality'] || undefined, type: selected['Listing type'] ? TYPES[selected['Listing type']] : undefined,
      price_min: b?.min, price_max: b?.max, sort: SORTS[sortLabel], limit: PAGE_SIZE,
    };
  }, [query, selected, sortLabel]);

  // new search whenever the query, filters or sort change (page resets)
  useEffect(() => {
    const key = JSON.stringify(baseQuery) + retry;
    const fresh = key !== lastKey.current;
    lastKey.current = key;
    const nextPage = fresh ? 1 : page;
    if (fresh && page !== 1) setPage(1);
    const ctl = new AbortController();
    setLoading(true);
    setError(null);
    searchApi({ ...baseQuery, page: nextPage }, ctl.signal)
      .then((r) => { setResult(r); setItems((prev) => (nextPage === 1 ? r.items : [...prev, ...r.items])); })
      .catch((e) => { if ((e as Error).name !== 'AbortError') setError(errorMessage(e)); })
      .finally(() => { if (!ctl.signal.aborted) setLoading(false); });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseQuery, page, retry]);

  const toggleFilter = (section: string, option: string) =>
    setSelected((prev) => (prev[section] === option ? { ...prev, [section]: '' } : { ...prev, [section]: option }));

  const open = (b: SearchItem) => (b.type === 'business' || b.type === 'professional' ? navigate('business', { id: b.id }) : setDetail(b));
  const onHeart = async (b: SearchItem) => { if ((await toggle(favType(b.type), b.id)) === 'auth') signIn(); };

  return (
    <div className="pt-16 pb-20 lg:pb-0 min-h-screen bg-surface">
      {/* ── Search Header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-3 items-center">
            <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 gap-2">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 bg-transparent text-gray-800 text-sm outline-none placeholder:text-gray-400"
                placeholder="Try: Find a photographer for an event in Mumbai"
                aria-label="Search listings"
                maxLength={300}
              />
              {searchInput && (
                <button onClick={() => setSearchInput('')} aria-label="Clear search" className="text-gray-300 hover:text-gray-500"><X className="w-4 h-4" /></button>
              )}
              <div className="flex items-center gap-1 text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                AI-powered
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`lg:hidden flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                activeFilterCount > 0 ? 'border-brand-400 text-brand-700 bg-brand-50' : 'border-gray-200 text-gray-600'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* ── Sidebar ── */}
          <aside className={`w-64 flex-shrink-0 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden sticky top-36">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <span className="font-display font-semibold text-gray-800 text-sm">Filters</span>
                {activeFilterCount > 0 && (
                  <button onClick={() => setSelected({})} className="text-xs text-brand-600 hover:text-brand-800 transition-colors">Clear all</button>
                )}
              </div>
              {filterSections.map(({ label, options }) => (
                <div key={label} className="border-b border-gray-50 last:border-0">
                  <button
                    onClick={() => setOpenSection(openSection === label ? null : label)}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span>{label}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openSection === label ? 'rotate-180' : ''}`} />
                  </button>
                  {openSection === label && (
                    <div className="px-5 pb-4 space-y-2">
                      {options.map((opt) => (
                        <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
                          <input type="radio" name={label} checked={selected[label] === opt} onChange={() => toggleFilter(label, opt)} onClick={() => selected[label] === opt && toggleFilter(label, opt)} className="w-3.5 h-3.5 accent-brand-700" />
                          <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>

          {/* ── Results ── */}
          <main className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-gray-800 font-medium text-sm" role="status">
                  {loading && !items.length ? 'Searching…' : <>Showing <span className="text-brand-700 font-semibold">{result?.total ?? 0} result{result?.total === 1 ? '' : 's'}</span>{query && <> for "{query}"</>}</>}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">Results from KhojaSphere community listings</p>
              </div>
              <div className="flex items-center gap-3">
              {oneId.enabled && (
                <label className="hidden sm:flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                  <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="accent-[var(--color-brand-600)] w-4 h-4" />
                  Verified members only
                </label>
              )}
              <select
                value={sortLabel}
                onChange={(e) => setSortLabel(e.target.value)}
                aria-label="Sort results"
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-white outline-none focus:ring-2 focus:ring-brand-200 cursor-pointer"
              >
                {Object.keys(SORTS).map((s) => <option key={s}>{s}</option>)}
              </select>
              </div>
            </div>

            {/* what the AI understood */}
            {result && result.filters.length > 0 && query && (
              <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-gray-500">
                <Sparkles className="w-3.5 h-3.5 text-gold-500" />
                <span>Understood as:</span>
                {result.filters.map((f) => <span key={f} className="px-2.5 py-1 rounded-full bg-gold-50 text-gold-700 border border-gold-200">{f}</span>)}
                {result.relaxed && <span className="text-gray-400">· no exact match, showing close results</span>}
              </div>
            )}

            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(selected).filter(([, v]) => v).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                    {v}
                    <button onClick={() => toggleFilter(k, v)} aria-label={`Remove ${v}`} className="ml-0.5"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}

            {(error || favError) && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4 flex items-center justify-between" role="alert">
                <span>{error || favError}</span>
                {error && <button onClick={() => setRetry((n) => n + 1)} className="underline font-medium">Try again</button>}
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <p className="font-display font-semibold text-gray-800 mb-1">No listings found</p>
                <p className="text-gray-500 text-sm mb-4">Try fewer filters or a broader search.</p>
                {(activeFilterCount > 0 || query) && <button onClick={() => { setSelected({}); setSearchInput(''); }} className="px-4 py-2 text-sm text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50">Clear search & filters</button>}
              </div>
            )}

            {verifiedOnly && !loading && items.length > 0 && shown.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-500">
                No verified members in these results. Turn off “Verified members only” to see everything.
              </div>
            )}

            <div className="space-y-4">
              {shown.map((b) => (
                <div key={`${b.type}-${b.id}`} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all flex flex-col sm:flex-row">
                  <div className="sm:w-52 h-44 sm:h-auto flex-shrink-0 bg-gray-100">
                    <SafeImage src={b.image} alt={b.name} />
                  </div>
                  <div className="flex-1 p-5 flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs text-brand-600 font-medium">{b.category}</span>
                          {b.status && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{b.status}</span>}
                          {(b.type === 'property' || b.type === 'marketplace' || b.type === 'professional') && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gold-50 text-gold-700 capitalize">{b.type}</span>
                          )}
                          <OwnerBadge item={b} kind={b.type} />
                        </div>
                        <h3 className="font-display font-bold text-gray-800 text-base mb-1">{b.name}</h3>
                        <p className="text-gray-500 text-sm leading-relaxed mb-2 line-clamp-2">{b.shortDesc}</p>
                      </div>
                      <button onClick={() => onHeart(b)} aria-label={isSaved(favType(b.type), b.id) ? 'Remove from saved' : 'Save'} className="flex-shrink-0 p-1.5">
                        <Heart className={`w-5 h-5 ${isSaved(favType(b.type), b.id) ? 'fill-red-500 text-red-500' : 'text-gray-300 hover:text-red-400'} transition-colors`} />
                      </button>
                    </div>
                    {b.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mb-2"><MapPin className="w-3 h-3" />{b.location}</div>
                    )}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {b.tags.slice(0, 6).map((t) => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">{t}</span>)}
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="text-sm font-medium text-gray-700">{b.priceRange}</div>
                      <div className="flex gap-2">
                        <button onClick={() => open(b)} className="px-4 py-2 text-xs font-medium text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors">View Details</button>
                        <button onClick={() => setInquiry(b)} className="px-4 py-2 text-xs font-medium text-white bg-brand-800 rounded-xl hover:bg-brand-700 transition-colors">Contact</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {loading && items.length > 0 && <p className="text-center text-sm text-gray-400 mt-4" role="status">Loading…</p>}
            {result && page < result.pages && !loading && (
              <div className="text-center mt-6">
                <button onClick={() => setPage((p) => p + 1)} className="px-6 py-2.5 text-sm font-medium text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors">
                  Load more ({result.total - items.length} more)
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {inquiry && (
        <InquiryModal targetType={favType(inquiry.type)} targetId={inquiry.id} businessName={inquiry.name} onClose={() => setInquiry(null)} onSignIn={signIn} />
      )}
      {detail && (detail.type === 'property' || detail.type === 'marketplace') && (
        <ListingDetailModal type={detail.type} id={detail.id} onClose={() => setDetail(null)} onSignIn={signIn} />
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Heart, MapPin, Trash2, ChevronRight } from 'lucide-react';
import type { PageProps } from '../types';
import { favorites as favApi, errorMessage, type FavoritesDetail } from '../api';
import ListingDetailModal from '../components/ListingDetailModal';
import SafeImage from '../components/SafeImage';
import { useFavorites } from '../context/FavoritesContext';

type Tab = 'businesses' | 'properties' | 'marketplace';

export default function Saved({ navigate }: PageProps) {
  const [tab, setTab] = useState<Tab>('businesses');
  const [data, setData] = useState<FavoritesDetail>({ businesses: [], properties: [], marketplace: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ type: 'property' | 'marketplace'; id: number } | null>(null);
  const { toggle, error: favError } = useFavorites();

  useEffect(() => {
    let alive = true;
    favApi.detail().then((d) => alive && setData(d)).catch((e) => alive && setError(errorMessage(e))).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const remove = async (type: 'business' | 'property' | 'marketplace', id: number) => {
    const key = type === 'business' ? 'businesses' : type === 'property' ? 'properties' : 'marketplace';
    const before = data;
    setData((d) => ({ ...d, [key]: (d[key] as { id: number }[]).filter((x) => x.id !== id) }) as FavoritesDetail);
    if ((await toggle(type, id)) === 'error') setData(before);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'businesses', label: 'Businesses' },
    { key: 'properties', label: 'Properties' },
    { key: 'marketplace', label: 'Marketplace' },
  ];

  const businesses = data.businesses;
  const props = data.properties;
  const market = data.marketplace;

  const isEmpty = (t: Tab) => {
    if (t === 'businesses') return businesses.length === 0;
    if (t === 'properties') return props.length === 0;
    return market.length === 0;
  };

  return (
    <div className="pt-16 pb-20 lg:pb-0 min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-brand-900 mb-1">Saved Items</h1>
          <p className="text-gray-500 text-sm">Your saved businesses, properties, and marketplace listings.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-brand-700 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-brand-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(error || favError) && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4" role="alert">{error || favError}</div>}
        {loading ? (
          <p className="text-center text-sm text-gray-400 py-20" role="status">Loading…</p>
        ) : isEmpty(tab) ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Heart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="font-display font-semibold text-gray-600 text-lg mb-2">Nothing saved yet</h3>
            <p className="text-gray-400 text-sm mb-6">Tap the heart icon on any listing to save it here.</p>
            <button
              onClick={() => navigate('search')}
              className="px-6 py-2.5 bg-brand-800 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
            >
              Start Exploring
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tab === 'businesses' && businesses.map(b => (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-100 flex gap-4 p-4 hover:shadow-sm transition-all">
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100"><SafeImage src={b.image} alt={b.name} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-brand-600 font-medium mb-1">{b.category}</div>
                  <h3 className="font-display font-bold text-gray-800 text-base">{b.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <MapPin className="w-3 h-3" />
                    {b.location}
                  </div>
                </div>
                <div className="flex flex-col gap-2 justify-center">
                  <button
                    onClick={() => navigate('business', { id: b.id })}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors"
                  >
                    View <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => remove('business', b.id)} aria-label={`Remove ${b.name}`}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors self-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {tab === 'properties' && props.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 flex gap-4 p-4 hover:shadow-sm transition-all">
                <div className="w-24 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100"><SafeImage src={p.image} alt={p.title} /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-gray-800 text-base">{p.title}</h3>
                  <div className="text-brand-700 font-semibold text-sm mt-0.5">{p.price}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <MapPin className="w-3 h-3" />
                    {p.location}
                  </div>
                  {p.label && <div className="text-xs text-gray-400 mt-0.5">[{p.label}]</div>}
                </div>
                <div className="flex flex-col gap-2 justify-center">
                  <button onClick={() => setDetail({ type: 'property', id: p.id })} className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors">
                    View <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => remove('property', p.id)} aria-label={`Remove ${p.title}`}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors self-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {tab === 'marketplace' && market.map(m => (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-100 flex gap-4 p-4 hover:shadow-sm transition-all">
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100"><SafeImage src={m.image} alt={m.title} /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-gray-800 text-base">{m.title}</h3>
                  <div className="text-brand-700 font-semibold text-sm mt-0.5">{m.price}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.condition === 'Like New' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                      {m.condition}
                    </span>
                    <span className="text-xs text-gray-400">{m.location}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 justify-center">
                  <button onClick={() => setDetail({ type: 'marketplace', id: m.id })} className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors">
                    View <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => remove('marketplace', m.id)} aria-label={`Remove ${m.title}`}
                    className="p-2 text-gray-300 hover:text-red-400 transition-colors self-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {detail && <ListingDetailModal type={detail.type} id={detail.id} onClose={() => setDetail(null)} onSignIn={() => navigate('auth-signin', { next: '#/saved' })} />}
    </div>
  );
}

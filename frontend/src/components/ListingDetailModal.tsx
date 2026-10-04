import { useEffect, useState } from 'react';
import { X, MapPin, Heart, Flag, BedDouble, Bath, Maximize2, Sofa, Calendar, Tag } from 'lucide-react';
import { properties, marketplace, errorMessage, type MarketItem, type Property } from '../api';
import { useFavorites } from '../context/FavoritesContext';
import InquiryModal from './InquiryModal';
import ReportModal from './ReportModal';
import SafeImage from './SafeImage';
import { OwnerBadge } from './OneIdBadge';

interface Props {
  type: 'property' | 'marketplace';
  id: number;
  onClose: () => void;
  onSignIn: () => void;
}

/** Detail view for property and marketplace listings (businesses have their own page). */
export default function ListingDetailModal({ type, id, onClose, onSignIn }: Props) {
  const [item, setItem] = useState<Property | MarketItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inquiry, setInquiry] = useState(false);
  const [report, setReport] = useState(false);
  const [photo, setPhoto] = useState(0);
  const { isSaved, toggle } = useFavorites();

  useEffect(() => {
    let alive = true;
    const load = type === 'property' ? properties.get(id) : marketplace.get(id);
    load.then((r) => alive && setItem(r)).catch((e) => alive && setError(errorMessage(e)));
    return () => { alive = false; };
  }, [type, id]);

  const title = item ? ('title' in item ? item.title : '') : '';
  const saved = isSaved(type, id);
  const images = item?.images ?? [];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 text-gray-500 hover:text-gray-800 shadow"><X className="w-5 h-5" /></button>
        {error ? (
          <div className="p-10 text-center"><p className="text-gray-600 text-sm mb-4">{error}</p><button onClick={onClose} className="px-5 py-2 bg-brand-700 text-white rounded-xl text-sm">Close</button></div>
        ) : !item ? (
          <div className="p-10 text-center text-sm text-gray-500" role="status">Loading…</div>
        ) : (
          <>
            <div className="h-60 bg-gray-100"><SafeImage src={images[photo] ?? item.image} alt={title} /></div>
            {images.length > 1 && (
              <div className="flex gap-2 px-6 pt-3 overflow-x-auto">
                {images.map((src, i) => (
                  <button key={src} onClick={() => setPhoto(i)} className={`w-14 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 ${i === photo ? 'border-brand-500' : 'border-transparent'}`}>
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {'propertyType' in item ? (
                      <span className="text-xs text-brand-600 font-medium">{item.propertyType} · {item.type === 'sale' ? 'For Sale' : item.type === 'rent' ? 'For Rent' : item.type === 'shared' ? 'Shared' : 'Commercial'}</span>
                    ) : (
                      <span className="text-xs text-brand-600 font-medium">{item.category} · {item.condition}</span>
                    )}
                    {item.label && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{item.label}</span>}
                  </div>
                  <h2 className="font-display font-bold text-brand-900 text-xl">{title}</h2>
                  <div className="flex items-center gap-1 text-gray-500 text-sm mt-1"><MapPin className="w-3.5 h-3.5" />{item.location || 'Location not specified'}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-display font-bold text-brand-700 text-xl">{item.price}</div>
                  {'negotiable' in item && item.negotiable && <div className="text-xs text-gray-400">Negotiable</div>}
                </div>
              </div>

              {'propertyType' in item && (
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 my-4">
                  {item.bedrooms != null && <span className="flex items-center gap-1.5"><BedDouble className="w-4 h-4 text-gray-400" />{item.bedrooms} Bed</span>}
                  {item.bathrooms != null && <span className="flex items-center gap-1.5"><Bath className="w-4 h-4 text-gray-400" />{item.bathrooms} Bath</span>}
                  {item.area && <span className="flex items-center gap-1.5"><Maximize2 className="w-4 h-4 text-gray-400" />{item.area}</span>}
                  {item.furnishing && <span className="flex items-center gap-1.5"><Sofa className="w-4 h-4 text-gray-400" />{item.furnishing}</span>}
                  {item.available && <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" />{item.available}</span>}
                </div>
              )}
              {item.description && <p className="text-gray-600 text-sm leading-relaxed my-4 whitespace-pre-line">{item.description}</p>}
              {'amenities' in item && item.amenities.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">{item.amenities.map((a) => <span key={a} className="px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs flex items-center gap-1"><Tag className="w-3 h-3" />{a}</span>)}</div>
              )}
              <div className="flex items-center gap-2 flex-wrap mb-5">
                <p className="text-xs text-gray-400">Posted {item.posted}{'owner' in item ? ` · ${item.owner}` : ''}</p>
                <OwnerBadge item={item} kind={type} />
              </div>

              <div className="flex gap-2">
                <button onClick={() => setInquiry(true)} disabled={item.isOwner} className="flex-1 py-3 bg-brand-800 text-white font-semibold rounded-xl hover:bg-brand-700 text-sm disabled:opacity-50">
                  {item.isOwner ? 'This is your listing' : type === 'property' ? 'Contact Owner' : 'Contact Seller'}
                </button>
                <button
                  onClick={async () => { if ((await toggle(type, id)) === 'auth') { onClose(); onSignIn(); } }}
                  aria-label={saved ? 'Remove from saved' : 'Save'}
                  className={`p-3 rounded-xl border ${saved ? 'bg-red-50 border-red-200 text-red-500' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                ><Heart className={`w-4 h-4 ${saved ? 'fill-red-500' : ''}`} /></button>
                <button onClick={() => setReport(true)} aria-label="Report listing" className="p-3 rounded-xl border border-gray-200 text-gray-400 hover:border-gray-300"><Flag className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>
      {inquiry && item && <InquiryModal targetType={type} targetId={id} businessName={title} onClose={() => setInquiry(false)} onSignIn={() => { onClose(); onSignIn(); }} />}
      {report && item && <ReportModal entityType={type} entityId={id} title={title} onClose={() => setReport(false)} onSignIn={() => { onClose(); onSignIn(); }} />}
    </div>
  );
}

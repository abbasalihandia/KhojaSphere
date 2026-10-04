import { useRef, useState } from 'react';
import { Plus, Trash2, ImagePlus, X } from 'lucide-react';
import { uploadImages, errorMessage } from '../api';
import type { FormState, Kind } from '../lib/listingForm';

const input = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition bg-white';
const PROPERTY_TYPES = ['Apartment', 'Villa', 'Studio', 'Penthouse', 'Row House', 'Office', 'Shop', 'Shared Room'];

interface Props {
  kind: Kind;
  state: FormState;
  onChange: (patch: Partial<FormState>) => void;
  errors?: Record<string, string>;
}

function Field({ label, error, children, hint }: { label: string; error?: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-gray-400 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

export function ImageUploader({ images, onChange, max = 6 }: { images: string[]; onChange: (imgs: string[]) => void; max?: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const room = max - images.length;
    if (room <= 0) { setError(`You can add up to ${max} photos.`); return; }
    setBusy(true);
    setError(null);
    try {
      const urls = await uploadImages(Array.from(files).slice(0, room));
      onChange([...images, ...urls]);
    } catch (e) {
      setError(errorMessage(e, 'Upload failed. Please try again.'));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <div key={src} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
            <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            {i === 0 && <span className="absolute bottom-0 inset-x-0 text-[10px] text-center bg-black/55 text-white py-0.5">Main</span>}
            <button type="button" onClick={() => onChange(images.filter((x) => x !== src))} aria-label="Remove photo" className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/90 flex items-center justify-center text-gray-600 hover:text-red-600">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {images.length < max && (
          <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="w-20 h-20 rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-brand-300 hover:text-brand-600 flex flex-col items-center justify-center text-[11px] gap-1 disabled:opacity-60">
            <ImagePlus className="w-5 h-5" />
            {busy ? 'Uploading…' : 'Add photo'}
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => pick(e.target.files)} />
      <p className="text-xs text-gray-400 mt-2">JPG, PNG or WebP, up to 5 MB each. The first photo is the main one.</p>
      {error && <p className="text-xs text-red-600 mt-1" role="alert">{error}</p>}
    </div>
  );
}

export function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');
  const commit = () => {
    const v = value.trim().slice(0, 40);
    if (v && !tags.some((t) => t.toLowerCase() === v.toLowerCase()) && tags.length < 12) onChange([...tags, v]);
    setValue('');
    setAdding(false);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => (
        <span key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs border border-brand-200">
          {t}
          <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`Remove tag ${t}`} className="text-brand-400 hover:text-brand-600 transition-colors">×</button>
        </span>
      ))}
      {adding ? (
        <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') { setValue(''); setAdding(false); } }} placeholder="Tag name" className="px-3 py-1.5 rounded-full border border-brand-300 text-xs outline-none w-32" />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-xs text-gray-400 hover:border-brand-300 hover:text-brand-600 transition-colors">+ Add tag</button>
      )}
    </div>
  );
}

/** Kind-specific detail fields (everything except title / description / category / tags). */
export default function ListingFields({ kind, state: s, onChange, errors = {} }: Props) {
  return (
    <div className="space-y-4">
      {kind === 'business' && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="I am listing a">
              <select value={s.bizKind} onChange={(e) => onChange({ bizKind: e.target.value as FormState['bizKind'] })} className={input}>
                <option value="business">Business</option>
                <option value="professional">Independent professional</option>
              </select>
            </Field>
            <Field label="City *" error={errors.city}><input className={input} value={s.city} onChange={(e) => onChange({ city: e.target.value })} placeholder="Mumbai" maxLength={80} /></Field>
            <Field label="Locality"><input className={input} value={s.locality} onChange={(e) => onChange({ locality: e.target.value })} placeholder="Bandra West" maxLength={80} /></Field>
            <Field label="Address"><input className={input} value={s.address} onChange={(e) => onChange({ address: e.target.value })} maxLength={300} /></Field>
            <Field label="Phone" error={errors.phone}><input className={input} value={s.phone} onChange={(e) => onChange({ phone: e.target.value })} placeholder="+91 98765 43210" /></Field>
            <Field label="Email" error={errors.email}><input type="email" className={input} value={s.email} onChange={(e) => onChange({ email: e.target.value })} /></Field>
            <Field label="Website"><input className={input} value={s.website} onChange={(e) => onChange({ website: e.target.value })} maxLength={300} /></Field>
            <Field label="Instagram"><input className={input} value={s.instagram} onChange={(e) => onChange({ instagram: e.target.value })} placeholder="@yourhandle" maxLength={80} /></Field>
            <Field label="Opening hours / availability"><input className={input} value={s.hours} onChange={(e) => onChange({ hours: e.target.value })} placeholder="Mon–Sat 10:00 AM – 7:00 PM" maxLength={160} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price from (₹)" error={errors.priceMin}><input inputMode="numeric" className={input} value={s.priceMin} onChange={(e) => onChange({ priceMin: e.target.value.replace(/[^\d]/g, '') })} /></Field>
              <Field label="Price up to (₹)" error={errors.priceMax}><input inputMode="numeric" className={input} value={s.priceMax} onChange={(e) => onChange({ priceMax: e.target.value.replace(/[^\d]/g, '') })} /></Field>
            </div>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-600 mb-2">Services</span>
            <div className="space-y-2">
              {s.services.map((svc, i) => (
                <div key={i} className="flex gap-2">
                  <input className={input} placeholder="Service name" value={svc.name} maxLength={160} onChange={(e) => onChange({ services: s.services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                  <input className={`${input} max-w-[10rem]`} placeholder="From ₹3,000" value={svc.price} maxLength={80} onChange={(e) => onChange({ services: s.services.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)) })} />
                  <button type="button" aria-label="Remove service" onClick={() => onChange({ services: s.services.filter((_, j) => j !== i) })} className="p-2 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {s.services.length < 20 && (
                <button type="button" onClick={() => onChange({ services: [...s.services, { name: '', price: '' }] })} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800"><Plus className="w-3.5 h-3.5" />Add a service</button>
              )}
            </div>
          </div>
        </>
      )}

      {kind === 'property' && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Listing type">
            <select value={s.listingType} onChange={(e) => onChange({ listingType: e.target.value })} className={input}>
              <option value="rent">For rent</option><option value="sale">For sale</option><option value="shared">Shared accommodation</option><option value="commercial">Commercial</option>
            </select>
          </Field>
          <Field label="Property type" error={errors.propertyType}>
            <select value={s.propertyType} onChange={(e) => onChange({ propertyType: e.target.value })} className={input}>{PROPERTY_TYPES.map((p) => <option key={p}>{p}</option>)}</select>
          </Field>
          <Field label={s.listingType === 'sale' ? 'Price (₹) *' : 'Rent per month (₹) *'} error={errors.price}>
            <input inputMode="numeric" className={input} value={s.price} onChange={(e) => onChange({ price: e.target.value.replace(/[^\d]/g, '') })} />
          </Field>
          <Field label="Furnishing" error={errors.furnishing}>
            <select value={s.furnishing} onChange={(e) => onChange({ furnishing: e.target.value })} className={input}><option value="">Not specified</option><option>Furnished</option><option>Semi-furnished</option><option>Unfurnished</option></select>
          </Field>
          <Field label="Bedrooms" error={errors.bedrooms}><input inputMode="numeric" className={input} value={s.bedrooms} onChange={(e) => onChange({ bedrooms: e.target.value.replace(/[^\d]/g, '') })} /></Field>
          <Field label="Bathrooms" error={errors.bathrooms}><input inputMode="numeric" className={input} value={s.bathrooms} onChange={(e) => onChange({ bathrooms: e.target.value.replace(/[^\d]/g, '') })} /></Field>
          <Field label="Area (sqft)" error={errors.areaSqft}><input inputMode="numeric" className={input} value={s.areaSqft} onChange={(e) => onChange({ areaSqft: e.target.value.replace(/[^\d]/g, '') })} /></Field>
          <Field label="Availability"><input className={input} value={s.availability} onChange={(e) => onChange({ availability: e.target.value })} placeholder="Immediately / Available from 1 Nov" maxLength={80} /></Field>
          <Field label="City"><input className={input} value={s.city} onChange={(e) => onChange({ city: e.target.value })} placeholder="Mumbai" maxLength={80} /></Field>
          <Field label="Locality"><input className={input} value={s.locality} onChange={(e) => onChange({ locality: e.target.value })} placeholder="Powai" maxLength={80} /></Field>
          <Field label="Amenities" hint="Comma separated"><input className={input} value={s.amenities} onChange={(e) => onChange({ amenities: e.target.value })} placeholder="Lift, Parking, Gym" /></Field>
          <Field label="Posted by">
            <select value={s.posterType} onChange={(e) => onChange({ posterType: e.target.value })} className={input}><option>Owner listing</option><option>Agent listing</option></select>
          </Field>
        </div>
      )}

      {kind === 'marketplace' && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Price (₹) *" error={errors.price}><input inputMode="numeric" className={input} value={s.price} onChange={(e) => onChange({ price: e.target.value.replace(/[^\d]/g, '') })} /></Field>
          <Field label="Condition" error={errors.condition}>
            <select value={s.condition} onChange={(e) => onChange({ condition: e.target.value })} className={input}><option>New</option><option>Like New</option><option>Good</option><option>Fair</option></select>
          </Field>
          <Field label="City"><input className={input} value={s.city} onChange={(e) => onChange({ city: e.target.value })} placeholder="Mumbai" maxLength={80} /></Field>
          <Field label="Locality / pickup area"><input className={input} value={s.locality} onChange={(e) => onChange({ locality: e.target.value })} placeholder="Andheri" maxLength={80} /></Field>
          <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2"><input type="checkbox" checked={s.negotiable} onChange={(e) => onChange({ negotiable: e.target.checked })} className="accent-brand-700" /> Price is negotiable</label>
        </div>
      )}

      <div>
        <span className="block text-xs font-medium text-gray-600 mb-2">Photos</span>
        <ImageUploader images={s.images} onChange={(images) => onChange({ images })} />
      </div>
    </div>
  );
}

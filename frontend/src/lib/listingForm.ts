import type { Business, ListingDraft, MarketItem, Property } from '../api';
import type { BusinessInput, MarketInput, PropertyInput } from '../api';

export type Kind = 'business' | 'property' | 'marketplace';

export interface FormState {
  title: string; description: string; category: string; tags: string[]; images: string[];
  city: string; locality: string; address: string;
  // business
  bizKind: 'business' | 'professional'; phone: string; email: string; website: string; instagram: string; hours: string;
  priceMin: string; priceMax: string; services: { name: string; price: string }[];
  // property
  listingType: string; propertyType: string; price: string; bedrooms: string; bathrooms: string; areaSqft: string;
  furnishing: string; availability: string; amenities: string; posterType: string;
  // marketplace
  condition: string; negotiable: boolean;
}

export const emptyForm = (): FormState => ({
  title: '', description: '', category: '', tags: [], images: [], city: '', locality: '', address: '',
  bizKind: 'business', phone: '', email: '', website: '', instagram: '', hours: '', priceMin: '', priceMax: '', services: [],
  listingType: 'rent', propertyType: 'Apartment', price: '', bedrooms: '', bathrooms: '', areaSqft: '', furnishing: '', availability: '',
  amenities: '', posterType: 'Owner listing', condition: 'Good', negotiable: false,
});

const num = (s: string): number | null => {
  const n = Number(String(s).replace(/[, ]/g, ''));
  return s.trim() !== '' && Number.isFinite(n) ? Math.round(n) : null;
};
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

/** Fill the form from an AI draft (the model suggests prose; deterministic extraction fills numbers/contacts). */
export function applyDraft(kind: Kind, d: ListingDraft, base: FormState = emptyForm()): FormState {
  const f = d.fields;
  const s: FormState = { ...base, title: d.title, description: d.description, category: d.category, tags: d.tags };
  s.city = str(f.city) || s.city;
  s.locality = str(f.locality) || s.locality;
  s.phone = str(f.phone) || s.phone;
  s.email = str(f.email) || s.email;
  if (kind === 'business') {
    if (f.kind === 'professional') s.bizKind = 'professional';
    if (f.priceMin) s.priceMin = str(f.priceMin);
  } else if (kind === 'property') {
    s.listingType = str(f.listingType) || s.listingType;
    s.propertyType = str(f.propertyType) || d.category || s.propertyType;
    s.price = str(f.price);
    s.bedrooms = str(f.bedrooms);
    s.bathrooms = str(f.bathrooms);
    s.areaSqft = str(f.areaSqft);
    s.furnishing = str(f.furnishing);
    s.amenities = d.tags.join(', ');
  } else {
    s.price = str(f.price);
    s.condition = str(f.condition) || s.condition;
    s.negotiable = f.negotiable === true;
  }
  return s;
}

export function fromBusiness(b: Business): FormState {
  return { ...emptyForm(), title: b.name, description: b.description, category: b.category, tags: b.tags, images: b.images,
    city: b.city ?? '', locality: b.locality ?? '', address: b.address ?? '', bizKind: b.kind, phone: b.phone ?? '', email: b.email ?? '',
    website: b.website ?? '', instagram: b.instagram ?? '', hours: b.hours ?? '', priceMin: b.priceMin != null ? String(b.priceMin) : '',
    priceMax: b.priceMax != null ? String(b.priceMax) : '', services: b.services.map((s) => ({ name: s.name, price: s.price ?? '' })) };
}
export function fromProperty(p: Property): FormState {
  return { ...emptyForm(), title: p.title, description: p.description, category: p.propertyType, images: p.images, city: p.city ?? '',
    locality: p.locality ?? '', address: p.address ?? '', listingType: p.type, propertyType: p.propertyType, price: String(p.priceValue),
    bedrooms: p.bedrooms != null ? String(p.bedrooms) : '', bathrooms: p.bathrooms != null ? String(p.bathrooms) : '',
    areaSqft: p.areaSqft != null ? String(p.areaSqft) : '', furnishing: p.furnishing ?? '', availability: p.available ?? '',
    amenities: p.amenities.join(', '), posterType: p.owner };
}
export function fromMarket(m: MarketItem): FormState {
  return { ...emptyForm(), title: m.title, description: m.description, category: m.category, images: m.images, city: m.city ?? '',
    locality: m.locality ?? '', price: String(m.priceValue), condition: m.condition, negotiable: m.negotiable };
}

const opt = (s: string) => (s.trim() ? s.trim() : undefined);

export function toBusiness(s: FormState, submit: boolean): BusinessInput {
  return {
    kind: s.bizKind, name: s.title.trim(), category: s.category, description: s.description.trim(), city: opt(s.city), locality: opt(s.locality),
    address: opt(s.address), phone: opt(s.phone), email: opt(s.email), website: opt(s.website), instagram: opt(s.instagram), hours: opt(s.hours),
    priceMin: num(s.priceMin), priceMax: num(s.priceMax), tags: s.tags,
    services: s.services.filter((x) => x.name.trim()).map((x) => ({ name: x.name.trim(), price: opt(x.price) })), images: s.images, submit,
  };
}
export function toProperty(s: FormState): PropertyInput {
  return {
    title: s.title.trim(), description: s.description.trim(), listingType: s.listingType, propertyType: s.propertyType,
    price: num(s.price) ?? undefined, city: opt(s.city), locality: opt(s.locality), address: opt(s.address), bedrooms: num(s.bedrooms),
    bathrooms: num(s.bathrooms), areaSqft: num(s.areaSqft), furnishing: s.furnishing || null, availability: opt(s.availability),
    amenities: s.amenities.split(',').map((x) => x.trim()).filter(Boolean), images: s.images, posterType: s.posterType,
  };
}
export function toMarket(s: FormState): MarketInput {
  return {
    title: s.title.trim(), description: s.description.trim(), category: s.category, price: num(s.price) ?? undefined, negotiable: s.negotiable,
    condition: s.condition, city: opt(s.city), locality: opt(s.locality), images: s.images,
  };
}

/** What the listing is still missing (recomputed live as the user fills things in). */
export function missingFor(kind: Kind, s: FormState): string[] {
  const out: string[] = [];
  if (kind === 'business') {
    if (!s.priceMin && !s.services.some((x) => x.price)) out.push('Service pricing');
    if (!s.hours.trim()) out.push('Availability');
    if (!s.phone.trim() && !s.email.trim()) out.push('Contact details');
    if (!s.address.trim() && !s.locality.trim()) out.push('Business address');
    if (!s.city.trim()) out.push('City');
  } else if (kind === 'property') {
    if (!s.price) out.push('Price');
    if (!s.areaSqft) out.push('Area (sqft)');
    if (!s.furnishing) out.push('Furnishing');
    if (!s.locality.trim()) out.push('Locality');
  } else {
    if (!s.price) out.push('Price');
    if (!s.city.trim() && !s.locality.trim()) out.push('Pickup location');
  }
  if (!s.images.length) out.push('Photos');
  return out;
}

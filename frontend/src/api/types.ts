// Response shapes returned by the backend (camelCase JSON).
import type { OwnerOneId } from './oneId/types';
export interface Page<T> { items: T[]; total: number; page: number; limit: number; pages: number }

export interface User {
  id: number; name: string; email: string; phone: string | null; avatarUrl: string | null; city: string | null;
  bio: string | null; accountType: AccountType; role: 'user' | 'admin'; createdAt: string;
}
export type AccountType = 'member' | 'business' | 'professional' | 'property' | 'seller' | 'mentor';
export interface AuthResult { token: string; expiresAt: string; user: User }

export interface Service { name: string; price: string | null }
export interface Business {
  ownerOneId?: OwnerOneId | null; /* from One ID, set by the backend once integrated */
  id: number; kind: 'business' | 'professional'; name: string; category: string; shortDesc: string; description: string;
  location: string; city: string | null; locality: string | null; address: string | null; image: string | null;
  images: string[]; coverImage: string | null; tags: string[]; status: string; verification: string;
  listingStatus: 'draft' | 'pending' | 'approved' | 'rejected' | 'hidden'; priceRange: string; priceMin: number | null;
  priceMax: number | null; phone: string | null; email: string | null; website: string | null; instagram: string | null;
  hours: string | null; services: Service[]; ownerId: number | null; isOwner: boolean; isSample: boolean;
  viewCount: number | null; createdAt: string; updatedAt: string;
}
export type ListingType = 'rent' | 'sale' | 'shared' | 'commercial';
export interface Property {
  ownerOneId?: OwnerOneId | null; /* from One ID, set by the backend once integrated */
  id: number; title: string; description: string; type: ListingType; propertyType: string; price: string; priceValue: number;
  pricePeriod: 'month' | 'total'; location: string; city: string | null; locality: string | null; address: string | null;
  bedrooms: number | null; bathrooms: number | null; area: string; areaSqft: number | null; furnishing: string | null;
  amenities: string[]; image: string | null; images: string[]; owner: string; isOwner: boolean; available: string | null;
  label: string; status: 'active' | 'hidden' | 'closed'; isSample: boolean; posted: string; createdAt: string;
}
export interface MarketItem {
  ownerOneId?: OwnerOneId | null; /* from One ID, set by the backend once integrated */
  id: number; title: string; description: string; price: string; priceValue: number; condition: string; location: string;
  city: string | null; locality: string | null; negotiable: boolean; category: string; image: string | null; images: string[];
  posted: string; label: string; status: 'active' | 'hidden' | 'sold'; isOwner: boolean; isSample: boolean; createdAt: string;
}
export type EntityType = 'business' | 'property' | 'marketplace';
export type SearchItemType = 'business' | 'professional' | 'property' | 'marketplace';
export interface SearchItem {
  ownerOneId?: OwnerOneId | null; /* from One ID, set by the backend once integrated */
  type: SearchItemType; id: number; name: string; category: string; shortDesc: string; location: string; image: string | null;
  tags: string[]; status: string; priceRange: string; isSample: boolean; score: number;
}
export interface SearchPage extends Page<SearchItem> { filters: string[]; provider: string; relaxed: boolean }
export interface Category { id: number; kind: 'business' | 'marketplace'; name: string; icon: string | null; count: number; isActive: boolean; sortOrder: number }
export interface Stats { businesses: number; properties: number; marketplaceItems: number; cities: number }

export interface Inquiry {
  id: number; targetType: EntityType | 'mentor'; targetId: number; targetTitle: string; senderName: string; message: string;
  contactMethod: 'platform' | 'email' | 'phone'; status: 'unread' | 'read' | 'replied'; replyText: string | null;
  repliedAt: string | null; createdAt: string; time: string; box: 'received' | 'sent';
}
export interface Mentor {
  ownerOneId?: OwnerOneId | null; /* from One ID, set by the backend once integrated */
  id: number; name: string; role: string; expertise: string[]; education: string | null; format: string | null;
  availability: string | null; image: string | null; bio: string | null; status: string; isSample: boolean; requested: boolean; isOwner: boolean;
}
export interface Report { id: number; listing: string; type: string; entityType: EntityType; entityId: number; reason: string; details: string | null; status: string; statusKey: 'pending' | 'under_review' | 'resolved'; date: string }
export interface FavoriteIds { business: number[]; property: number[]; marketplace: number[] }
export interface FavoritesDetail { businesses: Business[]; properties: Property[]; marketplace: MarketItem[] }
export interface DashboardSummary {
  activeListings: number; pendingReview: number; savedItems: number; newInquiries: number; drafts: number; totalViews: number;
  activity: { kind: string; text: string; time: string }[];
}
export interface AIStatus { enabled: boolean; provider: 'ollama' | 'fallback'; available: boolean; chatModel: string | null; embedModel: string | null; semanticSearch: boolean; detail: string }
export interface ChatReply { reply: string; results: SearchItem[]; filters: string[]; action: string | null; provider: string; degraded: boolean }
export interface ListingDraft {
  kind: 'business' | 'property' | 'marketplace'; title: string; description: string; shortDesc: string; category: string;
  tags: string[]; fields: Record<string, unknown>; missing: string[]; provider: string; degraded: boolean;
}
export interface AdminOverview {
  totalUsers: number; totalBusinesses: number; pendingBusinesses: number; propertyListings: number; marketplaceItems: number;
  openReports: number; pendingMentors: number;
}
export interface AdminUser extends User { isActive: boolean }

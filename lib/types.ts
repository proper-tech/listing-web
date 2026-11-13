export type Category = 'apartment' | 'house' | 'land' | 'office' | 'shop' | 'warehouse' | 'garage' | 'summer_house';
export type DealType = 'sale' | 'rent';
export type ListingStatus = 'draft' | 'pending' | 'active' | 'expired' | 'sold' | 'rejected' | 'archived';
export type Placement = 'free' | 'vip' | 'top';
export type SellerType = 'owner' | 'agent' | 'company';

export interface Img { src: string; width: number; height: number }

export interface Hotspot { yaw: number; pitch: number; targetRoomId: string; label?: string }

export interface TourRoom {
  id: string;
  name: string;
  source: 'upload360' | 'stitched' | 'ai' | 'splat';
  panorama?: Img;
  status: 'processing' | 'ready' | 'failed';
  error?: string;
  startYaw: number;
  hotspots: Hotspot[];
  floorPlanPosition?: [number, number];
  /** partial panorama (e.g. iPhone Pano): degrees covered horizontally / vertically. Absent = full 360° sphere */
  haov?: number;
  vaov?: number;
}

export interface Tour { startRoomId: string | null; rooms: TourRoom[] }

export interface ListingLocation {
  city?: string; district: string; khoroo?: string; address?: string; lat: number; lng: number;
}

export interface Listing {
  id: string;
  sellerName: string;
  sellerType: SellerType;
  category: Category;
  dealType: DealType;
  title: string;
  price: number;
  pricePerM2?: number;
  rooms?: number;
  area?: number;
  floor?: number;
  buildingFloors?: number;
  yearInUse?: number;
  floorMaterial?: string;
  balconies?: number;
  windowType?: string;
  windowCount?: number;
  doorType?: string;
  garage?: boolean;
  leasing?: boolean;
  paymentTerms?: string[];
  location: ListingLocation;
  description?: string;
  photos: Img[];
  tour?: Tour;
  placement: Placement;
  placementUntil?: string;
  status: ListingStatus;
  views: number;
  createdAt: string;
  /** mock data only; the API has no expiry */
  expiresAt?: string;
  /** computed by the API */
  hasTour: boolean;
  /** 2 = top, 1 = vip, 0 = none (only while the placement is paid up) */
  promo: number;
}

export type Role = 'admin' | 'agent';
export interface User {
  id: string; name: string; email: string; phone: string; role: Role; active: boolean; createdAt: string; mustChangePassword: boolean;
}
export interface AdminUser extends User { listings: number }

export interface AdminListing extends Listing { ownerPhone: string; ownerName: string | null; reports: number }
export interface Report { id: string; listingId: string; reason: string; note?: string; createdAt: string }
/** Зарын талаарх холбоо барих хүсэлт (худалдан авагчаас зар оруулагч руу). */
export interface Inquiry { id: string; listingId: string; name: string; phone: string; email?: string; message: string; createdAt: string; read?: boolean }
export interface InquiryWithListing extends Inquiry { listingTitle: string }

export interface SearchResult { total: number; page: number; per: number; items: Listing[] }
export interface Stats { counts: Record<string, number>; total: number }

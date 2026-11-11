// Mock өгөгдөл: жишээ зарууд, хэрэглэгчид. Зураг нь public/mock/ дотор.
import { CENTERS } from '../constants';
import type { Category, DealType, Img, Listing, ListingStatus, Placement, Report, Role, SellerType, Tour } from '../types';

/** Listing as kept in the mock DB (owner fields are never sent to pages as-is). */
export type StoredListing = Omit<Listing, 'hasTour' | 'promo'> & { ownerId?: string; ownerPhone: string };
export interface StoredUser {
  id: string; name: string; email: string; phone: string; role: Role; active: boolean;
  createdAt: string; mustChangePassword: boolean; password: string;
}
export interface MockDB {
  version: number;
  nextNo: number;
  listings: StoredListing[];
  users: StoredUser[];
  reports: Report[];
  sessionUserId: string | null;
}

export const DB_VERSION = 1;
const H = 3600e3, D = 24 * H;
const hash = (n: number) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

const pano = (src: string): Img => ({ src, width: 2048, height: 1024 });
const photo = (src: string): Img => ({ src, width: 960, height: 640 });
const demo = (f: string) => `/mock/demo/${f}`;
const photos = (k: string) => [1, 2, 3, 4].map((i) => photo(demo(`${k}-photo${i}.png`)));

function aptTour(k: string): Tour {
  return {
    startRoomId: 'r1',
    rooms: [
      { id: 'r1', name: 'Зочны өрөө', source: 'upload360', panorama: pano(demo(`${k}-living.png`)), status: 'ready', startYaw: 0,
        hotspots: [{ yaw: 90, pitch: -8, targetRoomId: 'r2', label: 'Гал тогоо' }, { yaw: -90, pitch: -8, targetRoomId: 'r3', label: 'Унтлагын өрөө' }], floorPlanPosition: [50, 62] },
      { id: 'r2', name: 'Гал тогоо', source: 'stitched', panorama: pano(demo(`${k}-kitchen.png`)), status: 'ready', startYaw: 0,
        hotspots: [{ yaw: -90, pitch: -11, targetRoomId: 'r1', label: 'Зочны өрөө' }], floorPlanPosition: [84, 34] },
      { id: 'r3', name: 'Унтлагын өрөө', source: 'stitched', panorama: pano(demo(`${k}-bedroom.png`)), status: 'ready', startYaw: 0,
        hotspots: [{ yaw: 90, pitch: -10, targetRoomId: 'r1', label: 'Зочны өрөө' }], floorPlanPosition: [16, 34] },
    ],
  };
}
const oneRoom = (id: string, name: string, file: string): Tour =>
  ({ startRoomId: id, rooms: [{ id, name, source: 'upload360', panorama: pano(demo(file)), status: 'ready', startYaw: 0, hotspots: [] }] });

interface SeedRow {
  id: string; category: Category; deal?: DealType; district: string; khoroo?: string; address?: string; title: string; price: number;
  rooms?: number; area?: number; floor?: number; bf?: number; year?: number; floorMaterial?: string; balconies?: number;
  windowType?: string; windowCount?: number; doorType?: string; garage?: boolean; leasing?: boolean; pay?: string[];
  placement?: Placement; ago?: number; seller: string; sellerType?: SellerType; phone: string; tour?: Tour; photos?: Img[];
  desc: string; status?: ListingStatus; views?: number;
}

const ROWS: SeedRow[] = [
  { id: 'L100001', category: 'apartment', district: 'Хан-Уул', khoroo: '11-р хороо', title: 'Хан-Уул, 3 өрөө, 85м², шинэ байр', price: 320e6, rooms: 3, area: 85, floor: 7, bf: 16, year: 2021, floorMaterial: 'Паркет', balconies: 1, windowType: 'Вакуум', windowCount: 4, doorType: 'Бүргэд', garage: true, leasing: true, pay: ['Бэлэн', 'Банкны зээл', 'Ипотек'], placement: 'top', ago: 2 * H, seller: 'Батболд', phone: '99000001', tour: aptTour('a'), photos: photos('a'), desc: 'Шинэ байрны 7 давхарт, нарны гэрэл сайтай 3 өрөө байр. Дулаан зогсоол, тоглоомын талбайтай. Сургууль, цэцэрлэг ойрхон.' },
  { id: 'L100002', category: 'apartment', district: 'Сүхбаатар', khoroo: '1-р хороо', title: 'Төвд 2 өрөө байр, засвартай', price: 245e6, rooms: 2, area: 56, floor: 4, bf: 9, year: 2012, floorMaterial: 'Ламинат', balconies: 1, windowType: 'Вакуум', windowCount: 3, doorType: 'Төмөр', pay: ['Бэлэн', 'Ипотек'], placement: 'vip', ago: 5 * H, seller: 'Сараа', phone: '99000002', tour: aptTour('b'), photos: photos('b'), desc: 'Улсын их дэлгүүрийн ар талд. Бүрэн засвартай, тавилгатай зарна. Шууд орж амьдрах боломжтой.' },
  { id: 'L100003', category: 'apartment', district: 'Баянзүрх', khoroo: '26-р хороо', title: '1 өрөө байр, 13-р хороолол', price: 135e6, rooms: 1, area: 38, floor: 2, bf: 5, year: 1985, floorMaterial: 'Паркет', balconies: 1, windowType: 'Мод', windowCount: 2, doorType: 'Төмөр', pay: ['Бэлэн', 'Бартер'], ago: 20 * H, seller: 'Дорж', phone: '99000003', photos: photos('c').slice(0, 2), desc: 'Хуучин байр, дулаан. Автобусны буудал ойрхон.' },
  { id: 'L100004', category: 'apartment', district: 'Баянгол', khoroo: '3-р хороо', title: '4 өрөө тансаг байр, 120м²', price: 480e6, rooms: 4, area: 120, floor: 10, bf: 12, year: 2019, floorMaterial: 'Паркет', balconies: 2, windowType: 'Вакуум', windowCount: 6, doorType: 'Бүргэд', garage: true, leasing: true, pay: ['Бэлэн', 'Банкны зээл'], placement: 'vip', ago: 1.2 * D, seller: 'Гэр Агент ХХК', sellerType: 'agent', phone: '99000004', tour: aptTour('c'), photos: photos('c'), desc: 'Хотын үзэмжтэй, 2 тагттай. Агентаар дамжуулан зарж байна.' },
  { id: 'L100005', deal: 'rent', category: 'apartment', district: 'Чингэлтэй', khoroo: '4-р хороо', title: '2 өрөө байр түрээслүүлнэ, тавилгатай', price: 2.2e6, rooms: 2, area: 60, floor: 6, bf: 12, year: 2015, floorMaterial: 'Ламинат', balconies: 1, windowType: 'Вакуум', windowCount: 3, doorType: 'Бүргэд', pay: ['Бэлэн'], ago: 8 * H, seller: 'Оюун', phone: '99000005', tour: aptTour('b'), photos: photos('b').slice(0, 3), desc: 'Урт хугацаагаар түрээслүүлнэ. Угаалгын машин, хөргөгчтэй.' },
  { id: 'L100006', deal: 'rent', category: 'apartment', district: 'Хан-Уул', khoroo: '15-р хороо', title: 'Зайсанд 3 өрөө түрээс', price: 3.5e6, rooms: 3, area: 90, floor: 9, bf: 14, year: 2020, floorMaterial: 'Паркет', balconies: 1, windowType: 'Вакуум', windowCount: 4, doorType: 'Бүргэд', garage: true, pay: ['Бэлэн'], placement: 'top', ago: 3 * H, seller: 'Гэр Агент ХХК', sellerType: 'agent', phone: '99000004', tour: aptTour('a'), photos: photos('a').slice(1), desc: 'Богд уулын үзэмжтэй. Гараж түрээсэнд багтсан.' },
  { id: 'L100007', category: 'house', district: 'Сонгинохайрхан', khoroo: '20-р хороо', title: 'Хашаа байшин, 0.07 га газартай', price: 280e6, rooms: 5, area: 140, bf: 2, year: 2016, floorMaterial: 'Модон', windowType: 'Вакуум', windowCount: 8, doorType: 'Төмөр', garage: true, pay: ['Бэлэн', 'Банкны зээл'], ago: 2 * D, seller: 'Ганбаатар', phone: '99000007', tour: oneRoom('y', 'Хашаа', 'yard.png'), photos: [photo(demo('yard-photo.png')), ...photos('c').slice(0, 2)], desc: '2 давхар амины орон сууц, гаражтай. Төвийн шугамд холбогдсон.' },
  { id: 'L100008', category: 'land', district: 'Налайх', title: 'Налайхад 700м² газар, гэрчилгээтэй', price: 45e6, area: 700, pay: ['Бэлэн', 'Бартер'], ago: 3 * D, seller: 'Энхээ', phone: '99000008', tour: oneRoom('l', 'Газар', 'land.png'), photos: [photo(demo('land-photo.png'))], desc: 'Зам дагуу, цахилгаан ойрхон. Хувийн өмчлөлийн гэрчилгээтэй.' },
  { id: 'L100009', category: 'office', district: 'Сүхбаатар', khoroo: '8-р хороо', title: 'Оффис зарна, 150м², бизнес төвд', price: 900e6, rooms: 4, area: 150, floor: 5, bf: 17, year: 2014, floorMaterial: 'Плита', windowType: 'Вакуум', windowCount: 8, doorType: 'Бүргэд', leasing: true, pay: ['Бэлэн', 'Банкны зээл'], placement: 'vip', ago: 26 * H, seller: 'Гэр Агент ХХК', sellerType: 'agent', phone: '99000004', photos: photos('b'), desc: 'Хурлын өрөө, 3 тусгай өрөөтэй. Зогсоолтой.' },
  { id: 'L100010', deal: 'rent', category: 'office', district: 'Чингэлтэй', title: 'Оффис түрээслүүлнэ 80м²', price: 4e6, rooms: 2, area: 80, floor: 3, bf: 10, year: 2010, floorMaterial: 'Плита', pay: ['Бэлэн'], ago: 4 * D, seller: 'Төмөр', phone: '99000010', photos: photos('b').slice(2), desc: 'Төв замын хажууд, хүн ихтэй байршил.' },
  { id: 'L100011', deal: 'rent', category: 'shop', district: 'Баянгол', title: 'Худалдааны талбай, 1 давхарт 45м²', price: 2.8e6, area: 45, floor: 1, bf: 9, year: 2008, pay: ['Бэлэн'], ago: 12 * H, seller: 'Нараа', phone: '99000011', photos: photos('c').slice(1, 3), desc: 'Гудамж руу харсан тусдаа орцтой. Дэлгүүр, кофе шопод тохиромжтой.' },
  { id: 'L100012', category: 'warehouse', district: 'Сонгинохайрхан', title: 'Агуулах 600м², ачааны машин орох', price: 1.2e9, area: 600, year: 2011, pay: ['Бэлэн', 'Банкны зээл'], ago: 6 * D, seller: 'Логистик Хаус', sellerType: 'agent', phone: '99000012', photos: [photo(demo('land-photo.png'))], desc: 'Халаалттай агуулах, оффисын хэсэгтэй.' },
  { id: 'L100013', category: 'garage', district: 'Баянзүрх', title: 'Дулаан гараж зарна, 18м²', price: 25e6, area: 18, pay: ['Бэлэн'], ago: 30 * H, seller: 'Баяраа', phone: '99000013', photos: [photo(demo('yard-photo.png'))], desc: 'Байрны доорх дулаан зогсоол.' },
  { id: 'L100014', category: 'summer_house', district: 'Хан-Уул', title: 'Зуслангийн байшин, 4 өрөө', price: 350e6, rooms: 4, area: 90, year: 2018, floorMaterial: 'Модон', windowType: 'Вакуум', pay: ['Бэлэн', 'Банкны зээл'], ago: 2.5 * D, seller: 'Цэцгээ', phone: '99000014',
    tour: { startRoomId: 'y', rooms: [
      { id: 'y', name: 'Хашаа', source: 'upload360', panorama: pano(demo('yard.png')), status: 'ready', startYaw: 0, hotspots: [{ yaw: 0, pitch: -6, targetRoomId: 'r', label: 'Байшин руу' }] },
      { id: 'r', name: 'Зочны өрөө', source: 'stitched', panorama: pano(demo('c-living.png')), status: 'ready', startYaw: 0, hotspots: [{ yaw: 90, pitch: -8, targetRoomId: 'y', label: 'Хашаа руу' }] },
    ] }, photos: [photo(demo('yard-photo.png')), photo(demo('c-photo1.png'))], desc: 'Туул голын ойролцоо, жилийн дөрвөн улиралд амьдрах боломжтой.' },
  { id: 'L100015', category: 'apartment', district: 'Хан-Уул', khoroo: '18-р хороо', title: '2 өрөө, 62м², хотхонд', price: 260e6, rooms: 2, area: 62, floor: 1, bf: 12, year: 2017, floorMaterial: 'Ламинат', balconies: 0, windowType: 'Вакуум', windowCount: 3, doorType: 'Бүргэд', pay: ['Бэлэн', 'Ипотек'], ago: 5 * D, seller: 'Мөнх', phone: '99000015', photos: photos('a').slice(2), desc: 'Хотхон дотор, хамгаалалттай.' },
  { id: 'L100016', category: 'apartment', district: 'Сүхбаатар', khoroo: '6-р хороо', title: '3 өрөө 98м², Их тойруу', price: 410e6, rooms: 3, area: 98, floor: 8, bf: 8, year: 2009, floorMaterial: 'Паркет', balconies: 1, windowType: 'Вакуум', windowCount: 5, doorType: 'Бүргэд', leasing: true, pay: ['Бэлэн', 'Банкны зээл', 'Ипотек'], ago: 1.5 * D, seller: 'Гэр Агент ХХК', sellerType: 'agent', phone: '99000004', tour: aptTour('c'), photos: photos('c'), desc: 'Сүүлийн давхар, том тагттай.' },
  { id: 'L100017', category: 'apartment', district: 'Баянгол', title: '2 өрөө байр (батлагдахыг хүлээж буй жишээ)', price: 199e6, rooms: 2, area: 48, floor: 3, bf: 5, year: 1990, pay: ['Бэлэн'], ago: 1 * H, seller: 'Шинэ хэрэглэгч', phone: '99000017', status: 'pending', photos: photos('b').slice(0, 1), desc: 'Админы баталгаажуулалтыг турших зар.' },
];

export const DEMO_AGENT_ID = 'u-demo-agent';

export function seedListings(t = Date.now()): StoredListing[] {
  return ROWS.map((o) => {
    const [lat, lng] = CENTERS[o.district];
    const promoted = !!o.placement && o.placement !== 'free';
    return {
      id: o.id, ownerPhone: o.phone, ownerId: o.phone === '99000004' ? DEMO_AGENT_ID : undefined,
      sellerName: o.seller, sellerType: o.sellerType || 'owner',
      category: o.category, dealType: o.deal || 'sale', title: o.title, price: o.price,
      pricePerM2: o.area ? Math.round(o.price / o.area) : undefined,
      rooms: o.rooms, area: o.area, floor: o.floor, buildingFloors: o.bf, yearInUse: o.year,
      floorMaterial: o.floorMaterial, balconies: o.balconies, windowType: o.windowType, windowCount: o.windowCount,
      doorType: o.doorType, garage: !!o.garage, leasing: !!o.leasing, paymentTerms: o.pay || ['Бэлэн'],
      location: {
        city: 'Улаанбаатар', district: o.district, khoroo: o.khoroo || '', address: o.address || '',
        lat: lat + (hash(o.price) - 0.5) * 0.02, lng: lng + (hash(o.area || 7) - 0.5) * 0.03,
      },
      description: o.desc, photos: o.photos || [], tour: o.tour, placement: o.placement || 'free',
      placementUntil: promoted ? new Date(t + 6 * D).toISOString() : undefined,
      status: o.status || 'active', views: o.views || Math.round(40 + hash(o.price) * 900),
      createdAt: new Date(t - (o.ago || 0)).toISOString(), expiresAt: new Date(t - (o.ago || 0) + 30 * D).toISOString(),
    };
  });
}

export function seedDB(): MockDB {
  const t = Date.now();
  const created = new Date(t - 10 * D).toISOString();
  return {
    version: DB_VERSION,
    nextNo: 100018,
    listings: seedListings(t),
    users: [
      { id: 'u-admin', name: 'Админ', email: 'admin@example.com', phone: '99000000', role: 'admin', active: true, createdAt: created, mustChangePassword: false, password: 'admin1234' },
      { id: DEMO_AGENT_ID, name: 'Гэр Агент ХХК', email: 'agent@example.com', phone: '99000004', role: 'agent', active: true, createdAt: created, mustChangePassword: false, password: 'agent1234' },
    ],
    reports: [
      { id: 'rp-demo-1', listingId: 'L100003', reason: 'wrong_price', createdAt: new Date(t - 4 * H).toISOString() },
    ],
    sessionUserId: null,
  };
}

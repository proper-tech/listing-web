import type { Category, ListingStatus, Placement } from './types';

export const CATS: Record<Category, { name: string; ico: string }> = {
  apartment: { name: 'Орон сууц', ico: '🏢' },
  house: { name: 'Хашаа байшин', ico: '🏡' },
  land: { name: 'Газар', ico: '🌾' },
  office: { name: 'Оффис', ico: '💼' },
  shop: { name: 'Худалдаа, үйлчилгээний талбай', ico: '🏪' },
  warehouse: { name: 'Үйлдвэр, агуулах', ico: '🏭' },
  garage: { name: 'Гараж, зогсоол', ico: '🚗' },
  summer_house: { name: 'Зуслан', ico: '🌲' },
};
export const CAT_KEYS = Object.keys(CATS) as Category[];

export const DISTRICTS = ['Баянзүрх', 'Баянгол', 'Сүхбаатар', 'Чингэлтэй', 'Хан-Уул', 'Сонгинохайрхан', 'Налайх', 'Багануур', 'Багахангай'];

export const CENTERS: Record<string, [number, number]> = {
  'Баянзүрх': [47.918, 106.975], 'Баянгол': [47.912, 106.862], 'Сүхбаатар': [47.925, 106.918], 'Чингэлтэй': [47.935, 106.905],
  'Хан-Уул': [47.885, 106.905], 'Сонгинохайрхан': [47.918, 106.800], 'Налайх': [47.770, 107.255], 'Багануур': [47.790, 108.370], 'Багахангай': [47.330, 107.470],
};
export const UB: [number, number] = [47.915, 106.905];

export const PAY_TERMS = ['Бэлэн', 'Банкны зээл', 'Ипотек', 'Бартер'];

export type FieldKey = 'rooms' | 'area' | 'floor' | 'buildingFloors' | 'yearInUse' | 'floorMaterial' | 'balconies' | 'windowType' | 'windowCount' | 'doorType';
export const FIELD_DEFS: Record<FieldKey, { label: string; type: 'number' | 'select'; options?: string[]; req?: boolean }> = {
  rooms: { label: 'Өрөө', type: 'number' },
  area: { label: 'Талбай (м²)', type: 'number', req: true },
  floor: { label: 'Хэдэн давхарт', type: 'number' },
  buildingFloors: { label: 'Барилгын давхар', type: 'number' },
  yearInUse: { label: 'Ашиглалтад орсон он', type: 'number' },
  floorMaterial: { label: 'Шал', type: 'select', options: ['Паркет', 'Ламинат', 'Плита', 'Модон', 'Бусад'] },
  balconies: { label: 'Тагт', type: 'number' },
  windowType: { label: 'Цонх', type: 'select', options: ['Вакуум', 'Төмөр вакуум', 'Мод', 'Бусад'] },
  windowCount: { label: 'Цонхны тоо', type: 'number' },
  doorType: { label: 'Хаалга', type: 'select', options: ['Бүргэд', 'Төмөр', 'Мод', 'Бусад'] },
};
export const FIELDS_BY_CAT: Record<Category, FieldKey[]> = {
  apartment: ['rooms', 'area', 'floor', 'buildingFloors', 'yearInUse', 'floorMaterial', 'balconies', 'windowType', 'windowCount', 'doorType'],
  house: ['rooms', 'area', 'buildingFloors', 'yearInUse', 'floorMaterial', 'windowType', 'windowCount', 'doorType'],
  land: ['area'],
  office: ['rooms', 'area', 'floor', 'buildingFloors', 'yearInUse', 'floorMaterial', 'windowType', 'doorType'],
  shop: ['area', 'floor', 'buildingFloors', 'yearInUse', 'floorMaterial'],
  warehouse: ['area', 'yearInUse'],
  garage: ['area'],
  summer_house: ['rooms', 'area', 'yearInUse', 'floorMaterial', 'windowType'],
};

export const PLACEMENTS: Record<Placement, { name: string; price: number; note: string }> = {
  free: { name: 'Энгийн зар', price: 0, note: '30 хоног, үнэгүй' },
  vip: { name: 'VIP зар', price: 20000, note: '7 хоног, ангилал, хайлтын эхэнд' },
  top: { name: 'Онцгой зар', price: 40000, note: '7 хоног, нүүр хуудсанд' },
};

export const STATUS_MN: Record<ListingStatus, string> = {
  pending: 'Хянагдаж буй', active: 'Идэвхтэй', expired: 'Хугацаа дууссан', sold: 'Зарагдсан', rejected: 'Татгалзсан', draft: 'Ноорог',
};

export const ROOM_NAMES = ['Зочны өрөө', 'Гал тогоо', 'Унтлагын өрөө', 'Хүүхдийн өрөө', 'Угаалгын өрөө', 'Коридор', 'Тагт', 'Хашаа', 'Гадна тал'];

export const NOIMG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#e9ecef"/><path d="M110 120l40-40 40 40v40h-80z" fill="#ced4da"/></svg>');

export const PANNELLUM_JS = 'https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.js';
export const PANNELLUM_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.css';

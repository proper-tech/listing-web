import type { Category } from '@/lib/types';

// Ангилал бүрийн шугаман дүрс (emoji-гийн оронд, сайтын загвартай нийцтэй).
const PATHS: Record<Category, React.ReactNode> = {
  apartment: <><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="M9 7h1.5M13.5 7H15M9 11h1.5M13.5 11H15M9 15h1.5M13.5 15H15M10.5 21v-2.5h3V21" /></>,
  house: <><path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5h4v5" /></>,
  land: <><path d="M3 18c3-2 6-2 9 0s6 2 9 0" /><path d="M3 14c3-2 6-2 9 0s6 2 9 0" /><path d="M12 10V4M12 7l-2.5-2M12 8.5l2.5-2" /></>,
  office: <><rect x="3.5" y="7" width="17" height="12.5" rx="2" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17" /></>,
  shop: <><path d="M4 9.5 5.5 4h13L20 9.5" /><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" /><path d="M5.5 12v8h13v-8M10 20v-4.5h4V20" /></>,
  warehouse: <><path d="M3 20V9l9-5 9 5v11" /><path d="M7 20v-7h10v7M7 16h10" /></>,
  garage: <><path d="M5 16.5h14M6.5 16.5V19M17.5 16.5V19" /><path d="M5 16.5v-3.2L7 9h10l2 4.3v3.2" /><circle cx="8.5" cy="13.8" r=".6" /><circle cx="15.5" cy="13.8" r=".6" /></>,
  summer_house: <><path d="M12 3 6.5 10h3L5.5 15h5v5h3v-5h5l-4-5h3L12 3Z" /></>,
};

export default function CatIcon({ cat, size }: { cat: Category; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[cat]}
    </svg>
  );
}

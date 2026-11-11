import type { Category } from '@/lib/types';

/* Line icons for the property categories (replace the emoji in CATS[k].ico on the home page and header menu).
   24px grid, 1.6 stroke, currentColor, so they take the gold text colour of whatever holds them. */
const PATHS: Record<Category, React.ReactNode> = {
  apartment: <path d="M5 21V4h10v17M15 9h4v12M3 21h18M8 7.5h1M11 7.5h1M8 11h1M11 11h1M8 14.5h1M11 14.5h1M9.5 21v-3h1v3" />,
  house: <path d="M3 11l9-7 9 7M5 9.5V21h14V9.5M10 21v-6h4v6" />,
  land: <path d="M3 20h18M4.5 20c1.2-3.6 3.8-5.5 7.5-5.5s6.3 1.9 7.5 5.5M12 14.5V7.5M12 10c-2.2 0-3.6-1.5-3.6-3.6 2.1 0 3.6 1.4 3.6 3.6zM12 9c1.9 0 3.1-1.3 3.1-3.1-1.9 0-3.1 1.3-3.1 3.1z" />,
  office: <><rect x="3" y="7" width="18" height="13" rx="1.5" /><path d="M9 7V5.2c0-.7.5-1.2 1.2-1.2h3.6c.7 0 1.2.5 1.2 1.2V7M3 12.5h18M10.5 12.5v2h3v-2" /></>,
  shop: <path d="M4.5 4h15L21 9H3zM3 9c0 1.4 1.1 2.5 2.5 2.5S8 10.4 8 9c0 1.4 1.1 2.5 2.5 2.5S13 10.4 13 9c0 1.4 1.1 2.5 2.5 2.5S18 10.4 18 9c0 1.4 1.1 2.5 2.5 2.5M5 11.5V20h14v-8.5M10 20v-5h4v5" />,
  warehouse: <path d="M3 21V9l6 4V9l6 4V4h6v17zM3 21h18M7 17.5h2M12 17.5h2M17 17.5h2" />,
  garage: <path d="M5 12l1.7-4.4A2.5 2.5 0 0 1 9 6h6a2.5 2.5 0 0 1 2.3 1.6L19 12M4 12h16v5H4zM6 17v2.5M18 17v2.5M7.5 14.5h1M15.5 14.5h1" />,
  summer_house: <path d="M12 3l5 7h-3l4 6H6l4-6H7zM12 16v5M9 21h6" />,
};

export default function CatIcon({ cat, size = 22 }: { cat: Category; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[cat]}
    </svg>
  );
}

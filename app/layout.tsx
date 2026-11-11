import type { Metadata, Viewport } from 'next';
import { Golos_Text } from 'next/font/google';
import { Suspense } from 'react';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import './proper.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ToastProvider } from '@/components/Toast';
import { AuthProvider } from '@/components/Auth';
import { PANNELLUM_CSS } from '@/lib/constants';

export const metadata: Metadata = {
  title: { default: 'ProperTech — Үл хөдлөх хөрөнгийн зар, 360° аялал', template: '%s — ProperTech' },
  description: 'Орон сууц, хашаа байшин, газар, оффис зарна, түрээслүүлнэ. Байраа 360° аялалаар үзээрэй.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#c39a3e' };

// Brand font (proper.css --font). Has Cyrillic incl. Mongolian Ө/Ү.
const golos = Golos_Text({ subsets: ['cyrillic', 'latin'], variable: '--font-golos', display: 'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={golos.variable}>
      <head>
        <link rel="stylesheet" href={PANNELLUM_CSS} />
      </head>
      <body>
        <ToastProvider>
         <AuthProvider>
          <Suspense fallback={<header className="topbar" />}>
            <Header />
          </Suspense>
          <main className="wrap">{children}</main>
          <Footer />
         </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

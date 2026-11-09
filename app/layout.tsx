import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import Header from '@/components/Header';
import { ToastProvider } from '@/components/Toast';
import { AuthProvider } from '@/components/Auth';
import { PANNELLUM_CSS } from '@/lib/constants';

export const metadata: Metadata = {
  title: { default: 'Гэр360 — Үл хөдлөх хөрөнгийн зар, 360° аялал', template: '%s — Гэр360' },
  description: 'Орон сууц, хашаа байшин, газар, оффис зарна, түрээслүүлнэ. Байраа 360° аялалаар үзээрэй.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
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
          <footer className="footer">
            <div className="wrap footer-inner">
              <div><b>Гэр360</b> — үл хөдлөх хөрөнгийн зар, 360° аялалтай. Прототип.</div>
              <div className="footer-links">
                <Link href="/help">Тусламж ба 360° зураг авах заавар</Link>
                <Link href="/pricing">Үнэ</Link>
                <Link href="/login">Агент, админ нэвтрэх</Link>
              </div>
            </div>
          </footer>
         </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

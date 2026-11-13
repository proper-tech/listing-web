import type { Metadata, Viewport } from 'next';
import { Golos_Text, Inter } from 'next/font/google';
import { Suspense } from 'react';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import './proper.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SelectMenu from '@/components/SelectMenu';
import { ToastProvider } from '@/components/Toast';
import { AuthProvider } from '@/components/Auth';
import { PANNELLUM_CSS } from '@/lib/constants';

export const metadata: Metadata = {
  title: { default: 'ProperTech — Үл хөдлөх хөрөнгийн зар, 360° аялал', template: '%s — ProperTech' },
  description: 'Орон сууц, хашаа байшин, газар, оффис зарна, түрээслүүлнэ. Байраа 360° аяллаар үзээрэй.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#c39a3e' };

// Brand font (proper.css --font). Has Cyrillic incl. Mongolian Ө/Ү.
const golos = Golos_Text({ subsets: ['cyrillic', 'latin'], variable: '--font-golos', display: 'swap' });
// Number font (proper.css --font-num) for small count badges, where Golos digits blur at 12px bold.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={`${golos.variable} ${inter.variable}`}>
      <head>
        <link rel="stylesheet" href={PANNELLUM_CSS} />
        {/* On reload, pages that fetch their content in the browser (listing, search) are briefly just loader + footer.
            The browser's scroll restore lands on that short page and leaves you at the footer, so a reload starts at the top.
            Back/forward keeps normal restoring: the mode is switched back to auto once the page has loaded. */}
        <script dangerouslySetInnerHTML={{ __html: `try{var n=performance.getEntriesByType('navigation')[0];if(n&&n.type==='reload'){history.scrollRestoration='manual';addEventListener('load',function(){scrollTo(0,0);setTimeout(function(){history.scrollRestoration='auto'},0)})}}catch(e){}` }} />
      </head>
      <body>
        <ToastProvider>
         <AuthProvider>
          <Suspense fallback={<header className="topbar" />}>
            <Header />
          </Suspense>
          <main className="wrap">{children}</main>
          <Footer />
          <SelectMenu />
         </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

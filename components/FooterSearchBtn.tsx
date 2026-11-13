'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Footer CTA-ийн "Зар хайх" товч. Нүүр хуудсанд header-т "Хайх" товч байгаа тул энд нуугдана.
// (Footer нь server component тул pathname-ийг энэ жижиг client хэсэг уншина.)
export default function FooterSearchBtn({ icon }: { icon: React.ReactNode }) {
  if (usePathname() === '/') return null;
  return <Link href="/search" className="sf-btn sf-btn-primary">{icon}Зар хайх</Link>;
}

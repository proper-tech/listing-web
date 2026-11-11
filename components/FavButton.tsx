'use client';
import { toggleFav, useFavs } from '@/lib/store';
import { useToast } from './Toast';

/* thin outline heart (Lucide-style path); filled when saved */
function Heart({ on, size = 18 }: { on: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" />
    </svg>
  );
}

/** Heart on a card (variant "icon") or a full button on the listing page (variant "button"). */
export default function FavButton({ id, variant = 'icon' }: { id: string; variant?: 'icon' | 'button' }) {
  const favs = useFavs();
  const toast = useToast();
  const isOn = favs.includes(id);
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    toast(toggleFav(id) ? 'Хадгалсан зарт нэмлээ' : 'Хадгалсан зараас хаслаа');
  };
  if (variant === 'button') {
    return <button className={`btn btn-block ${isOn ? 'on' : ''}`} onClick={onClick}><Heart on={isOn} size={16} />{isOn ? 'Хадгалсан' : 'Хадгалах'}</button>;
  }
  return <button className={`fav ${isOn ? 'on' : ''}`} onClick={onClick} aria-label={isOn ? 'Хадгалснаас хасах' : 'Хадгалах'} aria-pressed={isOn}><Heart on={isOn} /></button>;
}

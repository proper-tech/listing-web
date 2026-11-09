'use client';
import { toggleFav, useFavs } from '@/lib/store';
import { useToast } from './Toast';

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
    return <button className={`btn btn-block ${isOn ? 'on' : ''}`} onClick={onClick}>{isOn ? '♥ Хадгалсан' : '♡ Хадгалах'}</button>;
  }
  return <button className={`fav ${isOn ? 'on' : ''}`} onClick={onClick} aria-label="Хадгалах">♥</button>;
}

'use client';
import { useRouter } from 'next/navigation';
import { CATS, CAT_KEYS, DISTRICTS } from '@/lib/constants';

export default function HeroSearch() {
  const router = useRouter();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = new URLSearchParams();
    for (const [k, v] of new FormData(e.currentTarget)) if (v) q.set(k, String(v));
    router.push('/search?' + q);
  };
  return (
    <form className="hero-search" onSubmit={onSubmit}>
      <select name="deal" aria-label="Төрөл"><option value="sale">Зарна</option><option value="rent">Түрээс</option></select>
      <select name="cat" aria-label="Ангилал"><option value="">Бүх төрөл</option>{CAT_KEYS.map((k) => <option key={k} value={k}>{CATS[k].name}</option>)}</select>
      <select name="district" aria-label="Дүүрэг"><option value="">Бүх дүүрэг</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select>
      <input type="number" name="priceMax" placeholder="Дээд үнэ (₮)" min="0" aria-label="Дээд үнэ" />
      <button className="btn btn-accent">Хайх</button>
    </form>
  );
}

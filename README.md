# Гэр360 — үл хөдлөх хөрөнгийн зарын сайт (прототип)

`real-estate-platform-plan.md`-ийн дагуу хийсэн ажиллах прототип: Phase 1 бүхэлдээ, Phase 2-оос 360° хэсэг.

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript
- **Backend:** тусдаа төсөл — [`listing-server`](../listing-server) (хамааралгүй Node.js API, өгөгдөл JSON файлд)

## Ажиллуулах

Node.js 20+ хэрэгтэй. Анх удаа:

```bash
npm install
```

Эхлээд API серверийг тусад нь асаана (`../listing-server` дотор):

```bash
npm run dev
```

Дараа нь энэ төсөлд:

```bash
npm run dev
```

http://localhost:3000 нээнэ. Next.js `/api/*`, `/uploads/*` хүсэлтийг `API_URL` (default http://localhost:4000) руу дамжуулна ([next.config.ts](next.config.ts)).

Production горим:

```bash
npm run build
```

```bash
npm start
```

- Орчны хувьсагч: `API_URL` — API серверийн хаяг (default `http://localhost:4000`).
- Жишээ өгөгдөл, админ түлхүүр зэргийг [`listing-server`](../listing-server) README-с үзнэ үү.

## Vercel дээр байршуулах

1. API серверийг байнгын дисктэй хостинг дээр байршуулна ([`listing-server`](../listing-server) README).
2. Vercel төслийн Environment Variables-д `API_URL=https://<api-хаяг>` нэмнэ (Production + Preview).
3. Deploy хийнэ. `API_URL` нь build үед rewrite-д шингэдэг тул өөрчилсний дараа дахин deploy хийнэ.

## Бүтэц

```
app/                  Next.js хуудсууд
  page.tsx            Нүүр (server-rendered)
  search/             Хайлт: эхний үр дүн сервер дээр, шүүлтүүр хөтөч дээр
  listing/[id]/       Зарын хуудас (server-rendered, SEO/og:image metadata)
  post/               Зар нэмэх 7 алхам
  saved/ my/ admin/   Хадгалсан + харьцуулах, Миний зар, Админ
  help/ pricing/      Статик хуудас
components/           React компонентууд (TourViewer, Maps, PostWizard, ...)
lib/                  Төрлүүд, тогтмолууд, API, localStorage, 360° холбогч (stitch.js)
```

- **360° viewer:** Pannellum (CDN-ээс), **газрын зураг:** Leaflet + OpenStreetMap
- **360° холбох (Mode B):** `lib/stitch.js` — хөтөч дээр ажиллана (цилиндр проекц → NCC → тойрог хаах → equirectangular)

## Юу хийгдсэн

| Төлөвлөгөө | Төлөв |
|---|---|
| Ангилал, §4-ийн бүх шүүлтүүр, эрэмбэ, жагсаалт + газрын зураг | ✅ |
| Зарын хуудас: зураг, 360° аялал, мэдээлэл, газрын зураг, "утас харах", хадгалах, мэдээлэх, төстэй зар | ✅ |
| Зар нэмэх 7 алхам, VIP / Онцгой | ✅ (төлбөр демо) |
| Mode A (бэлэн 360°), Mode B (зургуудаас холбох), сум, эхлэх чиглэл, план mini-map | ✅ |
| Миний зар, хадгалсан + харьцуулах, админ | ✅ |
| SMS нэвтрэлт, QPay, Mode C (AI), Mode D (3D), гадна "spin", шинэ барилга, англи хэл | ⏳ хийгдээгүй |

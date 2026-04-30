# KPI Tizimi — Kattaqo'rg'on tumani suv yetkazib berish xizmati

## Loyiha haqida

Kattaqo'rg'on tumani suv yetkazib berish xizmati xodimlari uchun KPI (Key Performance Indicator) boshqaruv tizimi. Tizim 3 darajali rol qo'llab-quvvatlaydi: Admin, Menejer, Xodim.

## Arxitektura

```
workspace/
├── artifacts/
│   ├── api-server/         # Express.js backend (port 8080, path /api)
│   └── kpi-suv/            # React + Vite frontend (port 18094, path /)
├── lib/
│   ├── api-client-react/   # Orval bilan yaratilgan React Query hooks
│   ├── api-spec/           # OpenAPI 3.0 spetsifikatsiyasi + orval config
│   ├── api-zod/            # Zod validatsiya sxemalari
│   └── db/                 # Drizzle ORM + PostgreSQL sxemalari
└── attached_assets/        # Rasm va media fayllar
```

## Texnologiyalar

**Frontend:**
- React 19 + Vite 7
- TailwindCSS v4 + shadcn/ui
- Wouter (routing)
- @tanstack/react-query (server state)
- Recharts (grafiklar)
- xlsx (hisobotlarni eksport qilish)

**Backend:**
- Express.js v5
- Drizzle ORM + PostgreSQL
- Cookie-based sessions (SESSION_SECRET env var)
- Pino (logging)

**Kod generatsiyasi:**
- Orval (api-client-react va api-zod uchun OpenAPI dan)

## Ma'lumotlar bazasi jadvallari

- `users` — tizim foydalanuvchilari (admin, manager, employee rollari)
- `sessions` — sessiya tokenlari
- `departments` — bo'limlar
- `employees` — xodimlar
- `kpi_categories` — KPI kategoriyalari
- `kpi_indicators` — KPI ko'rsatkichlari
- `evaluations` — baholashlar
- `work_plans` — ish rejalari (vazifalarda `category="ijro"` — ijro intizomi avto-vazifasi; qo'shimcha maydonlar: `ijro_late`, `ijro_unexecuted`)
- `employees.is_ijro_responsible` — boolean: bu xodim ijro.gov bo'yicha mas'ul (baholaydi)
- `employees.is_ijro_assigned` — boolean: bu xodim Ijro mas'uli tomonidan tanlangan (baholanadi). Faqat shu xodimlarning ish rejasiga GET so'rovida avto-vazifa qo'shiladi (ijro intizomi, KPI = bajarilgan/kelib_tushgan*100). Toggle `/staff` jadvalidagi "Ijro" ustunidan — admin/manager yoki Ijro mas'uli o'zi bossa. `enrichPlan` agar xodim hozir `isIjroAssigned=false` bo'lsa, DB'dagi mavjud ijro qatorini javobdan filtrlaydi (ma'lumot saqlanadi, qayta belgilansa qaytadi).
- Malaka talabi avto-vazifasi (`category="mehnat"` — eski nom kod ichida saqlangan, faqat UI matni "Malaka talabi"): tizimda **Mehnat intizomi mas'uli** (`employees.is_mehnat_responsible=true`) mavjud bo'lsa, qolgan barcha xodimlarning (mas'ulning o'zidan tashqari) ish rejasiga `enrichPlan` tomonidan avtomatik qo'shiladi. Vazifa title'i: "Malaka talabi (avto-vazifa)". Baholash: 0–5 ball oraliq (`mehnat_result` matn ustunida saqlanadi, kasr son sifatida). KPI = round((min(5, max(0, ball)) / 5) × 100) — 5 ball=100%, 4=80%, 2.5=50%, 0=0%. Vergul (`,`) va nuqta (`.`) ikkalasi ham kasr ajratuvchi sifatida qabul qilinadi. Eski `mehnat_work_hours/mehnat_late_minutes/mehnat_late_days` ustunlari schema va backend'da saqlangan (orqaga muvofiqlik), lekin yangi UI ulardan foydalanmaydi va KPI'ga ta'sir qilmaydi. Faqat admin/manager yoki Mehnat mas'uli yangilashi mumkin (oddiy xodim/Ijro mas'uli — 403). Frontend'da emerald (yashil) rangli qator, faqat 1 ta input ("Ball (0–5)") + KPI display.
- `/api/auth/me` javobi `isIjroResponsible: boolean` va `isMehnatResponsible: boolean` qaytaradi (joriy foydalanuvchi linked employee'siga qarab). Frontend `canEditIjroTask` = admin/manager OR isIjroResponsible; `canEditMehnatTask` = admin/manager OR isMehnatResponsible — har bir avto-vazifa qatori inputlari va Saqlash tugmasi mos ravishda faqat shu rollar uchun faol.
- RBAC `/api/employees`: POST/DELETE — faqat admin/manager. PUT — admin/manager to'liq tahrir; Ijro mas'uli faqat `isIjroAssigned`'ni almashtira oladi (qolgan maydonlar mavjud qiymatda saqlanadi); boshqa foydalanuvchilarga 403.
- RBAC `/api/work-plans/:planId/tasks/:taskId/progress`: ijro vazifasi (category="ijro") uchun PATCH faqat admin/manager yoki linked employee'si Ijro mas'uli bo'lgan foydalanuvchiga ruxsat etilgan; boshqalarga 403.
- Vazifa progress qoidasi: oddiy xodim (admin/manager bo'lmagan) `actualVolume` saqlasa — `completionPercentage` server tomonida majburan **0**'ga reset bo'ladi va status "pending" qoladi. Foiz faqat admin tasdiqlaganida (`approveTask`) hisoblanadi (= bajarilgan/reja*100, 0–100). Qayta tahrir qilinsa, foiz yana 0 — qayta tasdiqlash zarur.
- DIQQAT: Xodimlar ro'yxati `/staff` route ostida `staff.tsx` faylda (legacy `employees.tsx` ham bor — `/employees` uchun). Yangi maydonlar IKKALA faylga ham qo'shilishi kerak.
- `work_plan_tasks` — ish reja vazifalari
- `mfylar` — mahalla fuqarolik yig'inlari (MFY)

## Auto-migratsiya (server start)

`artifacts/api-server/src/lib/auto-migrate.ts` — server `app.listen()`'dan oldin idempotent `ALTER TABLE ADD COLUMN IF NOT EXISTS` ishga tushiradi. Render auto-deploy uchun zarur: yangi kod productionga chiqqanda DB schema avtomatik yangilanadi (qo'lda `psql` migrate qilish shart emas). Hech narsa o'chirilmaydi (faqat ADD COLUMN), foydalanuvchilar/xodimlar/bo'limlar ma'lumotlari saqlanadi. Hozirgi migratsiyalar:
- `employees`: `is_ijro_responsible`, `is_ijro_assigned`, `is_mehnat_responsible` (BOOLEAN NOT NULL DEFAULT FALSE)
- `work_plan_tasks`: `category` (TEXT), `ijro_late`, `ijro_unexecuted`, `mehnat_work_hours`, `mehnat_late_minutes`, `mehnat_late_days` (INTEGER), `mehnat_result` (TEXT)
- Rename: `title='Mehnat intizomi (avto-vazifa)'` → `'Malaka talabi (avto-vazifa)'` (UPDATE — non-fatal, faqat aynan o'sha matn bo'lganlarni yangilaydi).

Yangi schema o'zgarishi qo'shsangiz: `MIGRATIONS` array'iga `ADD COLUMN IF NOT EXISTS` qatori qo'shing. Migrate fail bo'lsa, server ishga tushmaydi (process.exit 1) — bu xavfsizlik chorasi.

## Frontend sahifalari

| Yo'l | Sahifa |
|------|--------|
| `/login` | Kirish sahifasi |
| `/dashboard` | Asosiy boshqaruv paneli |
| `/staff` | Xodimlar va bo'limlar |
| `/employees/:id` | Xodim tafsilotlari |
| `/kpi-categories` | KPI kategoriyalari |
| `/kpi-indicators` | KPI ko'rsatkichlari |
| `/evaluations` | Baholashlar |
| `/work-plans` | Ish rejalari |
| `/work-plans/new` | Yangi ish reja yaratish |
| `/work-plans/:id` | Ish reja tafsilotlari |
| `/mfylar` | MFY ro'yxati |
| `/reports` | Hisobotlar |
| `/settings` | Sozlamalar |
| `/admin-panel` | Admin paneli (faqat admin uchun) |
| `/approve` | Tasdiqlash sahifasi |

## API endpointlar

- `POST /api/auth/login` — tizimga kirish
- `POST /api/auth/logout` — tizimdan chiqish
- `GET /api/auth/me` — joriy foydalanuvchi
- `GET/POST /api/departments` — bo'limlar
- `GET/POST /api/employees` — xodimlar
- `GET/POST /api/kpi/categories` — KPI kategoriyalari
- `GET/POST /api/kpi/indicators` — KPI ko'rsatkichlari
- `GET/POST /api/evaluations` — baholashlar
- `GET/POST /api/work-plans` — ish rejalari
  - GET ro'yxatda super-admin (tuman=null) tuman/tumans filteri qo'llaganda ham `userId === currentUserId` shart bilan o'z yaratgan rejalarini doim ko'radi.
  - Detail sahifa: Ijro intizomi va Mehnat intizomi avto-vazifalari bitta `<tr>`'da yonma-yon ko'rsatiladi (chap=amber Ijro, o'ng=emerald Mehnat). Faqat bittasi mavjud bo'lsa — to'liq kenglikda.
- `GET/POST /api/mfylar` — MFY
- `GET /api/dashboard/summary` — statistika xulosasi
- `GET /api/admin/users` — foydalanuvchilar (admin)
- `GET /api/approve/work-plans` — tasdiqlash navbati

## Kirish ma'lumotlari (test uchun)

- **Admin:** username: `admin`, parol: `admin123`
- **Menejer:** username: `menejer`, parol: `menejer123`

## Loyihani ishga tushirish

```bash
# DB sxemasini yangilash
pnpm --filter @workspace/db run push

# Kod generatsiyasi
pnpm --filter @workspace/api-spec run codegen

# Barcha paketlarni o'rnatish
pnpm install
```

Workflows orqali:
- `artifacts/api-server: API Server` — backend serverni ishga tushiradi
- `artifacts/kpi-suv: web` — frontend dev serverni ishga tushiradi

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
- `employees.is_ijro_responsible` — boolean: bu xodim ijro.gov bo'yicha mas'ul. Belgilansa, qolgan barcha xodimlarning ish rejasiga GET so'rovida avto-vazifa qo'shiladi (ijro intizomi, KPI = bajarilgan/kelib_tushgan*100)
- `work_plan_tasks` — ish reja vazifalari
- `mfylar` — mahalla fuqarolik yig'inlari (MFY)

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

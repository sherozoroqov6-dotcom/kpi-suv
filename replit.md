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
- `employees.is_ijro_assigned` — boolean: bu xodim Ijro mas'uli tomonidan tanlangan (baholanadi). Faqat shu xodimlarning ish rejasiga GET so'rovida avto-vazifa qo'shiladi (ijro intizomi, KPI = bajarilgan/kelib_tushgan*100). Toggle `/staff` jadvalidagi "Ijro" ustunidan — admin/manager yoki Ijro mas'uli o'zi bossa.
- `/api/auth/me` javobi `isIjroResponsible: boolean` qaytaradi (joriy foydalanuvchi linked employee'siga qarab). Frontend `canEditIjroTask` shu maydondan chiqariladi — ijro intizomi qatori inputlari va Saqlash tugmasi faqat admin/manager yoki Ijro mas'uli uchun faol.
- RBAC `/api/employees`: POST/DELETE — faqat admin/manager. PUT — admin/manager to'liq tahrir; Ijro mas'uli faqat `isIjroAssigned`'ni almashtira oladi (qolgan maydonlar mavjud qiymatda saqlanadi); boshqa foydalanuvchilarga 403.
- RBAC `/api/work-plans/:planId/tasks/:taskId/progress`: ijro vazifasi (category="ijro") uchun PATCH faqat admin/manager yoki linked employee'si Ijro mas'uli bo'lgan foydalanuvchiga ruxsat etilgan; boshqalarga 403.
- Vazifa progress qoidasi: oddiy xodim (admin/manager bo'lmagan) `actualVolume` saqlasa — `completionPercentage` server tomonida majburan **0**'ga reset bo'ladi va status "pending" qoladi. Foiz faqat admin tasdiqlaganida (`approveTask`) hisoblanadi (= bajarilgan/reja*100, 0–100). Qayta tahrir qilinsa, foiz yana 0 — qayta tasdiqlash zarur.
- DIQQAT: Xodimlar ro'yxati `/staff` route ostida `staff.tsx` faylda (legacy `employees.tsx` ham bor — `/employees` uchun). Yangi maydonlar IKKALA faylga ham qo'shilishi kerak.
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

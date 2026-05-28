# InsightBI

A full-stack Business Intelligence dashboard platform inspired by Microsoft Power BI. Upload datasets, build interactive reports with drag-and-drop charts, transform data, model relationships, and share insights — all in the browser.

---

## Features

- **Authentication** — JWT-based login/register with roles: Admin, Editor, Viewer
- **Workspaces** — Multi-tenant workspaces with member invitations and role management
- **Dataset Upload** — CSV and Excel (.xlsx / .xls) file ingestion with auto schema detection
- **Data Transformation** — 10 built-in transform operations (rename, filter, sort, fill nulls, calculated columns, and more)
- **Data Model** — Visual relationship builder across datasets (joins, lookups)
- **Report Builder** — Drag-and-drop canvas with **24 visualization types**, resizable widgets, collapsible side panels, cross-filtering, and drill-down
- **Visualization Types** — Bar, Line, Area, Pie, Donut, Scatter, Gauge, Waterfall, Combo, Treemap, Funnel, Histogram, Box Plot, Heatmap, Matrix (pivot), Decomposition Tree, Map, KPI, Number, Card-with-Trend, Smart Narrative, Table, Slicer, Date Range
- **Cross-Filtering & Drill-Down** — Click a chart segment to filter every other widget; drill through configured field hierarchies
- **Sharing & Export** — Share by email or public link, embed via token, export report JSON, and **export the whole dashboard to PDF** (native print engine, all charts captured)
- **Admin Panel** — User management, role assignment, activity logs, and clickable workspace/report/dataset rows
- **Dark Mode** — Full light/dark theme support (auto-switches to light for PDF export)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| UI Components | shadcn/UI (Radix primitives) |
| Charts | Apache ECharts (echarts-for-react) |
| State Management | Zustand |
| Layout | react-grid-layout |
| Backend | Node.js, Express.js, TypeScript |
| ORM | Prisma |
| Database | SQLite (dev) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| File Parsing | PapaParse (CSV), SheetJS (Excel) |
| Logging | Winston |
| Caching | Redis (optional, graceful fallback) |

---

## Prerequisites

- Node.js 18+
- npm 9+

Redis is optional — the server starts without it and caching is simply disabled.

---

## Quick Start

### 1. Clone / open the project

```bash
cd insightbi
```

### 2. Install dependencies

```bash
# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 3. Configure environment

```bash
cd server
cp .env.example .env
# Edit .env — the defaults work for local SQLite development
```

Key variables in `server/.env`:

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-in-production"
PORT=4000
REDIS_URL=redis://localhost:6379   # optional
```

### 4. Set up the database

```bash
cd server
npx prisma migrate dev --name init
npx prisma db seed
```

Seed creates:
- **Admin**: `admin@insightbi.com` / `Admin@123456`
- **Demo user**: `demo@insightbi.com` / `Demo@123456`
- A starter Demo Workspace with a small Sales/Customer dataset and a pre-built report

For a much richer demo, run the comprehensive showcase seed afterwards:

```bash
cd server
npx ts-node src/prisma/demoSeed.ts
```

This creates **13 datasets (~2,600 rows)** across two workspaces and **8 reports / 136 widgets**, including a **🎨 All Visualizations Showcase** report that demonstrates every one of the 24 visualization types sourced from all 8 datasets.

### 5. Start the servers

Open two terminals:

```bash
# Terminal 1 — Backend (port 4000)
cd server && npm run dev

# Terminal 2 — Frontend (port 3000)
cd client && npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@insightbi.com | Admin@123456 |
| Editor | demo@insightbi.com | Demo@123456 |

---

## API Overview

All endpoints are prefixed with `/api`.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Sign in |
| POST | `/auth/register` | Create account |
| GET | `/auth/me` | Current user |
| GET | `/workspaces` | List workspaces |
| POST | `/workspaces` | Create workspace |
| POST | `/datasets/upload` | Upload CSV/Excel |
| GET | `/datasets/:id/preview` | Paginated row preview |
| GET | `/datasets/:id/rows` | Aggregated row query |
| POST | `/datasets/:id/transform/preview` | Preview transform steps |
| POST | `/datasets/:id/transform/apply` | Apply transform to dataset |
| GET | `/reports` | List reports |
| POST | `/reports` | Create report |
| PUT | `/reports/:id` | Update report layout |
| GET | `/reports/:id/export/json` | Export report definition as JSON |
| POST | `/reports/:id/duplicate` | Duplicate a report |
| POST | `/reports/:id/share` | Share report |
| GET | `/data-model` | Get workspace relationships |
| GET | `/admin/stats` | Admin dashboard stats |
| GET | `/admin/users` | Paginated user list |
| PUT | `/admin/users/:id/role` | Change user role |

---

## Project Structure

```
insightbi/
├── server/
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── middleware/        # Auth, error handling, rate limiting
│   │   ├── prisma/            # Schema, migrations, seed
│   │   ├── routes/            # Express routers
│   │   ├── services/          # Dataset parsing, activity logging
│   │   └── utils/             # JSON helpers, data aggregator, logger
│   └── uploads/               # Uploaded files
└── client/
    └── src/
        ├── components/
        │   ├── charts/        # ChartWidget (all chart types)
        │   ├── layout/        # AppShell, Sidebar, Header
        │   ├── report-builder/ # ChartTypeSelector, ChartConfigPanel
        │   └── ui/            # shadcn/UI primitives
        ├── pages/             # One file per route
        ├── services/          # Axios API client
        ├── store/             # Zustand stores
        └── types/             # Shared TypeScript types
```

---

## Docker (Production)

A `docker-compose.yml` is provided for running with PostgreSQL and Redis. Switch `DATABASE_URL` in `.env` to a PostgreSQL connection string and change the Prisma provider from `sqlite` to `postgresql` in `server/src/prisma/schema.prisma` before running:

```bash
docker-compose up --build
```

---

## Development Scripts

```bash
# Backend
npm run dev          # ts-node-dev with hot reload
npm run build        # tsc compile
npm run seed         # Re-seed the database

# Frontend
npm run dev          # Vite dev server
npm run build        # Production build
npm run preview      # Serve production build
```

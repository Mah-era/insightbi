# InsightBI — Project Report

---

## 1. Executive Summary

InsightBI is a full-stack Business Intelligence web application built as a functional prototype of Microsoft Power BI. The platform enables business users to upload structured data, clean and reshape it with a no-code transformation engine, build interactive dashboards with **24 visualization types** (with cross-filtering and drill-down), and share, embed, or export insights — all within a modern, role-based multi-tenant web interface.

The project was delivered as a single integrated codebase covering a React/TypeScript frontend, an Express.js REST API backend, Prisma ORM, and a SQLite database with an optional Redis caching layer.

---

## 2. Objectives

| # | Objective | Status |
|---|---|---|
| 1 | JWT authentication with role-based access control | ✅ Complete |
| 2 | Multi-tenant workspace management | ✅ Complete |
| 3 | CSV and Excel dataset ingestion with schema inference | ✅ Complete |
| 4 | No-code data transformation pipeline | ✅ Complete |
| 5 | Visual data model / relationship builder | ✅ Complete |
| 6 | Drag-and-drop report builder with **24 visualization types** | ✅ Complete |
| 7 | Real-time data aggregation for chart rendering | ✅ Complete |
| 8 | Cross-filtering and drill-down between widgets | ✅ Complete |
| 9 | Collapsible builder side panels (datasets + config) | ✅ Complete |
| 10 | Report sharing (email + public link) and token-based embedding | ✅ Complete |
| 11 | Dataset/report export (CSV, JSON) and full-dashboard PDF export | ✅ Complete |
| 12 | Admin panel with user management, activity logs, and clickable rows | ✅ Complete |
| 13 | Light / dark theme | ✅ Complete |
| 14 | Responsive layout | ✅ Complete |
| 15 | External database / REST connections (PostgreSQL, MySQL, SQLite, REST) | ✅ Complete |
| 16 | DAX-lite calculated measures with a safe formula parser | ✅ Complete |
| 17 | Semantic model (unified field + measure catalog across datasets) | ✅ Complete |
| 18 | SQL-backed aggregation via per-dataset physical query tables | ✅ Complete |
| 19 | Bookmarks and report-level filter panel | ✅ Complete |
| 20 | Token-based report embedding + dedicated print/public viewers | ✅ Complete |

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Browser (React SPA)                │
│  Vite Dev Server :3000                               │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────┐ │
│  │  Zustand  │  │  React    │  │  ECharts          │ │
│  │  Stores   │  │  Router   │  │  (chart renders)  │ │
│  └───────────┘  └───────────┘  └───────────────────┘ │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Axios HTTP Client  →  /api proxy  →  :4000      │ │
│  └───────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
                          │
                    REST over HTTP
                          │
┌──────────────────────────────────────────────────────┐
│                  Express.js API (:4000)               │
│  ┌───────────┐  ┌───────────┐  ┌────────────────┐   │
│  │  Helmet   │  │  CORS     │  │  Rate Limiter  │   │
│  └───────────┘  └───────────┘  └────────────────┘   │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Routes → Controllers → Services                │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌───────────────┐  ┌────────────────────────────┐   │
│  │  Prisma ORM   │  │  Redis (optional cache)    │   │
│  └───────────────┘  └────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
                          │
              ┌───────────┴──────────┐
              │     SQLite (dev)     │
              └──────────────────────┘
```

### 3.2 Frontend Architecture

The frontend is a single-page application built with React 18 and TypeScript, bundled by Vite.

**State Management (Zustand stores):**

| Store | Responsibility |
|---|---|
| `authStore` | Current user, JWT token, persist to localStorage |
| `workspaceStore` | Workspace list, active workspace |
| `reportBuilderStore` | Widgets, layout, selected widget, global/report filters, cross-filters, drill state, bookmarks |
| `themeStore` | Light / dark mode, persist to localStorage |

**Routing (React Router v6):**  
Protected routes are wrapped in a `ProtectedRoute` component that checks the auth store. Unauthenticated users are redirected to `/login`. Admin-only routes redirect non-admin users.

**Component hierarchy:**
```
App
└── AppShell (authenticated)
    ├── Sidebar
    ├── Header
    └── <Outlet>
        ├── HomePage
        ├── WorkspacesPage → WorkspaceDetailPage
        ├── DatasetsPage → DatasetPreviewPage / TransformPage
        ├── ConnectionsPage
        ├── ReportsPage → ReportBuilderPage
        ├── DataModelPage
        ├── ActivityPage
        ├── AdminPage
        └── SettingsPage

Standalone (outside AppShell):
LandingPage, PublicReportPage, EmbedReportPage, PrintReportPage
```

### 3.3 Backend Architecture

The Express.js API follows a layered architecture:

```
Request → Middleware (helmet, cors, rate limiter, auth JWT) 
       → Router 
       → Controller 
       → Service / Prisma 
       → Response
```

**Key middleware:**
- `auth.ts` — Verifies JWT, attaches `req.user`
- `errorHandler.ts` — Centralised error formatting with HTTP status codes
- `rateLimiter.ts` — Express rate limit on auth routes
- `upload.ts` — Multer config (disk storage, MIME whitelist, 50 MB cap)

**Services:**
- `datasetService.ts` — File parsing (PapaParse for CSV, SheetJS for Excel), schema inference, transform step execution
- `activityService.ts` — Single-call helper to create an `ActivityLog` row
- `connectionService.ts` — Connects to external PostgreSQL/MySQL/SQLite/REST sources, ingests rows as datasets; includes SSRF protection (blocks private/loopback IPs in production)
- `formulaService.ts` — Safe DAX-lite expression parser/evaluator (tokenizer → AST → eval). Supports `SUM/AVG/COUNT/MIN/MAX/DISTINCTCOUNT`, arithmetic, and parentheses with **no `eval()`**
- `semanticModelService.ts` — Builds a unified catalog of fields + measures across all workspace datasets (`datasetId.column` / `measure.id` refs)
- `sqlQueryService.ts` — Maintains a physical SQLite table (`ds_<uuid>`) per dataset and runs SQL `GROUP BY` aggregation using whitelisted `col_n` aliases (never interpolating raw field names)

**Utilities:**
- `dataAggregator.ts` — In-memory groupBy / aggregate engine (fallback path and filters)
- `json.ts` — SQLite JSON serialise / hydrate helpers
- `jwt.ts` — Sign / verify helpers
- `prisma.ts` — Singleton Prisma client
- `redis.ts` — Optional cache client with graceful no-op fallback
- `logger.ts` — Winston logger

---

## 4. Database Schema

The database uses SQLite via Prisma ORM. All JSON fields are stored as serialised `String` columns (SQLite does not have a native JSON type) and hydrated on read.

### Entity Relationship Overview

```
User ──< WorkspaceMember >── Workspace
                                │
                    ┌───────────┼───────────┐
                 Dataset     Report     ActivityLog
                    │           │
            DatasetRow      (layoutJson)
                    │
            Transformation
                    │
          DataRelationship
```

### Key Models

**User**
```
id, name, email, passwordHash, role (ADMIN|EDITOR|VIEWER), avatarUrl, createdAt
```

**Workspace**
```
id, name, description, ownerId → User, createdAt
```

**Dataset**
```
id, workspaceId, name, fileName, fileType, filePath,
rowCount, columnCount, schemaJson, createdAt
```

**DatasetRow**
```
id, datasetId, rowIndex, rowJson
```
Rows are stored as individual JSON strings. Queries for chart rendering read all rows and aggregate in memory via `dataAggregator.ts`.

**Report**
```
id, workspaceId, name, description, createdById,
layoutJson, configJson, createdAt, updatedAt
```

`layoutJson` stores the full widget array: id, type, grid position (x, y, w, h), and chart-specific config.

**Transformation**
```
id, datasetId, name, stepsJson, createdAt
```

**DataRelationship**
```
id, workspaceId, sourceDatasetId, sourceColumn,
targetDatasetId, targetColumn, joinType
```

### Additional Models

| Model | Purpose |
|---|---|
| **WorkspaceMember** | Join table: user ↔ workspace with a per-workspace role |
| **DatasetQueryTable** | Maps a dataset to its physical SQLite query table + `columnMapJson` (original name → `col_n`) for SQL-backed aggregation |
| **Dashboard** | Saved dashboard container (multi-report grouping) |
| **ShareLink** | Public read-only link with token + active flag |
| **ReportShare** | Direct per-user report share with permission (VIEW/EDIT) |
| **ActivityLog** | Audit trail: userId, workspaceId, action, metadata, timestamp |
| **Measure** | Reusable DAX-lite calculated measure: name, expression, format, datasetId |
| **EmbedToken** | Token granting unauthenticated iframe access to a report |
| **DataConnection** | External source config (type, host/port/db/url, encrypted credentials) |

> Full model set (15): User, Workspace, WorkspaceMember, Dataset, DatasetQueryTable, DatasetRow, Transformation, DataRelationship, Report, Dashboard, ShareLink, ReportShare, ActivityLog, Measure, EmbedToken, DataConnection.

---

## 5. Key Technical Decisions

### 5.1 SQLite over PostgreSQL
**Decision:** Use SQLite for the development database.  
**Reason:** No external database server is required, lowering the barrier for running the project locally. Prisma handles the ORM abstraction so switching to PostgreSQL for production only requires changing the provider string in `schema.prisma` and the `DATABASE_URL` environment variable.

**Trade-off:** SQLite does not support native JSON columns or enums. All JSON fields use `String @default("{}")` with typed serialise/deserialise helpers in `utils/json.ts`. Enum types are stored as plain strings.

### 5.2 In-Memory Data Aggregation
**Decision:** Chart data queries fetch all rows for a dataset and aggregate in JavaScript (Node.js), rather than in SQL.  
**Reason:** This avoids complex dynamic SQL generation and keeps the aggregation logic type-safe and testable. The `aggregateData()` function supports groupBy, SUM/AVG/COUNT/MIN/MAX, filtering, sorting, and result limiting.

**Trade-off:** For very large datasets (>100k rows) this approach would be slow. The correct production solution is to push aggregation into the database (SQL GROUP BY) or a columnar store.

### 5.3 ECharts for Visualisation
**Decision:** Apache ECharts via `echarts-for-react`.  
**Reason:** ECharts supports all required chart types out of the box, has strong TypeScript typings, handles large datasets efficiently (WebGL mode), and is more permissive with customisation than most React charting libraries.

### 5.4 react-grid-layout for the Report Canvas
**Decision:** `react-grid-layout` for drag-and-drop, resize, and grid snapping.  
**Reason:** It is the most mature grid layout library in the React ecosystem, with built-in support for serialisable layouts (array of `{i, x, y, w, h}` objects) which map directly to the `layoutJson` storage format.

### 5.5 Zustand over Redux
**Decision:** Zustand for global state.  
**Reason:** Zero boilerplate, works natively with React hooks, supports middleware (persist for auth/theme), and the entire store fits in a single readable file per domain.

### 5.6 Dual aggregation paths (SQL + in-memory)
**Decision:** Maintain a physical SQLite table per dataset (`sqlQueryService`) for SQL `GROUP BY` aggregation, while keeping the in-memory `aggregateData()` as a fallback.  
**Reason:** SQL aggregation scales far better than reading every row into Node; the physical table is created/refreshed on upload and transform. The in-memory path remains for cross-filter/drill scenarios and as a safety net.  
**Security:** User field names are never interpolated into SQL — a `columnMapJson` whitelist maps each original name to a fixed `col_n` alias.

### 5.7 Safe formula parser (no `eval`)
**Decision:** Implement a hand-written tokenizer → AST → evaluator for DAX-lite measures instead of `eval()`/`Function()`.  
**Reason:** Evaluating user-supplied expressions with `eval` is a code-injection risk. The parser only admits known aggregate functions, arithmetic operators, parentheses, and numeric literals, so arbitrary code can never execute.

### 5.8 External connections with SSRF guarding
**Decision:** Support PostgreSQL/MySQL/SQLite/REST connections that ingest rows as datasets.  
**Reason:** Lets users pull live data beyond file uploads. In production, `connectionService` blocks private/loopback IP ranges to prevent server-side request forgery against internal infrastructure.

---

## 6. Data Flow

### Upload → Chart Render

```
1. User drops CSV file
2. Multer writes file to /uploads
3. datasetService.parseFile() reads file with PapaParse/SheetJS
4. inferSchema() auto-detects column types
5. Dataset + DatasetRow records created in SQLite
6. Report Builder: user adds Bar Chart, selects dataset + fields
7. ChartWidget POSTs GET /datasets/:id/rows?groupBy=Region&valueField=Revenue&aggregation=sum
8. Controller calls aggregateData() on all rows in memory
9. Returns [{group: "North", value: 42000}, ...]
10. ECharts renders bar chart
```

### Transform Pipeline

```
1. User adds steps in TransformPage
2. Each step is a {type, params} object in the steps array
3. POST /datasets/:id/transform/preview → applyTransformationSteps(rows, steps)
4. Preview returns first 100 rows of transformed data
5. User clicks Apply → POST /datasets/:id/transform/apply
6. All DatasetRow records deleted and replaced with transformed rows
7. Dataset.schemaJson updated to reflect new columns
```

---

## 7. Security

| Concern | Mitigation |
|---|---|
| Authentication | JWT signed with HS256, 7-day expiry |
| Password storage | bcrypt with cost factor 12 |
| API authorisation | JWT middleware on all protected routes; role checks inside controllers |
| HTTP headers | Helmet sets CSP, X-Frame-Options, HSTS, etc. |
| CORS | Restricted to configured origin in production |
| Rate limiting | Auth endpoints limited to 100 req / 15 min per IP |
| File upload | Multer enforces MIME type whitelist (CSV, Excel only) and 50 MB size cap |
| Input validation | Request bodies validated before DB writes; parameterised queries via Prisma |
| SQL aggregation | User field names never interpolated; whitelisted `col_n` aliases from the dataset's column map |
| Formula evaluation | DAX-lite measures parsed to an AST — **no `eval()`/`Function()`**; only known functions/operators permitted |
| SSRF | External connections block private/loopback IP ranges in production |
| Embedding | Read-only iframe access gated by a revocable per-report `EmbedToken` |

---

## 8. Testing Summary

Manual end-to-end testing was performed via browser and `curl`:

| Test | Result |
|---|---|
| Register new user | ✅ |
| Login with correct credentials | ✅ |
| Login with wrong password (401) | ✅ |
| Access protected route without token (401) | ✅ |
| Upload CSV, verify schema detection | ✅ |
| Upload Excel, verify row count | ✅ |
| Apply transform (renameColumn, filterRows) | ✅ |
| Create report, add bar chart, configure fields | ✅ |
| Save and reload report (layout persists) | ✅ |
| KPI card aggregates Revenue = $814,700 from seed data | ✅ |
| Admin stats endpoint returns correct counts | ✅ |
| Non-admin blocked from /admin/users (403) | ✅ |
| Dark mode toggle persists on reload | ✅ |
| Health endpoint returns 200 | ✅ |

---

## 8.5 Recent Enhancements

Work completed since the initial prototype:

### Visualization expansion (13 → 24 types)
Added Waterfall, Combo, Treemap, Histogram, Box Plot, Matrix (pivot), Decomposition Tree, Map, Card-with-Trend, Smart Narrative, and Date Range to the original set. A **🎨 All Visualizations Showcase** demo report renders every type from multiple datasets.

### Interactivity
- **Cross-filtering** — clicking a chart segment filters all other widgets (Zustand `crossFilters`), with an active-filter badge and clear control.
- **Drill-down** — charts with configured drill fields descend a hierarchy on click, with a breadcrumb to navigate back up.
- **Collapsible side panels** — both the Datasets (left) and Configure (right) panels slide closed into thin rails to maximize canvas space.

### Export & embedding
- **PDF export** — exports the entire dashboard via the browser's native print engine. The flow waits ~5s for chart animations, overlays each ECharts chart with a `getDataURL()` PNG snapshot (so canvas charts always print), un-clips inner scroll containers (tables/matrices print in full), and temporarily switches to light theme so text isn't white-on-white. A global `echartsRegistry` keyed by widget ID reliably resolves chart instances regardless of module bundling.
- **JSON export** — added the previously missing `GET /reports/:id/export/json` route and controller.
- **Token embedding** — `<iframe>` embed with token-based unauthenticated data fetch.

### Admin
Workspace, report, and dataset rows in the Admin panel are now clickable, navigating to the corresponding detail/edit page.

### Data-correctness fixes
Audited every renderer and fixed genuine calculation/representation bugs:

| Widget | Bug | Fix |
|---|---|---|
| Box Plot | Max whisker always `0` (quartile index out of bounds at p=1) | Clamp index to `length-1` |
| KPI | Hardcoded fake "+12.5% vs last period" | Real period-over-period change; hidden when no basis |
| Card-with-Trend | Sign flip on negative baselines | Divide by `Math.abs(prev)` |
| Gauge | Showed share-of-total % (stuck at 100) | Show real aggregated metric on a 0→max dial |
| Combo | Two identical overlapping series when one metric | Pareto-style bars + cumulative line |
| Heatmap | Real `0` values inflated to `1` | Only count-as-1 when no value field configured |
| Map (bar fallback) | Plotted 20 raw rows with duplicate labels | Aggregate (sum) per location |
| Matrix / Decomp Tree | Wrong seed field names (`yField` vs `groupField`/`valueField`) | Corrected demo seed configs |

---

## 9. Known Limitations & Future Work

### Current Limitations

| Area | Limitation |
|---|---|
| Aggregation | Performed in-memory; slow for datasets > 50k rows |
| Real-time | No WebSocket / push updates; data is fetched on page load |
| File storage | Uploaded files stored on local disk; not suitable for multi-instance deployment |
| Excel formulas | Evaluated values are used; formula cells are not preserved |
| Cross-dataset joins | Relationships defined in the Data Model are not yet used to join data in chart queries |
| PDF export | Uses the browser's native print dialog (user picks "Save as PDF"); not a fully silent server-side render |

### Recommended Future Improvements

1. **SQL aggregation** — Replace in-memory `aggregateData()` with SQL `GROUP BY` queries pushed to the database engine.
2. **Object storage** — Move uploaded files to S3 or equivalent; store only the object key in the database.
3. **Cross-dataset queries** — Use `DataRelationship` records to generate JOIN queries when a chart references columns from multiple datasets.
4. **Scheduled refresh** — Allow reports to refresh on a cron schedule and notify subscribers via email.
5. **Row-level security** — Filter dataset rows based on the viewer's identity for multi-tenant data isolation.
6. **Audit log UI** — Filterable, searchable activity log with date range picker.
7. **Unit tests** — Jest tests for `applyTransformationSteps`, `aggregateData`, and controller logic.
8. **PostgreSQL / Docker** — Restore the Docker Compose setup with PostgreSQL for production deployment.
9. ~~**Embedded analytics** — iFrame-embeddable public report viewer with token-based access.~~ ✅ Done (token-based embed + public report viewer).
10. **Natural language queries** — LLM-powered "ask a question" interface over the dataset.

---

## 10. Appendix — File Inventory

### Backend (`server/src/`)

| File | Purpose |
|---|---|
| `index.ts` | Express app bootstrap, route registration |
| `prisma/schema.prisma` | Database schema |
| `prisma/seed.ts` | Demo data seed |
| `controllers/authController.ts` | Register, login, profile, change-password |
| `controllers/datasetController.ts` | Upload, list, preview, rows, delete |
| `controllers/transformationController.ts` | Save/apply/preview transform pipelines |
| `controllers/reportController.ts` | CRUD for reports |
| `controllers/workspaceController.ts` | CRUD, member invite |
| `controllers/adminController.ts` | Stats, user list, activity logs, role update |
| `controllers/shareController.ts` | Share by email, public links, shared-with-me |
| `controllers/embedController.ts` | Create/verify embed tokens; token-gated report data |
| `controllers/measureController.ts` | CRUD for calculated measures |
| `controllers/connectionController.ts` | Create/test external connections; ingest as datasets |
| `controllers/dataModelController.ts` | Relationship CRUD |
| `controllers/exportController.ts` *(route `export.ts`)* | JSON and CSV export |
| `routes/*.ts` | One Express router per domain (auth, datasets, reports, workspaces, admin, share, embed, measureRoutes, connectionRoutes, dataModel, semanticModel, transformations, activity, export) |
| `services/datasetService.ts` | File parsing, schema inference, transform engine |
| `services/activityService.ts` | Activity log helper |
| `services/connectionService.ts` | External DB/REST ingestion + SSRF guard |
| `services/formulaService.ts` | Safe DAX-lite parser/evaluator (no eval) |
| `services/semanticModelService.ts` | Unified field + measure catalog |
| `services/sqlQueryService.ts` | Physical query tables + SQL aggregation |
| `utils/dataAggregator.ts` | In-memory groupBy / aggregate (fallback) |
| `utils/json.ts` | SQLite JSON serialise / hydrate helpers |
| `utils/jwt.ts` | JWT sign / verify helpers |
| `utils/prisma.ts` | Singleton Prisma client |
| `utils/redis.ts` | Optional Redis cache with no-op fallback |
| `utils/logger.ts` | Winston logger |
| `middleware/auth.ts` | JWT verification |
| `middleware/errorHandler.ts` | Centralised error formatting |
| `middleware/rateLimiter.ts` | Express rate limit |
| `middleware/upload.ts` | Multer upload config |
| `prisma/demoSeed.ts` | Comprehensive showcase seed (13 datasets, 8 reports, 24-type showcase) |

### Frontend (`client/src/`)

| File | Purpose |
|---|---|
| `App.tsx` | Router, ProtectedRoute, PublicOnlyRoute |
| `services/api.ts` | Axios instance + all API method groups |
| `types/index.ts` | Shared TypeScript interfaces |
| `store/authStore.ts` | Auth state (Zustand + persist) |
| `store/workspaceStore.ts` | Workspace state |
| `store/reportBuilderStore.ts` | Report builder state |
| `store/themeStore.ts` | Theme state (Zustand + persist) |
| `components/charts/ChartWidget.tsx` | Universal chart renderer (all 24 types) + `echartsRegistry` for PDF export |
| `components/report-builder/ChartTypeSelector.tsx` | Chart type picker modal |
| `components/report-builder/ChartConfigPanel.tsx` | Per-widget configuration panel |
| `components/report-builder/BookmarksPanel.tsx` | Save/restore named view states (bookmarks) |
| `components/report-builder/ReportFiltersPanel.tsx` | Report-level global filter builder |
| `components/report-builder/MeasureDialog.tsx` | Create/edit calculated measures |
| `components/layout/AppShell.tsx` | Authenticated layout wrapper |
| `components/layout/Sidebar.tsx` | Navigation sidebar |
| `components/layout/Header.tsx` | Top header with workspace switcher |
| `pages/LandingPage.tsx` | Marketing / entry landing page |
| `pages/LoginPage.tsx` | Sign-in form |
| `pages/RegisterPage.tsx` | Registration form |
| `pages/HomePage.tsx` | Dashboard overview |
| `pages/WorkspacesPage.tsx` | Workspace list + create |
| `pages/WorkspaceDetailPage.tsx` | Workspace detail, members, settings |
| `pages/DatasetsPage.tsx` | Dataset list + file upload |
| `pages/DatasetPreviewPage.tsx` | Paginated data table |
| `pages/TransformPage.tsx` | Transform pipeline editor |
| `pages/DataModelPage.tsx` | Relationship builder |
| `pages/ConnectionsPage.tsx` | External DB/REST connection manager |
| `pages/ReportsPage.tsx` | Report list |
| `pages/ReportBuilderPage.tsx` | Drag-and-drop report canvas (collapsible panels, PDF export, cross-filter) |
| `pages/AdminPage.tsx` | Admin stats, users, activity (clickable rows) |
| `pages/ActivityPage.tsx` | Workspace activity feed |
| `pages/SettingsPage.tsx` | Profile and password |
| `pages/SharedPage.tsx` | Reports shared with current user |
| `pages/PublicReportPage.tsx` | Public (unauthenticated) report view |
| `pages/EmbedReportPage.tsx` | Token-gated iframe-embeddable report view |
| `pages/PrintReportPage.tsx` | Print-optimized report layout |

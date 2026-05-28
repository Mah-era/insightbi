# InsightBI — Frontend User Guide

This guide walks through every page and feature in the InsightBI web application.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard (Home)](#2-dashboard-home)
3. [Workspaces](#3-workspaces)
4. [Datasets](#4-datasets)
5. [Data Transformation](#5-data-transformation)
6. [Data Model](#6-data-model)
7. [Reports & Report Builder](#7-reports--report-builder)
8. [Chart Types Reference](#8-chart-types-reference)
9. [Sharing & Exporting](#9-sharing--exporting)
10. [Admin Panel](#10-admin-panel)
11. [Settings](#11-settings)
12. [Roles & Permissions](#12-roles--permissions)

---

## 1. Getting Started

### Sign In

Navigate to `http://localhost:3000`. You will land on the **Login** page.

- Enter your **email** and **password**, then click **Sign In**.
- Demo credentials are shown on the login form for quick access.

### Register

Click **Create one** beneath the Sign In form to open the registration page. Fill in your name, email, and a password (minimum 8 characters). After registering you are signed in automatically.

### Navigation

The left **Sidebar** provides access to all sections:

| Icon | Section |
|---|---|
| Home | Dashboard overview |
| Database | Datasets |
| BarChart | Reports |
| GitMerge | Data Model |
| Shield | Admin *(Admins only)* |
| Settings | Account settings |

The **Header** shows the active workspace name and a user avatar menu for sign-out.

---

## 2. Dashboard (Home)

**Path:** `/dashboard`

The home page gives a snapshot of the active workspace:

- **Greeting** — Personalised to the time of day and your name.
- **Stats row** — Total datasets, reports, dashboards, and team members.
- **Recent Datasets** — The four most recently added datasets with row/column counts.
- **Recent Reports** — The four most recently modified reports.
- **Quick actions** — Upload Dataset, New Report buttons.

---

## 3. Workspaces

**Path:** `/workspaces`

### Creating a Workspace

Click **New Workspace**, enter a name and optional description, then click **Create**.

### Switching Workspaces

All data (datasets, reports) is scoped to the active workspace. Click any workspace card to make it active — the header updates immediately.

### Workspace Detail

Click the workspace name or **Open** to enter the detail view. From here you can:

- **Rename or describe** the workspace (owners/admins only).
- **Invite members** — Enter a registered user's email and choose their role (Viewer, Editor, Owner).
- **Remove members** — Click the trash icon next to any member (owners/admins only).
- **Delete the workspace** — Available to the workspace owner only.

---

## 4. Datasets

**Path:** `/datasets`

### Uploading a File

1. Click **Upload Dataset** or drag a file onto the upload dropzone.
2. Supported formats: `.csv`, `.xlsx`, `.xls` (max 50 MB).
3. After upload, InsightBI auto-detects column types (text, number, date, boolean) and shows a schema summary.

### Dataset Card

Each card shows:
- File name and type badge
- Row and column counts
- Upload date
- Column schema pills (first few columns)
- **Preview** and **Transform** buttons

### Dataset Preview

**Path:** `/datasets/:id/preview`

A paginated table view of the raw data. Use the page controls at the bottom to navigate. The column headers show inferred types.

---

## 5. Data Transformation

**Path:** `/datasets/:id/transform`

The transformation editor lets you build a pipeline of steps to clean and reshape data before using it in reports.

### Interface

- **Left panel — Applied Steps**: A numbered list of all steps in the pipeline. Click any step to edit it. Drag to reorder. Click the trash icon to remove a step.
- **Right panel — Data Preview**: A live preview of the data after applying all steps up to the selected point.

### Available Transform Steps

| Step | What it does |
|---|---|
| **Rename Column** | Change a column's display name |
| **Remove Column** | Delete a column from the dataset |
| **Filter Rows** | Keep only rows matching a condition (equals, contains, greater than, less than) |
| **Sort Rows** | Sort by any column, ascending or descending |
| **Fill Null Values** | Replace empty cells with a default value |
| **Remove Duplicates** | Drop rows that are identical across all columns |
| **Trim Text** | Strip leading/trailing whitespace from a text column |
| **Change Case** | Convert text to UPPER, lower, or Title Case |
| **Add Calculated Column** | Create a new column using a formula (e.g. `Revenue * 0.1`) |
| **Change Type** | Cast a column to text, number, date, or boolean |

### Applying Steps

- **Preview** applies steps in memory and shows the result without modifying the stored data.
- **Apply to Dataset** permanently rewrites the dataset rows with the transformed data. This cannot be undone.
- **Save Pipeline** saves the step list for later editing without applying it.

---

## 6. Data Model

**Path:** `/data-model`

The Data Model page lets you define relationships between datasets so that charts can join data across tables.

### Creating a Relationship

1. Select the **source dataset** and **source column** (the foreign key side).
2. Select the **target dataset** and **target column** (the primary key side).
3. Choose the **join type**: Inner, Left, Right, or Full.
4. Click **Create Relationship**.

### Managing Relationships

Existing relationships are listed as cards showing source → target. Click the trash icon to delete a relationship.

---

## 7. Reports & Report Builder

### Reports List

**Path:** `/reports`

All reports in the active workspace are shown as cards with title, description, last-modified date, and an **Edit** button.

- **New Report** — Opens a blank report in the builder.
- **Duplicate** — Creates a copy of a report.
- **Delete** — Permanently removes the report.

### Report Builder

**Path:** `/reports/:id/edit`

The builder has three panels:

#### Left Panel — Dataset Fields *(collapsible)*
Lists all datasets in the workspace. Expand a dataset to see its columns. Fields can be dragged onto the canvas (or just configure them in the chart config panel on the right).

Click the **‹ chevron** in the panel header to collapse it into a thin vertical rail and free up canvas space; click the rail (**›**) to reopen. The Measures section at the bottom lets you create reusable calculated measures (SUM/AVG/COUNT/MIN/MAX expressions).

#### Center Panel — Canvas
The main editing surface. Widgets can be:
- **Moved** — Drag the widget header bar.
- **Resized** — Drag the resize handle (bottom-right corner).
- **Deleted** — Click the × button in the top-right of the widget header.
- **Cross-filtered** — Click a bar/slice/point to filter every other widget by that value; click again to clear.
- **Drilled down** — On charts with configured drill fields, click to descend the hierarchy; use the breadcrumb to climb back up.

The canvas uses a 12-column responsive grid.

#### Right Panel — Chart Config *(collapsible)*
When a widget is selected, the config panel appears here. It is also collapsible via the **› chevron** in its header (reopen from the rail's **‹**). The same panel hosts the **Bookmarks** and **Filters** views when those toolbar buttons are active. Options depend on the chart type but typically include:
- **Title** — Display name shown in the widget header.
- **Dataset** — Which dataset to query.
- **X Axis / Group By** — The categorical field.
- **Y Axis / Value Field** — The numeric field to aggregate.
- **Aggregation** — SUM, AVG, COUNT, MIN, MAX.
- **Format** — Currency, percentage, or plain number (for KPIs).
- **Limit** — Maximum data points to display.
- **Columns** — Which columns to show (for table widgets).

#### Adding a Visual

Click **+ Add Visual** in the toolbar to open the chart type selector. Click any chart type to add it to the canvas.

#### Saving

Click **Save** in the top toolbar. The layout and all widget configurations are persisted to the server.

---

## 8. Chart Types Reference

InsightBI ships **24 visualization types**, grouped below.

### Cards & narrative
| Type | Best used for |
|---|---|
| **KPI Card** | Single key metric with a real period-over-period change indicator |
| **Number** | Large single number, no trend line |
| **Card with Trend** | A metric plus its delta vs. the previous period |
| **Smart Narrative** | Auto-generated text summary (total, average, top/bottom, trend) |

### Core charts
| Type | Best used for |
|---|---|
| **Bar Chart** | Comparing categories |
| **Line Chart** | Trends over time |
| **Area Chart** | Cumulative trends |
| **Pie Chart** | Part-to-whole proportions (≤ 6 categories) |
| **Donut Chart** | Part-to-whole with a hollow center |
| **Scatter Plot** | Correlation between two numeric fields |
| **Gauge** | A single aggregated metric on a 0→max dial |
| **Waterfall** | Running cumulative contribution by category |
| **Combo** | Bars + line (two metrics, or a Pareto cumulative line) |

### Distribution & advanced
| Type | Best used for |
|---|---|
| **Histogram** | Frequency distribution of one numeric field |
| **Box Plot** | Spread (min/Q1/median/Q3/max) per group |
| **Treemap** | Hierarchical part-to-whole by area |
| **Funnel** | Conversion pipeline stages |
| **Heatmap** | Two-dimensional density or intensity (e.g. Day × Hour) |
| **Matrix** | Pivot table: rows × columns with aggregated values |
| **Decomposition Tree** | Drill a metric down through field hierarchies |
| **Map** | Lat/long scatter or aggregated value-by-location bars |

### Data & filters
| Type | Best used for |
|---|---|
| **Table** | Detailed row-level data |
| **Slicer** | Interactive filter buttons for the report |
| **Date Range** | From/To date filter control |

> Tip: open the **🎨 All Visualizations Showcase** report (created by the demo seed) to see every type live, sourced from multiple datasets.

---

## 9. Sharing & Exporting

### Sharing a Report

Inside the Report Builder, click **Share** in the toolbar.

- **Share by email** — Enter a registered user's email. They will see the report in their **Shared with me** section.
- **Public link** — Toggle to generate a public URL. Anyone with the link can view the report (read-only) without logging in.
- **Disable sharing** — Toggle off to revoke public access.

### Shared Reports

**Path:** `/shared`

Lists all reports shared directly with your account.

### Embedding

Click **Share → Embed** to generate an embed token and an `<iframe>` snippet. Embedded reports render read-only and fetch their data using the token, with no login required.

### Exporting

- **Export PDF** — Click **PDF** in the builder toolbar. InsightBI waits ~5 seconds for all chart animations to finish, snapshots every chart, temporarily switches to light theme, then opens your browser's print dialog — choose **Save as PDF** as the destination. Because it uses the browser's native print engine, every chart (including maps, heatmaps, and pivot tables) is captured exactly as shown across multiple pages.
- **Export JSON** — Downloads the full report definition (layout + widget configs) as a `.json` file. Useful for backup or moving a report between workspaces.
- **Export CSV** — Available per-dataset from the Datasets page. Downloads the current (post-transform) data as a `.csv` file.

---

## 10. Admin Panel

**Path:** `/admin`

Only visible to users with the **Admin** role.

### Stats Tab

Shows platform-wide counts: total users, workspaces, datasets, and reports. A live activity feed displays the 20 most recent actions across all users.

### Users Tab

A paginated list of all registered users with their role, workspace count, and report count.

- **Change Role** — Click the role badge on any user to cycle through Viewer → Editor → Admin.

### Activity Logs Tab

A full paginated log of all tracked actions:

| Action | Triggered by |
|---|---|
| USER_REGISTERED | New account created |
| USER_LOGIN | Successful sign-in |
| WORKSPACE_CREATED | New workspace |
| DATASET_UPLOADED | File upload |
| TRANSFORMATION_SAVED | Transform pipeline saved |
| TRANSFORMATION_APPLIED | Transform pipeline applied to data |
| REPORT_CREATED | New report |
| REPORT_UPDATED | Report layout saved |
| MEMBER_INVITED | Workspace member added |

---

## 11. Settings

**Path:** `/settings`

### Profile

Update your **display name** and **avatar URL**.

### Change Password

Enter your current password and a new password (minimum 8 characters), then click **Update Password**.

### Appearance

Toggle between **Light** and **Dark** mode. The preference is saved to local storage.

---

## 12. Roles & Permissions

| Permission | Viewer | Editor | Admin |
|---|---|---|---|
| View reports | ✅ | ✅ | ✅ |
| View datasets | ✅ | ✅ | ✅ |
| Upload datasets | ❌ | ✅ | ✅ |
| Create / edit reports | ❌ | ✅ | ✅ |
| Apply transformations | ❌ | ✅ | ✅ |
| Manage workspace members | ❌ | ❌ | ✅ |
| Delete workspace | ❌ | ❌ | ✅ (or owner) |
| Access Admin Panel | ❌ | ❌ | ✅ |
| Change user roles | ❌ | ❌ | ✅ |

> Workspace **Owners** have the same rights as Admins within their own workspace, even if their platform role is Editor.

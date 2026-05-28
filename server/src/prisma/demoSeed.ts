/**
 * InsightBI — Comprehensive Demo Seed
 * Run: npx ts-node src/prisma/demoSeed.ts
 * Creates rich demo data for demo@insightbi.com:
 *   • 8 datasets  (200+ rows each, 8-15 columns each)
 *   • 4 data relationships
 *   • 3 showcase reports covering all 22 chart types
 *
 * Run: npx ts-node src/prisma/demoSeed.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ─── Deterministic RNG (no Math.random() for reproducibility) ───────────────
let _seed = 42;
function rand(): number { _seed = (_seed * 1664525 + 1013904223) & 0xffffffff; return ((_seed >>> 0) / 0xffffffff); }
function ri(min: number, max: number) { return Math.floor(rand() * (max - min + 1)) + min; }
function rf(min: number, max: number, dp = 2) { return +((rand() * (max - min) + min).toFixed(dp)); }
function pick<T>(arr: T[]): T { return arr[ri(0, arr.length - 1)]; }

// ─── Reference lists ────────────────────────────────────────────────────────
const REGIONS    = ['North','South','East','West','Central'];
const CATEGORIES = ['Electronics','Furniture','Clothing','Food & Beverage','Sports','Books','Health & Beauty','Automotive'];
const SEGMENTS   = ['Enterprise','Mid-Market','SMB','Startup'];
const COUNTRIES  = ['Bangladesh','USA','UK','Germany','Canada','France','Australia','India','Japan','Singapore'];
const CHANNELS   = ['Facebook','Google Ads','Instagram','Email','YouTube','SMS','LinkedIn','Twitter'];
const STATUSES   = ['Completed','Pending','Cancelled','Refunded'];
const PRIORITIES = ['Low','Medium','High','Critical'];
const DAYS       = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MONTHS     = ['2024-01','2024-02','2024-03','2024-04','2024-05','2024-06','2024-07','2024-08','2024-09','2024-10','2024-11','2024-12'];
const PRODUCTS   = [
  'Laptop Pro 15','Wireless Earbuds','Smart Watch','4K Monitor','Mechanical Keyboard',
  'Office Chair','Standing Desk','Bookshelf','Filing Cabinet','Ergonomic Mouse',
  'Winter Jacket','Running Shoes','Sports Jersey','Yoga Mat','Backpack',
  'Organic Coffee','Green Tea Set','Protein Powder','Vitamin Pack','Energy Bar',
  'Fiction Novel','Business Book','Science Magazine','Children Comics','Cook Book',
];
const CUSTOMER_NAMES = [
  'Acme Corp','Global Foods','Tech Solutions','BuildRight Inc','MediCare Plus',
  'FastLogistics','DataSystems','GreenEnergy','SkyRetail','UrbanFresh',
  'PeakFinance','CloudNine IT','BrightMedia','IronForge Mfg','SilverBridge',
  'NextGen Labs','FutureTrade','AlphaSoft','BetaHealth','GammaBuild',
];

// ─── Dataset generators ──────────────────────────────────────────────────────

/** 1. Sales Transactions — 300 rows, 14 cols */
function genSales(): Record<string,unknown>[] {
  const rows: Record<string,unknown>[] = [];
  for (let i = 1; i <= 300; i++) {
    const units     = ri(1, 120);
    const unitPrice = rf(200, 85000, 0);
    const discount  = rf(0, 25, 1);
    const revenue   = +(units * unitPrice * (1 - discount / 100)).toFixed(0);
    const cost      = +(revenue * rf(0.45, 0.70, 3)).toFixed(0);
    rows.push({
      OrderID:       `ORD-${String(i).padStart(4,'0')}`,
      Date:          `2024-${String(ri(1,12)).padStart(2,'0')}-${String(ri(1,28)).padStart(2,'0')}`,
      CustomerID:    `C${String(ri(1,20)).padStart(3,'0')}`,
      ProductID:     `P${String(ri(1,25)).padStart(3,'0')}`,
      Region:        pick(REGIONS),
      Category:      pick(CATEGORIES),
      Product:       pick(PRODUCTS),
      Units:         units,
      UnitPrice:     unitPrice,
      Discount:      discount,
      Revenue:       revenue,
      Cost:          cost,
      Profit:        revenue - cost,
      Status:        pick(STATUSES),
    });
  }
  return rows;
}

/** 2. Customer Master — 20 rows, 12 cols */
function genCustomers() {
  return CUSTOMER_NAMES.map((name, i) => {
    const annualValue = ri(50000, 900000);
    return {
      CustomerID:   `C${String(i + 1).padStart(3,'0')}`,
      CustomerName: name,
      Segment:      pick(SEGMENTS),
      Country:      pick(COUNTRIES),
      Industry:     pick(['Technology','Retail','Healthcare','Finance','Manufacturing','Education','Energy','Logistics']),
      AnnualValue:  annualValue,
      Employees:    ri(10, 50000),
      YearsActive:  ri(1, 20),
      Tier:         annualValue > 500000 ? 'Platinum' : annualValue > 200000 ? 'Gold' : annualValue > 80000 ? 'Silver' : 'Bronze',
      NPS:          ri(20, 98),
      SupportTickets: ri(0, 80),
      Active:       rand() > 0.15,
    };
  });
}

/** 3. Product Catalog — 25 rows, 11 cols */
function genProducts() {
  return PRODUCTS.map((name, i) => {
    const cost  = ri(500, 60000);
    const price = +(cost * rf(1.3, 3.5, 2)).toFixed(0);
    return {
      ProductID:    `P${String(i + 1).padStart(3,'0')}`,
      ProductName:  name,
      Category:     CATEGORIES[Math.floor(i / (PRODUCTS.length / CATEGORIES.length))],
      UnitCost:     cost,
      ListPrice:    price,
      Margin:       +(((price - cost) / price) * 100).toFixed(1),
      StockQty:     ri(10, 800),
      ReorderLevel: ri(20, 150),
      Weight:       rf(0.1, 25, 2),
      Rating:       rf(2.5, 5.0, 1),
      Active:       rand() > 0.1,
    };
  });
}

/** 4. Daily Time Series — 365 rows, 9 cols */
function genTimeSeries(): Record<string,unknown>[] {
  const rows: Record<string,unknown>[] = [];
  const start = new Date('2024-01-01');
  for (let i = 0; i < 365; i++) {
    const d   = new Date(start.getTime() + i * 86400000);
    const dow = d.getDay();
    const wknd = dow === 0 || dow === 6;
    const trend = i * 75;
    const base  = wknd ? 18000 : 34000;
    const noise = (rand() - 0.5) * 10000;
    const rev   = Math.max(5000, Math.round(base + trend + noise));
    const orders = Math.round(rev / ri(2000, 3500));
    rows.push({
      Date:          d.toISOString().slice(0,10),
      DayOfWeek:     DAYS[dow === 0 ? 6 : dow - 1],
      Month:         `2024-${String(d.getMonth()+1).padStart(2,'0')}`,
      Revenue:       rev,
      Orders:        orders,
      AvgOrderValue: orders > 0 ? Math.round(rev / orders) : 0,
      NewCustomers:  ri(wknd ? 1 : 3, wknd ? 8 : 18),
      ReturnRate:    rf(0.5, 6.5, 2),
      AdSpend:       Math.round(rev * rf(0.04, 0.12, 3)),
    });
  }
  return rows;
}

/** 5. Support Heatmap — 7×24 = 168 rows, 7 cols */
function genHeatmap(): Record<string,unknown>[] {
  const rows: Record<string,unknown>[] = [];
  DAYS.forEach((day, di) => {
    for (let h = 0; h < 24; h++) {
      const business = h >= 9 && h <= 18 && di < 5;
      rows.push({
        DayOfWeek:         day,
        Hour:              h,
        Tickets:           ri(business ? 12 : 1, business ? 48 : 15),
        AvgResolutionMins: ri(business ? 8 : 20, business ? 45 : 180),
        Priority:          pick(PRIORITIES),
        CSAT:              rf(2.5, 5.0, 1),
        Escalations:       ri(0, business ? 6 : 2),
      });
    }
  });
  return rows;
}

/** 6. Marketing Campaigns — 80 rows, 12 cols */
function genMarketing(): Record<string,unknown>[] {
  const rows: Record<string,unknown>[] = [];
  for (let i = 1; i <= 80; i++) {
    const spend   = ri(1000, 60000);
    const impr    = ri(10000, 2000000);
    const clicks  = ri(500, Math.min(impr, 80000));
    const conv    = ri(20, Math.min(clicks, 8000));
    const rev     = conv * ri(150, 2500);
    rows.push({
      CampaignID:   `CMP-${String(i).padStart(3,'0')}`,
      CampaignName: `${pick(['Summer','Winter','Spring','Fall','Holiday','Flash','VIP','Launch'])} ${pick(['Sale','Promo','Drive','Push','Boost','Campaign'])} ${2024}`,
      Channel:      pick(CHANNELS),
      Region:       pick(REGIONS),
      Month:        pick(MONTHS),
      AdSpend:      spend,
      Impressions:  impr,
      Clicks:       clicks,
      Conversions:  conv,
      Revenue:      rev,
      CTR:          +(clicks / impr * 100).toFixed(3),
      ROAS:         +(rev / spend).toFixed(2),
    });
  }
  return rows;
}

/** 7. Inventory — 200 rows, 13 cols */
function genInventory(): Record<string,unknown>[] {
  const warehouses = ['WH-Dhaka','WH-Chittagong','WH-Sylhet','WH-Rajshahi','WH-Khulna'];
  const rows: Record<string,unknown>[] = [];
  for (let i = 1; i <= 200; i++) {
    const unitCost = ri(200, 70000);
    const qty      = ri(0, 1200);
    rows.push({
      SKU:             `SKU-${String(i).padStart(4,'0')}`,
      ProductID:       `P${String(ri(1,25)).padStart(3,'0')}`,
      ProductName:     pick(PRODUCTS),
      Category:        pick(CATEGORIES),
      Warehouse:       pick(warehouses),
      StockQty:        qty,
      ReorderLevel:    ri(20, 200),
      UnitCost:        unitCost,
      InventoryValue:  qty * unitCost,
      LastRestockDate: `2024-${String(ri(1,12)).padStart(2,'0')}-${String(ri(1,28)).padStart(2,'0')}`,
      SupplierID:      `SUP-${String(ri(1,15)).padStart(3,'0')}`,
      DaysOfStock:     qty > 0 ? ri(1, 180) : 0,
      IsDiscontinued:  rand() < 0.08,
    });
  }
  return rows;
}

/** 8. KPI Targets — 48 rows (12 months × 4 departments), 11 cols */
function genKPI(): Record<string,unknown>[] {
  const depts  = ['Sales','Marketing','Support','Operations'];
  const metrics= ['Revenue','Cost','Headcount','CustomerSatisfaction','LeadConversion','ChurnRate','NPS','SLACompliance'];
  const rows: Record<string,unknown>[] = [];
  MONTHS.forEach((month) => {
    depts.forEach((dept) => {
      const target = ri(50000, 2000000);
      const actual = +(target * rf(0.72, 1.28, 3)).toFixed(0);
      rows.push({
        Month:      month,
        Department: dept,
        Metric:     pick(metrics),
        Target:     target,
        Actual:     actual,
        Variance:   actual - target,
        PctAchieved:+(actual / target * 100).toFixed(1),
        Status:     actual >= target ? 'Achieved' : actual >= target * 0.9 ? 'On Track' : 'At Risk',
        Owner:      pick(['Alice','Bob','Carol','Dave','Eve','Frank']),
        Quarter:    `Q${Math.ceil(parseInt(month.slice(5)) / 3)}`,
        YTD:        +(target * rf(0.8, 1.2, 2)).toFixed(0),
      });
    });
  });
  return rows;
}

// ═══════════════════════════════════════════════════════════════════
//  WORKSPACE 2 — Analytics Hub  (new, distinct datasets)
// ═══════════════════════════════════════════════════════════════════

const DEPARTMENTS = ['Engineering','Sales','Marketing','Finance','HR','Operations','Legal','Support'];
const ROLES       = ['Analyst','Manager','Director','Engineer','Specialist','Executive','Coordinator','Consultant'];
const GENDERS     = ['Male','Female','Non-binary'];
const LOCATIONS   = ['Dhaka','Chittagong','New York','London','Berlin','Tokyo','Singapore','Sydney'];
const PAY_METHODS = ['Credit Card','Debit Card','bKash','Nagad','PayPal','Bank Transfer','COD'];
const DEVICES     = ['Desktop','Mobile','Tablet'];
const WEB_CHAN    = ['Organic Search','Paid Search','Social','Email','Direct','Referral'];
const PROJ_STATUS = ['Planning','In Progress','Completed','On Hold','Cancelled'];
const PROJ_CAT    = ['Software','Infrastructure','Marketing','R&D','Process Improvement'];
const ACCT_TYPES  = ['Revenue','COGS','OpEx','CapEx','Tax','Interest'];

/** A1. HR Employees — 250 rows, 12 cols */
function genEmployees(): Record<string,unknown>[] {
  const rows: Record<string,unknown>[] = [];
  for (let i = 1; i <= 250; i++) {
    const dept = pick(DEPARTMENTS);
    const yrs  = ri(0, 20);
    const base = dept === 'Engineering' ? ri(80000,250000) : dept === 'Finance' ? ri(70000,200000) : ri(40000,160000);
    rows.push({
      EmployeeID:       `EMP-${String(i).padStart(4,'0')}`,
      Department:       dept,
      Role:             pick(ROLES),
      Salary:           base,
      YearsOfService:   yrs,
      PerformanceScore: rf(1.0, 5.0, 1),
      Gender:           pick(GENDERS),
      Location:         pick(LOCATIONS),
      JoinDate:         `${2024 - yrs}-${String(ri(1,12)).padStart(2,'0')}-${String(ri(1,28)).padStart(2,'0')}`,
      IsManager:        rand() < 0.18,
      TrainingHours:    ri(0, 120),
      Status:           rand() < 0.07 ? 'Inactive' : 'Active',
    });
  }
  return rows;
}

/** A2. Financial Ledger — 300 rows, 12 cols */
function genFinancial(): Record<string,unknown>[] {
  const rows: Record<string,unknown>[] = [];
  for (let i = 1; i <= 300; i++) {
    const amount  = ri(5000, 5000000);
    const dept    = pick(DEPARTMENTS);
    const type    = pick(ACCT_TYPES);
    const isCapex = type === 'CapEx';
    rows.push({
      TransactionID: `TXN-${String(i).padStart(4,'0')}`,
      Date:          `2024-${String(ri(1,12)).padStart(2,'0')}-${String(ri(1,28)).padStart(2,'0')}`,
      Account:       type,
      Department:    dept,
      CostCenter:    `CC-${String(ri(100,999))}`,
      Amount:        amount,
      Type:          rand() < 0.55 ? 'Debit' : 'Credit',
      Category:      isCapex ? 'Capital' : pick(['Salaries','Subscriptions','Travel','Equipment','Marketing','Utilities']),
      Currency:      pick(['BDT','USD','EUR','GBP']),
      Quarter:       `Q${Math.ceil(ri(1,12)/3)}`,
      IsCapex:       isCapex,
      FiscalYear:    2024,
    });
  }
  return rows;
}

/** A3. E-commerce Orders — 400 rows, 11 cols */
function genEcomOrders(): Record<string,unknown>[] {
  const rows: Record<string,unknown>[] = [];
  const ecProducts = ['T-Shirt','Sneakers','Laptop Bag','Water Bottle','Sunglasses','Headphones','Jeans','Jacket','Watch','Phone Case',
    'Backpack','Notebook','Pen Set','Mug','Keychain','Belt','Cap','Scarf','Gloves','Socks'];
  const ecCategories = ['Apparel','Electronics','Accessories','Stationery','Footwear'];
  for (let i = 1; i <= 400; i++) {
    const qty = ri(1, 10);
    const price = ri(200, 12000);
    const disc  = rf(0, 30, 1);
    rows.push({
      OrderID:       `ECO-${String(i).padStart(5,'0')}`,
      Date:          `2024-${String(ri(1,12)).padStart(2,'0')}-${String(ri(1,28)).padStart(2,'0')}`,
      ProductName:   pick(ecProducts),
      Category:      pick(ecCategories),
      Qty:           qty,
      UnitPrice:     price,
      Discount:      disc,
      Revenue:       +(qty * price * (1 - disc / 100)).toFixed(0),
      ShipCountry:   pick(COUNTRIES),
      PaymentMethod: pick(PAY_METHODS),
      IsReturned:    rand() < 0.08,
    });
  }
  return rows;
}

/** A4. Web Analytics — 365 daily rows, 10 cols */
function genWebAnalytics(): Record<string,unknown>[] {
  const rows: Record<string,unknown>[] = [];
  const start = new Date('2024-01-01');
  for (let i = 0; i < 365; i++) {
    const d   = new Date(start.getTime() + i * 86400000);
    const dow = d.getDay();
    const wknd = dow === 0 || dow === 6;
    const base = wknd ? 1500 : 3200;
    const trend = i * 1.5;
    const sessions = Math.round(base + trend + (rand()-0.5)*800);
    const views    = Math.round(sessions * rf(2.5, 5.0, 1));
    const newUsers = Math.round(sessions * rf(0.3, 0.65, 2));
    const conv     = Math.round(sessions * rf(0.01, 0.08, 3));
    rows.push({
      Date:              d.toISOString().slice(0,10),
      Sessions:          sessions,
      PageViews:         views,
      BounceRate:        rf(20, 70, 1),
      AvgDuration:       ri(45, 420),
      NewUsers:          newUsers,
      Conversions:       conv,
      Revenue:           conv * ri(300, 3500),
      Device:            pick(DEVICES),
      Channel:           pick(WEB_CHAN),
    });
  }
  return rows;
}

/** A5. Project Tracker — 100 rows, 12 cols */
function genProjects(): Record<string,unknown>[] {
  const rows: Record<string,unknown>[] = [];
  for (let i = 1; i <= 100; i++) {
    const budget = ri(50000, 5000000);
    const compl  = ri(0, 100);
    const spent  = +(budget * rf(0.3, 1.35, 3)).toFixed(0);
    const status = compl === 100 ? 'Completed' : compl < 10 ? 'Planning' : pick(PROJ_STATUS.filter(s => s !== 'Completed' && s !== 'Planning'));
    rows.push({
      ProjectID:   `PRJ-${String(i).padStart(3,'0')}`,
      ProjectName: `${pick(['Alpha','Beta','Gamma','Delta','Omega','Sigma','Phoenix','Apex'])} ${pick(['Initiative','Upgrade','Launch','Overhaul','Rollout','Migration','Integration','Expansion'])}`,
      Department:  pick(DEPARTMENTS),
      Manager:     pick(['Alice','Bob','Carol','Dave','Eve','Frank','Grace','Hank']),
      Budget:      budget,
      Spent:       spent,
      Variance:    spent - budget,
      Status:      status,
      Priority:    pick(PRIORITIES),
      Category:    pick(PROJ_CAT),
      Completion:  compl,
      IsOverBudget: spent > budget,
    });
  }
  return rows;
}

/** Build 4 reports for Workspace 2 */
function buildHub4Reports(ids: Record<string, string>) {
  const { employees, financial, ecom, webAnalytics, projects } = ids;
  return [
    // ═══════════════════════════════════════════════════════
    // HUB REPORT 1 — HR & People Analytics
    // ═══════════════════════════════════════════════════════
    {
      name: '👥 HR & People Analytics',
      description: 'Headcount, salary distributions, performance, and workforce intelligence',
      widgets: [
        // Row 1 — KPI cards
        { id:'h1-kpi1', type:'kpi',     x:0, y:0,  w:3,h:2, config:{ title:'Total Headcount',     datasetId:employees, yField:'Salary',           aggregation:'count' }},
        { id:'h1-kpi2', type:'kpi',     x:3, y:0,  w:3,h:2, config:{ title:'Avg Salary',           datasetId:employees, yField:'Salary',           aggregation:'avg'   }},
        { id:'h1-kpi3', type:'number',  x:6, y:0,  w:3,h:2, config:{ title:'Avg Perf Score',       datasetId:employees, yField:'PerformanceScore',  aggregation:'avg'   }},
        { id:'h1-kpi4', type:'kpi',     x:9, y:0,  w:3,h:2, config:{ title:'Total Training Hrs',   datasetId:employees, yField:'TrainingHours',     aggregation:'sum'   }},
        // Row 2 — Bar dept headcount + Donut gender
        { id:'h1-bar',  type:'bar',     x:0, y:2,  w:7,h:4, config:{ title:'Salary by Department', datasetId:employees, xField:'Department', yField:'Salary', aggregation:'avg' }},
        { id:'h1-dnut', type:'donut',   x:7, y:2,  w:5,h:4, config:{ title:'Gender Breakdown',     datasetId:employees, xField:'Gender',     yField:'Salary', aggregation:'count' }},
        // Row 3 — Scatter salary vs performance + Histogram salary distribution
        { id:'h1-scat', type:'scatter', x:0, y:6,  w:6,h:4, config:{ title:'Salary vs Performance Score', datasetId:employees, xField:'Salary', yField:'PerformanceScore' }},
        { id:'h1-hist', type:'histogram',x:6, y:6, w:6,h:4, config:{ title:'Salary Distribution',          datasetId:employees, yField:'Salary' }},
        // Row 4 — BoxPlot by dept + Pie location
        { id:'h1-box',  type:'boxplot', x:0, y:10, w:6,h:4, config:{ title:'Salary Spread by Department',  datasetId:employees, xField:'Department', yField:'Salary' }},
        { id:'h1-pie',  type:'pie',     x:6, y:10, w:6,h:4, config:{ title:'Employees by Location',        datasetId:employees, xField:'Location',   yField:'Salary', aggregation:'count' }},
        // Row 5 — Map + Table
        { id:'h1-map',  type:'map',     x:0, y:14, w:5,h:4, config:{ title:'Workforce by City (Map)',       datasetId:employees, xField:'Location', yField:'Salary', aggregation:'avg' }},
        { id:'h1-tbl',  type:'table',   x:5, y:14, w:7,h:4, config:{ title:'Employee Directory',            datasetId:employees }},
      ],
    },

    // ═══════════════════════════════════════════════════════
    // HUB REPORT 2 — Finance & Budget Dashboard
    // ═══════════════════════════════════════════════════════
    {
      name: '💰 Finance & Budget Dashboard',
      description: 'Ledger trends, cost breakdowns, budget variance, and project financials',
      widgets: [
        // Row 1 — KPIs
        { id:'h2-kpi1', type:'kpi',      x:0, y:0,  w:3,h:2, config:{ title:'Total Spend',     datasetId:financial, yField:'Amount', aggregation:'sum'   }},
        { id:'h2-kpi2', type:'number',   x:3, y:0,  w:3,h:2, config:{ title:'Transactions',    datasetId:financial, yField:'Amount', aggregation:'count' }},
        { id:'h2-kpi3', type:'kpi',      x:6, y:0,  w:3,h:2, config:{ title:'Total Budget',    datasetId:projects,  yField:'Budget', aggregation:'sum'   }},
        { id:'h2-kpi4', type:'kpi',      x:9, y:0,  w:3,h:2, config:{ title:'Total Spent',     datasetId:projects,  yField:'Spent',  aggregation:'sum'   }},
        // Row 2 — Line trend + Area dept spend
        { id:'h2-line', type:'line',     x:0, y:2,  w:7,h:4, config:{ title:'Monthly Spend Trend',      datasetId:financial, xField:'Date',       yField:'Amount',   aggregation:'sum' }},
        { id:'h2-area', type:'area',     x:7, y:2,  w:5,h:4, config:{ title:'OpEx Area Trend by Qtr',   datasetId:financial, xField:'Quarter',    yField:'Amount',   aggregation:'sum' }},
        // Row 3 — Pie account type + Treemap dept × category + Waterfall project variance
        { id:'h2-pie',  type:'pie',      x:0, y:6,  w:4,h:4, config:{ title:'Spend by Account',         datasetId:financial, xField:'Account',    yField:'Amount',   aggregation:'sum' }},
        { id:'h2-tree', type:'treemap',  x:4, y:6,  w:4,h:4, config:{ title:'Cost Treemap by Dept',     datasetId:financial, xField:'Department', yField:'Amount',   aggregation:'sum' }},
        { id:'h2-wfall',type:'waterfall',x:8, y:6,  w:4,h:4, config:{ title:'Project Budget Variance',   datasetId:projects,  xField:'Department', yField:'Variance', aggregation:'sum' }},
        // Row 4 — CardTrend + Smart Narrative + Bar by dept
        { id:'h2-card', type:'cardtrend',x:0, y:10, w:4,h:4, config:{ title:'Spend Trend Card',          datasetId:financial, xField:'Date',       yField:'Amount',   aggregation:'sum' }},
        { id:'h2-narr', type:'smartnarrative',x:4,y:10,w:4,h:4,config:{ title:'Finance AI Summary',      datasetId:financial, yField:'Amount',     aggregation:'sum' }},
        { id:'h2-bar',  type:'bar',      x:8, y:10, w:4,h:4, config:{ title:'Spend by Department',       datasetId:financial, xField:'Department', yField:'Amount',   aggregation:'sum' }},
        // Row 5 — Table financial + Table projects
        { id:'h2-tbl',  type:'table',   x:0, y:14, w:6,h:5, config:{ title:'Financial Transactions',     datasetId:financial }},
        { id:'h2-tbl2', type:'table',   x:6, y:14, w:6,h:5, config:{ title:'Project Tracker',            datasetId:projects  }},
      ],
    },

    // ═══════════════════════════════════════════════════════
    // HUB REPORT 3 — E-commerce Performance
    // ═══════════════════════════════════════════════════════
    {
      name: '🛒 E-commerce Performance',
      description: 'Order analytics, channel funnel, payment methods, product heatmap',
      widgets: [
        // Row 1 — KPIs
        { id:'h3-kpi1', type:'kpi',     x:0, y:0,  w:3,h:2, config:{ title:'Total Revenue',    datasetId:ecom, yField:'Revenue', aggregation:'sum'   }},
        { id:'h3-kpi2', type:'kpi',     x:3, y:0,  w:3,h:2, config:{ title:'Total Orders',     datasetId:ecom, yField:'Revenue', aggregation:'count' }},
        { id:'h3-kpi3', type:'kpi',     x:6, y:0,  w:3,h:2, config:{ title:'Avg Order Value',  datasetId:ecom, yField:'Revenue', aggregation:'avg'   }},
        { id:'h3-kpi4', type:'number',  x:9, y:0,  w:3,h:2, config:{ title:'Avg Qty per Order',datasetId:ecom, yField:'Qty',     aggregation:'avg'   }},
        // Row 2 — Bar category revenue + Funnel payment
        { id:'h3-bar',  type:'bar',     x:0, y:2,  w:6,h:4, config:{ title:'Revenue by Category',       datasetId:ecom, xField:'Category',      yField:'Revenue', aggregation:'sum' }},
        { id:'h3-funl', type:'funnel',  x:6, y:2,  w:6,h:4, config:{ title:'Revenue by Payment Method', datasetId:ecom, xField:'PaymentMethod', yField:'Revenue', aggregation:'sum' }},
        // Row 3 — Donut payment + Scatter qty vs revenue + Heatmap
        { id:'h3-dnut', type:'donut',   x:0, y:6,  w:4,h:4, config:{ title:'Orders by Payment Method',  datasetId:ecom, xField:'PaymentMethod', yField:'Revenue', aggregation:'count' }},
        { id:'h3-scat', type:'scatter', x:4, y:6,  w:4,h:4, config:{ title:'Qty vs Revenue Scatter',     datasetId:ecom, xField:'Qty',           yField:'Revenue' }},
        { id:'h3-heat', type:'heatmap', x:8, y:6,  w:4,h:5, config:{ title:'Category × Country Revenue', datasetId:ecom, xField:'Category', groupField:'ShipCountry', valueField:'Revenue' }},
        // Row 4 — Combo revenue + returns + matrix product × month + BoxPlot
        { id:'h3-cmbo', type:'combo',   x:0, y:10, w:6,h:4, config:{ title:'Revenue & Qty Combo',        datasetId:ecom, xField:'Category',  yField:'Revenue', aggregation:'sum' }},
        { id:'h3-mtrx', type:'matrix',  x:6, y:10, w:6,h:4, config:{ title:'Category × Country Matrix',  datasetId:ecom, xField:'Category', groupField:'ShipCountry', valueField:'Revenue' }},
        // Row 5 — Table + Map
        { id:'h3-tbl',  type:'table',   x:0, y:14, w:6,h:5, config:{ title:'Order Transactions',          datasetId:ecom }},
        { id:'h3-map',  type:'map',     x:6, y:14, w:6,h:5, config:{ title:'Revenue by Ship Country',      datasetId:ecom, xField:'ShipCountry', yField:'Revenue', aggregation:'sum' }},
      ],
    },

    // ═══════════════════════════════════════════════════════
    // HUB REPORT 4 — Digital & Operations Intelligence
    // ═══════════════════════════════════════════════════════
    {
      name: '🌐 Digital & Operations Intelligence',
      description: 'Web analytics, bounce gauge, project status decomposition, and filters',
      widgets: [
        // Row 1 — KPIs
        { id:'h4-kpi1', type:'kpi',      x:0, y:0,  w:3,h:2, config:{ title:'Total Sessions',   datasetId:webAnalytics, yField:'Sessions',    aggregation:'sum'   }},
        { id:'h4-kpi2', type:'kpi',      x:3, y:0,  w:3,h:2, config:{ title:'Total Conversions',datasetId:webAnalytics, yField:'Conversions', aggregation:'sum'   }},
        { id:'h4-kpi3', type:'kpi',      x:6, y:0,  w:3,h:2, config:{ title:'Avg Bounce Rate',  datasetId:webAnalytics, yField:'BounceRate',  aggregation:'avg'   }},
        { id:'h4-kpi4', type:'number',   x:9, y:0,  w:3,h:2, config:{ title:'Total New Users',  datasetId:webAnalytics, yField:'NewUsers',    aggregation:'sum'   }},
        // Row 2 — Line sessions + Gauge bounce rate
        { id:'h4-line', type:'line',     x:0, y:2,  w:8,h:4, config:{ title:'Daily Sessions Trend', datasetId:webAnalytics, xField:'Date',       yField:'Sessions',  aggregation:'sum' }},
        { id:'h4-gaug', type:'gauge',    x:8, y:2,  w:4,h:4, config:{ title:'Avg Bounce Rate (%)', datasetId:webAnalytics, yField:'BounceRate', aggregation:'avg'   }},
        // Row 3 — Area conversions + Bar by channel + Donut device
        { id:'h4-area', type:'area',     x:0, y:6,  w:5,h:4, config:{ title:'Conversions Area',    datasetId:webAnalytics, xField:'Date',    yField:'Conversions', aggregation:'sum' }},
        { id:'h4-bar',  type:'bar',      x:5, y:6,  w:4,h:4, config:{ title:'Sessions by Channel', datasetId:webAnalytics, xField:'Channel', yField:'Sessions',    aggregation:'sum' }},
        { id:'h4-dnut', type:'donut',    x:9, y:6,  w:3,h:4, config:{ title:'Traffic by Device',   datasetId:webAnalytics, xField:'Device',  yField:'Sessions',    aggregation:'sum' }},
        // Row 4 — Decomp tree + Histogram + BoxPlot
        { id:'h4-deco', type:'decomptree',x:0,y:10, w:5,h:4, config:{ title:'Project Budget Decomposition', datasetId:projects, xField:'Category', valueField:'Budget' }},
        { id:'h4-hist', type:'histogram', x:5,y:10, w:4,h:4, config:{ title:'Session Duration Distribution', datasetId:webAnalytics, yField:'AvgDuration' }},
        { id:'h4-box',  type:'boxplot',   x:9,y:10, w:3,h:4, config:{ title:'Project Completion Spread',     datasetId:projects, xField:'Priority', yField:'Completion' }},
        // Row 5 — Waterfall project + CardTrend sessions + Smart Narrative
        { id:'h4-wfal', type:'waterfall', x:0, y:14, w:5,h:4, config:{ title:'Project Budget vs Spent',  datasetId:projects,     xField:'Category',  yField:'Variance',  aggregation:'sum' }},
        { id:'h4-card', type:'cardtrend', x:5, y:14, w:4,h:4, config:{ title:'Daily Sessions Card',      datasetId:webAnalytics, xField:'Date',       yField:'Sessions',  aggregation:'sum' }},
        { id:'h4-narr', type:'smartnarrative',x:9,y:14,w:3,h:4,config:{ title:'Digital AI Summary',      datasetId:webAnalytics, yField:'Sessions',   aggregation:'sum' }},
        // Row 6 — Treemap project + Slicer + DateRange + Table
        { id:'h4-tree', type:'treemap',   x:0, y:18, w:4,h:4, config:{ title:'Budget by Project Category', datasetId:projects,     xField:'Category',  yField:'Budget',    aggregation:'sum' }},
        { id:'h4-slcr', type:'slicer',    x:4, y:18, w:2,h:4, config:{ title:'Channel Slicer',             datasetId:webAnalytics, xField:'Channel' }},
        { id:'h4-dtrg', type:'daterange', x:6, y:18, w:2,h:4, config:{ title:'Date Filter',                datasetId:webAnalytics, xField:'Date'    }},
        { id:'h4-tbl',  type:'table',     x:8, y:18, w:4,h:4, config:{ title:'Web Analytics Log',          datasetId:webAnalytics }},
      ],
    },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function inferSchema(rows: Record<string, unknown>[]) {
  if (!rows.length) return [];
  return Object.keys(rows[0]).map((name) => {
    const vals = rows.slice(0, 30).map((r) => r[name]).filter((v) => v != null && v !== '');
    let type = 'text';
    if (vals.every((v) => typeof v === 'boolean')) type = 'boolean';
    else if (vals.every((v) => !isNaN(Number(v)) && v !== '')) type = 'number';
    else if (vals.filter((v) => !isNaN(new Date(String(v)).getTime()) && String(v).length > 4).length > vals.length * 0.7) type = 'date';
    return { name, type, nullable: false, sampleValues: vals.slice(0, 3) };
  });
}

async function upsertDataset(wsId: string, name: string, rows: Record<string, unknown>[]) {
  const schema = inferSchema(rows);
  const ds = await prisma.dataset.create({
    data: {
      workspaceId: wsId, name,
      fileName: name.replace(/ /g,'_') + '.csv',
      fileType: 'text/csv',
      filePath: `seed/${name}.csv`,
      rowCount: rows.length,
      columnCount: schema.length,
      schemaJson: JSON.stringify(schema),
    },
  });
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    await prisma.datasetRow.createMany({
      data: rows.slice(i, i + BATCH).map((row, idx) => ({
        datasetId: ds.id, rowIndex: i + idx, rowJson: JSON.stringify(row),
      })),
    });
  }
  console.log(`    ✓ ${name}: ${rows.length} rows × ${schema.length} cols`);
  return ds;
}

// ─── Report definitions ───────────────────────────────────────────────────────
function buildReports(ids: Record<string, string>) {
  const { sales, customers, products, timeSeries, heatmap, marketing, inventory, kpi } = ids;

  return [
    // ═══════════════════════════════════════════════════════
    // REPORT 1 — Executive Sales Dashboard
    // ═══════════════════════════════════════════════════════
    {
      name: '📊 Executive Sales Dashboard',
      description: 'KPIs, trends, regional breakdown, and profit analysis',
      widgets: [
        // Row 1 — 4 KPI cards
        { id:'r1-kpi1', type:'kpi',           x:0, y:0,  w:3,h:2, config:{ title:'Total Revenue',    datasetId:sales,     yField:'Revenue', aggregation:'sum'   }},
        { id:'r1-kpi2', type:'kpi',           x:3, y:0,  w:3,h:2, config:{ title:'Total Profit',     datasetId:sales,     yField:'Profit',  aggregation:'sum'   }},
        { id:'r1-kpi3', type:'kpi',           x:6, y:0,  w:3,h:2, config:{ title:'Total Units Sold', datasetId:sales,     yField:'Units',   aggregation:'sum'   }},
        { id:'r1-kpi4', type:'number',        x:9, y:0,  w:3,h:2, config:{ title:'Total Orders',     datasetId:sales,     yField:'Revenue', aggregation:'count' }},
        // Row 2 — Line trend + Bar region
        { id:'r1-line', type:'line',          x:0, y:2,  w:8,h:4, config:{ title:'Daily Revenue Trend', datasetId:timeSeries, xField:'Date',   yField:'Revenue', aggregation:'sum' }},
        { id:'r1-bar',  type:'bar',           x:8, y:2,  w:4,h:4, config:{ title:'Revenue by Region',   datasetId:sales,      xField:'Region', yField:'Revenue', aggregation:'sum' }},
        // Row 3 — Area + Pie + Donut
        { id:'r1-area', type:'area',          x:0, y:6,  w:5,h:4, config:{ title:'Monthly Orders Area',  datasetId:timeSeries, xField:'Month',    yField:'Orders',  aggregation:'sum' }},
        { id:'r1-pie',  type:'pie',           x:5, y:6,  w:4,h:4, config:{ title:'Revenue by Category',  datasetId:sales,      xField:'Category', yField:'Revenue', aggregation:'sum' }},
        { id:'r1-dnut', type:'donut',         x:9, y:6,  w:3,h:4, config:{ title:'Sales by Status',      datasetId:sales,      xField:'Status',   yField:'Revenue', aggregation:'sum' }},
        // Row 4 — Waterfall + Treemap + Smart Narrative
        { id:'r1-wfall',type:'waterfall',     x:0, y:10, w:5,h:4, config:{ title:'Monthly P&L Waterfall', datasetId:sales,     xField:'Status',   yField:'Profit',  aggregation:'sum' }},
        { id:'r1-tree', type:'treemap',       x:5, y:10, w:4,h:4, config:{ title:'Revenue Treemap',        datasetId:sales,     xField:'Category', yField:'Revenue', aggregation:'sum' }},
        { id:'r1-narr', type:'smartnarrative',x:9, y:10, w:3,h:4, config:{ title:'AI Insights',            datasetId:sales,     yField:'Revenue',  aggregation:'sum' }},
        // Row 5 — Combo + CardTrend
        { id:'r1-combo',type:'combo',         x:0, y:14, w:8,h:4, config:{ title:'Revenue vs Profit (Combo)', datasetId:sales, xField:'Region', yField:'Revenue', aggregation:'sum' }},
        { id:'r1-card', type:'cardtrend',     x:8, y:14, w:4,h:4, config:{ title:'Revenue Trend Card',    datasetId:timeSeries, xField:'Date', yField:'Revenue', aggregation:'sum' }},
        // Row 6 — Table
        { id:'r1-tbl',  type:'table',         x:0, y:18, w:12,h:5,config:{ title:'Full Sales Transactions', datasetId:sales }},
      ],
    },

    // ═══════════════════════════════════════════════════════
    // REPORT 2 — Marketing & Customer Analytics
    // ═══════════════════════════════════════════════════════
    {
      name: '📣 Marketing & Customer Analytics',
      description: 'Campaign performance, customer segments, funnel, scatter, and heatmap',
      widgets: [
        // Row 1 — KPIs
        { id:'r2-kpi1', type:'kpi',      x:0, y:0,  w:3,h:2, config:{ title:'Total Ad Spend',    datasetId:marketing,  yField:'AdSpend',     aggregation:'sum'  }},
        { id:'r2-kpi2', type:'kpi',      x:3, y:0,  w:3,h:2, config:{ title:'Total Conversions', datasetId:marketing,  yField:'Conversions', aggregation:'sum'  }},
        { id:'r2-kpi3', type:'kpi',      x:6, y:0,  w:3,h:2, config:{ title:'Avg ROAS',          datasetId:marketing,  yField:'ROAS',        aggregation:'avg'  }},
        { id:'r2-kpi4', type:'kpi',      x:9, y:0,  w:3,h:2, config:{ title:'Active Customers',  datasetId:customers,  yField:'AnnualValue', aggregation:'count'}},
        // Row 2 — Scatter + Funnel
        { id:'r2-scat', type:'scatter',  x:0, y:2,  w:6,h:4, config:{ title:'Ad Spend vs Revenue (Scatter)', datasetId:marketing, xField:'AdSpend', yField:'Revenue' }},
        { id:'r2-funl', type:'funnel',   x:6, y:2,  w:6,h:4, config:{ title:'Conversion Funnel (Stages)',    datasetId:marketing, xField:'Channel', yField:'Conversions', aggregation:'sum' }},
        // Row 3 — Heatmap + Bar channel
        { id:'r2-heat', type:'heatmap',  x:0, y:6,  w:6,h:5, config:{ title:'Support Tickets Heatmap (Day × Hour)', datasetId:heatmap, xField:'DayOfWeek', groupField:'Hour', valueField:'Tickets', aggregation:'sum' }},
        { id:'r2-bar2', type:'bar',      x:6, y:6,  w:6,h:5, config:{ title:'Revenue by Channel',                   datasetId:marketing, xField:'Channel', yField:'Revenue', aggregation:'sum' }},
        // Row 4 — Customer segment donut + NPS scatter + country bar
        { id:'r2-dnut', type:'donut',    x:0, y:11, w:4,h:4, config:{ title:'Customers by Segment',   datasetId:customers, xField:'Segment',  yField:'AnnualValue', aggregation:'sum' }},
        { id:'r2-sct2', type:'scatter',  x:4, y:11, w:4,h:4, config:{ title:'NPS vs Annual Value',    datasetId:customers, xField:'NPS',       yField:'AnnualValue' }},
        { id:'r2-bar3', type:'bar',      x:8, y:11, w:4,h:4, config:{ title:'Revenue by Country',     datasetId:customers, xField:'Country',   yField:'AnnualValue', aggregation:'sum' }},
        // Row 5 — Histogram + BoxPlot + Table
        { id:'r2-hist', type:'histogram',x:0, y:15, w:4,h:4, config:{ title:'ROAS Distribution',      datasetId:marketing, yField:'ROAS' }},
        { id:'r2-box',  type:'boxplot',  x:4, y:15, w:4,h:4, config:{ title:'Revenue Spread by Channel', datasetId:marketing, xField:'Channel', yField:'Revenue' }},
        { id:'r2-tbl2', type:'table',    x:8, y:15, w:4,h:4, config:{ title:'Top Customers',           datasetId:customers }},
        // Row 6 — Matrix + Slicer + DateRange
        { id:'r2-mtrx', type:'matrix',   x:0, y:19, w:6,h:4, config:{ title:'Channel × Month Matrix', datasetId:marketing, xField:'Channel', groupField:'Month', valueField:'Revenue' }},
        { id:'r2-slcr', type:'slicer',   x:6, y:19, w:3,h:4, config:{ title:'Channel Filter',         datasetId:marketing, xField:'Channel' }},
        { id:'r2-dtrg', type:'daterange',x:9, y:19, w:3,h:4, config:{ title:'Date Filter',             datasetId:timeSeries,xField:'Date' }},
      ],
    },

    // ═══════════════════════════════════════════════════════
    // REPORT 3 — Operations & Inventory Intelligence
    // ═══════════════════════════════════════════════════════
    {
      name: '🏭 Operations & Inventory Intelligence',
      description: 'Inventory levels, KPI tracking, decomposition tree, gauge, and map',
      widgets: [
        // Row 1 — KPIs
        { id:'r3-kpi1', type:'kpi',       x:0,  y:0,  w:3,h:2, config:{ title:'Total Inventory Value', datasetId:inventory, yField:'InventoryValue', aggregation:'sum'  }},
        { id:'r3-kpi2', type:'kpi',       x:3,  y:0,  w:3,h:2, config:{ title:'Total SKUs',            datasetId:inventory, yField:'StockQty',       aggregation:'count'}},
        { id:'r3-kpi3', type:'kpi',       x:6,  y:0,  w:3,h:2, config:{ title:'Avg Stock Qty',         datasetId:inventory, yField:'StockQty',       aggregation:'avg'  }},
        { id:'r3-kpi4', type:'kpi',       x:9,  y:0,  w:3,h:2, config:{ title:'Product Lines',         datasetId:products,  yField:'ListPrice',      aggregation:'count'}},
        // Row 2 — Bar inventory + Gauge + Line KPI trend
        { id:'r3-bar',  type:'bar',       x:0,  y:2,  w:5,h:4, config:{ title:'Stock by Category',       datasetId:inventory, xField:'Category',   yField:'StockQty',       aggregation:'sum' }},
        { id:'r3-gaug', type:'gauge',     x:5,  y:2,  w:3,h:4, config:{ title:'Avg CSAT Gauge',          datasetId:heatmap,   yField:'CSAT',        aggregation:'avg'  }},
        { id:'r3-line', type:'line',      x:8,  y:2,  w:4,h:4, config:{ title:'KPI Actual vs Target',    datasetId:kpi,       xField:'Month',       yField:'Actual',         aggregation:'sum' }},
        // Row 3 — Treemap inventory + Waterfall product margin + Scatter cost vs margin
        { id:'r3-tree', type:'treemap',   x:0,  y:6,  w:4,h:4, config:{ title:'Inventory Value Treemap', datasetId:inventory, xField:'Category',   yField:'InventoryValue', aggregation:'sum' }},
        { id:'r3-wfal', type:'waterfall', x:4,  y:6,  w:4,h:4, config:{ title:'Monthly KPI Variance',    datasetId:kpi,       xField:'Department', yField:'Variance',       aggregation:'sum' }},
        { id:'r3-scat', type:'scatter',   x:8,  y:6,  w:4,h:4, config:{ title:'Unit Cost vs Margin',     datasetId:products,  xField:'UnitCost',   yField:'Margin' }},
        // Row 4 — Decomp tree + Histogram + BoxPlot
        { id:'r3-deco', type:'decomptree',x:0,  y:10, w:5,h:4, config:{ title:'Revenue Decomposition',   datasetId:inventory, xField:'Category',   valueField:'InventoryValue' }},
        { id:'r3-hist', type:'histogram', x:5,  y:10, w:4,h:4, config:{ title:'Unit Cost Distribution',  datasetId:products,  yField:'UnitCost' }},
        { id:'r3-box',  type:'boxplot',   x:9,  y:10, w:3,h:4, config:{ title:'Stock Spread by Category',datasetId:inventory, xField:'Category',   yField:'StockQty' }},
        // Row 5 — Map + CardTrend + Area + Smart Narrative
        { id:'r3-map',  type:'map',       x:0,  y:14, w:4,h:4, config:{ title:'Sales by Country (Map)',  datasetId:customers, xField:'Country',    yField:'AnnualValue', aggregation:'sum' }},
        { id:'r3-crd',  type:'cardtrend', x:4,  y:14, w:4,h:4, config:{ title:'Daily Orders Trend Card', datasetId:timeSeries,xField:'Date',       yField:'Orders', aggregation:'sum' }},
        { id:'r3-area', type:'area',      x:8,  y:14, w:4,h:4, config:{ title:'Ad Spend Area',           datasetId:timeSeries,xField:'Date',       yField:'AdSpend', aggregation:'sum' }},
        // Row 6 — Combo + Table + Narrative
        { id:'r3-cmbo', type:'combo',     x:0,  y:18, w:6,h:4, config:{ title:'Revenue & Orders Combo',  datasetId:timeSeries,xField:'Month',      yField:'Revenue', aggregation:'sum' }},
        { id:'r3-narr', type:'smartnarrative',x:6,y:18,w:3,h:4,config:{ title:'AI Operations Summary',   datasetId:kpi,       yField:'Actual', aggregation:'sum' }},
        { id:'r3-tbl',  type:'table',     x:9,  y:18, w:3,h:4, config:{ title:'KPI Table',               datasetId:kpi }},
        // Row 7 — full-width product table
        { id:'r3-ptbl', type:'table',     x:0,  y:22, w:12,h:5,config:{ title:'Full Product Catalog',    datasetId:products }},
      ],
    },

    // ═══════════════════════════════════════════════════════
    // REPORT 4 — All Visualizations Showcase (every chart type, multiple datasets)
    // ═══════════════════════════════════════════════════════
    {
      name: '🎨 All Visualizations Showcase',
      description: 'Every visualization type in one dashboard, sourced from all 8 datasets',
      widgets: [
        // Row 1 — KPI / Number cards (4 datasets)
        { id:'all-kpi1', type:'kpi',          x:0, y:0,  w:3,h:2, config:{ title:'Total Revenue',     datasetId:sales,     yField:'Revenue',        aggregation:'sum'   }},
        { id:'all-num',  type:'number',       x:3, y:0,  w:3,h:2, config:{ title:'Total Orders',      datasetId:timeSeries,yField:'Orders',         aggregation:'sum'   }},
        { id:'all-kpi2', type:'kpi',          x:6, y:0,  w:3,h:2, config:{ title:'Total Ad Spend',    datasetId:marketing, yField:'AdSpend',        aggregation:'sum'   }},
        { id:'all-kpi3', type:'kpi',          x:9, y:0,  w:3,h:2, config:{ title:'Inventory Value',   datasetId:inventory, yField:'InventoryValue', aggregation:'sum'   }},

        // Row 2 — Bar / Line / Area
        { id:'all-bar',  type:'bar',          x:0, y:2,  w:4,h:4, config:{ title:'Revenue by Region',     datasetId:sales,      xField:'Region',   yField:'Revenue',  aggregation:'sum' }},
        { id:'all-line', type:'line',         x:4, y:2,  w:4,h:4, config:{ title:'Daily Revenue Trend',   datasetId:timeSeries, xField:'Date',     yField:'Revenue',  aggregation:'sum' }},
        { id:'all-area', type:'area',         x:8, y:2,  w:4,h:4, config:{ title:'Monthly Orders Area',   datasetId:timeSeries, xField:'Month',    yField:'Orders',   aggregation:'sum' }},

        // Row 3 — Pie / Donut / Scatter
        { id:'all-pie',  type:'pie',          x:0, y:6,  w:4,h:4, config:{ title:'Revenue by Category',   datasetId:sales,     xField:'Category', yField:'Revenue',     aggregation:'sum' }},
        { id:'all-dnut', type:'donut',        x:4, y:6,  w:4,h:4, config:{ title:'Customers by Segment',  datasetId:customers, xField:'Segment',  yField:'AnnualValue', aggregation:'sum' }},
        { id:'all-scat', type:'scatter',      x:8, y:6,  w:4,h:4, config:{ title:'Unit Cost vs Margin',   datasetId:products,  xField:'UnitCost', yField:'Margin' }},

        // Row 4 — Gauge / Waterfall / Combo
        { id:'all-gaug', type:'gauge',        x:0, y:10, w:4,h:4, config:{ title:'Avg CSAT Gauge',        datasetId:heatmap,   yField:'CSAT',       aggregation:'avg' }},
        { id:'all-wfal', type:'waterfall',    x:4, y:10, w:4,h:4, config:{ title:'KPI Variance Waterfall',datasetId:kpi,       xField:'Department', yField:'Variance', aggregation:'sum' }},
        { id:'all-cmbo', type:'combo',        x:8, y:10, w:4,h:4, config:{ title:'Revenue & Cumulative',  datasetId:timeSeries,xField:'Month',      yField:'Revenue',  aggregation:'sum' }},

        // Row 5 — Treemap / Funnel / Heatmap
        { id:'all-tree', type:'treemap',      x:0, y:14, w:4,h:5, config:{ title:'Inventory Treemap',     datasetId:inventory, xField:'Category', yField:'InventoryValue', aggregation:'sum' }},
        { id:'all-funl', type:'funnel',       x:4, y:14, w:4,h:5, config:{ title:'Conversion Funnel',     datasetId:marketing, xField:'Channel',  yField:'Conversions',    aggregation:'sum' }},
        { id:'all-heat', type:'heatmap',      x:8, y:14, w:4,h:5, config:{ title:'Tickets Day × Hour',    datasetId:heatmap,   xField:'DayOfWeek', groupField:'Hour', valueField:'Tickets', aggregation:'sum' }},

        // Row 6 — Histogram / BoxPlot / CardTrend
        { id:'all-hist', type:'histogram',    x:0, y:19, w:4,h:4, config:{ title:'ROAS Distribution',     datasetId:marketing, yField:'ROAS' }},
        { id:'all-box',  type:'boxplot',      x:4, y:19, w:4,h:4, config:{ title:'Stock Spread by Category', datasetId:inventory, xField:'Category', yField:'StockQty' }},
        { id:'all-card', type:'cardtrend',    x:8, y:19, w:4,h:4, config:{ title:'Revenue Trend Card',    datasetId:timeSeries,xField:'Date',     yField:'Revenue',  aggregation:'sum' }},

        // Row 7 — Matrix / Decomposition Tree / Smart Narrative
        { id:'all-mtrx', type:'matrix',       x:0, y:23, w:5,h:4, config:{ title:'Channel × Month Matrix',datasetId:marketing, xField:'Channel',  groupField:'Month', valueField:'Revenue' }},
        { id:'all-deco', type:'decomptree',   x:5, y:23, w:4,h:4, config:{ title:'Revenue Decomposition', datasetId:sales,     valueField:'Revenue', breakdownFields:['Region','Category'] }},
        { id:'all-narr', type:'smartnarrative',x:9,y:23, w:3,h:4, config:{ title:'AI Insights',           datasetId:sales,     yField:'Revenue',  aggregation:'sum' }},

        // Row 8 — Map / Slicer / DateRange
        { id:'all-map',  type:'map',          x:0, y:27, w:6,h:4, config:{ title:'Revenue by Country (Map)', datasetId:customers, xField:'Country', yField:'AnnualValue', aggregation:'sum' }},
        { id:'all-slcr', type:'slicer',       x:6, y:27, w:3,h:4, config:{ title:'Category Filter',       datasetId:sales,     xField:'Category' }},
        { id:'all-dtrg', type:'daterange',    x:9, y:27, w:3,h:4, config:{ title:'Date Filter',           datasetId:timeSeries,xField:'Date' }},

        // Row 9 — full-width Table
        { id:'all-tbl',  type:'table',        x:0, y:31, w:12,h:5,config:{ title:'Full Sales Transactions', datasetId:sales }},
      ],
    },
  ];
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱  InsightBI — Comprehensive Demo Seed');

  const demo = await prisma.user.findUnique({ where: { email: 'demo@insightbi.com' } });
  if (!demo) { console.error('demo@insightbi.com not found — run the main seed first (npx prisma db seed).'); process.exit(1); }

  // Remove demo user from any workspace they don't own (e.g. admin's Demo Workspace)
  await prisma.workspaceMember.deleteMany({
    where: {
      userId: demo.id,
      workspace: { ownerId: { not: demo.id } },
    },
  });

  // Delete any previous showcase workspace and start fresh
  await prisma.workspace.deleteMany({ where: { ownerId: demo.id } });

  const ws = await prisma.workspace.create({
    data: {
      name: 'InsightBI Showcase',
      description: 'Full feature demo workspace',
      ownerId: demo.id,
      members: { create: { userId: demo.id, role: 'OWNER' } },
    },
  });
  console.log(`\n📁  Workspace: "${ws.name}" (${ws.id.slice(0,8)}…)`);

  // Datasets
  console.log('\n📊  Uploading 8 datasets…');
  const sales      = await upsertDataset(ws.id, 'Sales Transactions',    genSales()      as Record<string,unknown>[]);
  const customers  = await upsertDataset(ws.id, 'Customer Master',       genCustomers()  as Record<string,unknown>[]);
  const products   = await upsertDataset(ws.id, 'Product Catalog',       genProducts()   as Record<string,unknown>[]);
  const timeSeries = await upsertDataset(ws.id, 'Daily Revenue Series',  genTimeSeries() as Record<string,unknown>[]);
  const heatmap    = await upsertDataset(ws.id, 'Support Heatmap',       genHeatmap()    as Record<string,unknown>[]);
  const marketing  = await upsertDataset(ws.id, 'Marketing Campaigns',   genMarketing()  as Record<string,unknown>[]);
  const inventory  = await upsertDataset(ws.id, 'Inventory',             genInventory()  as Record<string,unknown>[]);
  const kpi        = await upsertDataset(ws.id, 'KPI Targets',           genKPI()        as Record<string,unknown>[]);

  const totalRows = [sales,customers,products,timeSeries,heatmap,marketing,inventory,kpi]
    .reduce((s,d) => s + d.rowCount, 0);
  console.log(`\n   Total rows: ${totalRows.toLocaleString()}`);

  // Relationships
  console.log('\n🔗  Creating 4 data relationships…');
  await prisma.dataRelationship.deleteMany({ where: { sourceDataset: { workspaceId: ws.id } } });
  await prisma.dataRelationship.createMany({
    data: [
      { sourceDatasetId: sales.id,     targetDatasetId: customers.id, sourceColumn: 'CustomerID', targetColumn: 'CustomerID', relationshipType: 'many-to-one'  },
      { sourceDatasetId: sales.id,     targetDatasetId: products.id,  sourceColumn: 'ProductID',  targetColumn: 'ProductID',  relationshipType: 'many-to-one'  },
      { sourceDatasetId: inventory.id, targetDatasetId: products.id,  sourceColumn: 'ProductID',  targetColumn: 'ProductID',  relationshipType: 'many-to-one'  },
      { sourceDatasetId: marketing.id, targetDatasetId: timeSeries.id,sourceColumn: 'Month',      targetColumn: 'Month',      relationshipType: 'many-to-many' },
    ],
  });
  console.log('   ✓ Sales → Customer Master  (CustomerID, many-to-one)');
  console.log('   ✓ Sales → Product Catalog  (ProductID,  many-to-one)');
  console.log('   ✓ Inventory → Products     (ProductID,  many-to-one)');
  console.log('   ✓ Marketing → Time Series  (Month,      many-to-many)');

  // Reports
  console.log('\n📋  Building 3 showcase reports…');
  const dsIds = {
    sales: sales.id, customers: customers.id, products: products.id,
    timeSeries: timeSeries.id, heatmap: heatmap.id,
    marketing: marketing.id, inventory: inventory.id, kpi: kpi.id,
  };
  const reports = buildReports(dsIds);
  let totalWidgets = 0;
  for (const r of reports) {
    await prisma.report.deleteMany({ where: { workspaceId: ws.id, name: r.name } });
    await prisma.report.create({
      data: {
        workspaceId: ws.id,
        createdById: demo.id,
        name: r.name,
        description: r.description,
        layoutJson: JSON.stringify({ widgets: r.widgets }),
        configJson: JSON.stringify({ theme: 'light', refreshInterval: 0, globalFilters: [] }),
      },
    });
    totalWidgets += r.widgets.length;
    console.log(`   ✓ "${r.name}" — ${r.widgets.length} widgets`);
  }

  // Build SQL query tables so fast SQL engine is used instead of slow in-memory fallback
  console.log('\n⚡  Building SQL query tables for fast aggregation…');
  const { createOrUpdateQueryTable } = await import('../services/sqlQueryService');
  const allDatasets = [sales, customers, products, timeSeries, heatmap, marketing, inventory, kpi];
  for (const ds of allDatasets) {
    const dbRows = await prisma.datasetRow.findMany({ where: { datasetId: ds.id }, orderBy: { rowIndex: 'asc' }, select: { rowJson: true } });
    const rows = dbRows.map(r => { try { return JSON.parse(r.rowJson as string); } catch { return {}; } });
    const schema = inferSchema(rows);
    await createOrUpdateQueryTable(ds.id, rows, schema);
    process.stdout.write('.');
  }
  console.log(' done');

  console.log('\n✅  Workspace 1 seed complete!');

  // ════════════════════════════════════════════════════════════════
  // WORKSPACE 2 — Analytics Hub
  // ════════════════════════════════════════════════════════════════
  console.log('\n\n🌐  Building Workspace 2: Analytics Hub…');

  const ws2 = await prisma.workspace.create({
    data: {
      name: 'Analytics Hub',
      description: 'HR, Finance, E-commerce, and Digital performance dashboards',
      ownerId: demo.id,
      members: { create: { userId: demo.id, role: 'OWNER' } },
    },
  });
  console.log(`\n📁  Workspace: "${ws2.name}" (${ws2.id.slice(0,8)}…)`);

  console.log('\n📊  Uploading 5 datasets…');
  _seed = 99; // shift RNG so data differs from workspace 1
  const employees    = await upsertDataset(ws2.id, 'HR Employees',       genEmployees()   as Record<string,unknown>[]);
  const financial    = await upsertDataset(ws2.id, 'Financial Ledger',   genFinancial()   as Record<string,unknown>[]);
  const ecom         = await upsertDataset(ws2.id, 'E-commerce Orders',  genEcomOrders()  as Record<string,unknown>[]);
  const webAnalytics = await upsertDataset(ws2.id, 'Web Analytics',      genWebAnalytics()as Record<string,unknown>[]);
  const projects     = await upsertDataset(ws2.id, 'Project Tracker',    genProjects()    as Record<string,unknown>[]);

  const ws2TotalRows = [employees, financial, ecom, webAnalytics, projects].reduce((s,d) => s + d.rowCount, 0);
  console.log(`\n   Total rows: ${ws2TotalRows.toLocaleString()}`);

  console.log('\n🔗  Creating 3 data relationships…');
  await prisma.dataRelationship.deleteMany({ where: { sourceDataset: { workspaceId: ws2.id } } });
  await prisma.dataRelationship.createMany({
    data: [
      { sourceDatasetId: ecom.id,      targetDatasetId: webAnalytics.id, sourceColumn: 'Date',       targetColumn: 'Date',       relationshipType: 'many-to-one'  },
      { sourceDatasetId: employees.id, targetDatasetId: projects.id,     sourceColumn: 'Department', targetColumn: 'Department', relationshipType: 'one-to-many'  },
      { sourceDatasetId: financial.id, targetDatasetId: employees.id,    sourceColumn: 'Department', targetColumn: 'Department', relationshipType: 'many-to-one'  },
    ],
  });
  console.log('   ✓ E-commerce ↔ Web Analytics  (Date, many-to-one)');
  console.log('   ✓ HR Employees → Projects      (Department, one-to-many)');
  console.log('   ✓ Financial Ledger → HR        (Department, many-to-one)');

  console.log('\n📋  Building 4 showcase reports…');
  const hub4 = buildHub4Reports({
    employees: employees.id, financial: financial.id,
    ecom: ecom.id, webAnalytics: webAnalytics.id, projects: projects.id,
  });
  let hub4Widgets = 0;
  for (const r of hub4) {
    await prisma.report.deleteMany({ where: { workspaceId: ws2.id, name: r.name } });
    await prisma.report.create({
      data: {
        workspaceId: ws2.id,
        createdById: demo.id,
        name: r.name,
        description: r.description,
        layoutJson: JSON.stringify({ widgets: r.widgets }),
        configJson: JSON.stringify({ theme: 'light', refreshInterval: 0, globalFilters: [] }),
      },
    });
    hub4Widgets += r.widgets.length;
    console.log(`   ✓ "${r.name}" — ${r.widgets.length} widgets`);
  }

  console.log('\n⚡  Building SQL query tables for Workspace 2…');
  const allDs2 = [employees, financial, ecom, webAnalytics, projects];
  for (const ds of allDs2) {
    const dbRows = await prisma.datasetRow.findMany({ where: { datasetId: ds.id }, orderBy: { rowIndex: 'asc' }, select: { rowJson: true } });
    const rows = dbRows.map(r => { try { return JSON.parse(r.rowJson as string); } catch { return {}; } });
    const schema = inferSchema(rows);
    await createOrUpdateQueryTable(ds.id, rows, schema);
    process.stdout.write('.');
  }
  console.log(' done');

  console.log('\n✅  ALL SEEDS COMPLETE!');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`   Login           : demo@insightbi.com / Demo@123456`);
  console.log(`   Workspace 1     : ${ws.name}  — 3 reports, 8 datasets, 4 relationships`);
  console.log(`   Workspace 2     : ${ws2.name} — 4 reports, 5 datasets, 3 relationships`);
  console.log(`   Total datasets  : 13  (${(totalRows + ws2TotalRows).toLocaleString()} total rows)`);
  console.log(`   Total reports   : ${reports.length + hub4.length}  (${totalWidgets + hub4Widgets} widgets)`);
  console.log('══════════════════════════════════════════════════════════');
}

main().catch(console.error).finally(() => prisma.$disconnect());

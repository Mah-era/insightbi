import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const salesData = [
  { Month: 'Jan', Region: 'North', Product: 'Widget A', Sales: 12500, Revenue: 37500, Units: 250, Profit: 8750 },
  { Month: 'Jan', Region: 'South', Product: 'Widget B', Sales: 9800, Revenue: 24500, Units: 196, Profit: 5880 },
  { Month: 'Jan', Region: 'East', Product: 'Widget C', Sales: 15200, Revenue: 45600, Units: 304, Profit: 12160 },
  { Month: 'Feb', Region: 'North', Product: 'Widget A', Sales: 13800, Revenue: 41400, Units: 276, Profit: 9660 },
  { Month: 'Feb', Region: 'South', Product: 'Widget B', Sales: 11200, Revenue: 28000, Units: 224, Profit: 6720 },
  { Month: 'Feb', Region: 'East', Product: 'Widget C', Sales: 14600, Revenue: 43800, Units: 292, Profit: 11680 },
  { Month: 'Mar', Region: 'North', Product: 'Widget A', Sales: 16500, Revenue: 49500, Units: 330, Profit: 13200 },
  { Month: 'Mar', Region: 'South', Product: 'Widget B', Sales: 12900, Revenue: 32250, Units: 258, Profit: 9030 },
  { Month: 'Mar', Region: 'East', Product: 'Widget C', Sales: 17800, Revenue: 53400, Units: 356, Profit: 14240 },
  { Month: 'Apr', Region: 'North', Product: 'Widget A', Sales: 14200, Revenue: 42600, Units: 284, Profit: 9940 },
  { Month: 'Apr', Region: 'South', Product: 'Widget B', Sales: 10500, Revenue: 26250, Units: 210, Profit: 7350 },
  { Month: 'Apr', Region: 'West', Product: 'Widget D', Sales: 18900, Revenue: 56700, Units: 378, Profit: 15120 },
  { Month: 'May', Region: 'North', Product: 'Widget A', Sales: 19200, Revenue: 57600, Units: 384, Profit: 15360 },
  { Month: 'May', Region: 'South', Product: 'Widget B', Sales: 13400, Revenue: 33500, Units: 268, Profit: 9380 },
  { Month: 'May', Region: 'West', Product: 'Widget D', Sales: 21500, Revenue: 64500, Units: 430, Profit: 18275 },
  { Month: 'Jun', Region: 'East', Product: 'Widget C', Sales: 20100, Revenue: 60300, Units: 402, Profit: 17085 },
  { Month: 'Jun', Region: 'West', Product: 'Widget D', Sales: 16800, Revenue: 50400, Units: 336, Profit: 14280 },
  { Month: 'Jun', Region: 'North', Product: 'Widget A', Sales: 22300, Revenue: 66900, Units: 446, Profit: 18955 },
];

const customerData = [
  { CustomerID: 'C001', Name: 'Acme Corp', Industry: 'Technology', Country: 'USA', Revenue: 250000, Tier: 'Enterprise' },
  { CustomerID: 'C002', Name: 'Global Foods', Industry: 'Retail', Country: 'UK', Revenue: 125000, Tier: 'Mid-Market' },
  { CustomerID: 'C003', Name: 'Tech Solutions', Industry: 'Technology', Country: 'Canada', Revenue: 89000, Tier: 'SMB' },
  { CustomerID: 'C004', Name: 'BuildRight Inc', Industry: 'Construction', Country: 'USA', Revenue: 310000, Tier: 'Enterprise' },
  { CustomerID: 'C005', Name: 'MediCare Plus', Industry: 'Healthcare', Country: 'Germany', Revenue: 175000, Tier: 'Mid-Market' },
  { CustomerID: 'C006', Name: 'FastLogistics', Industry: 'Logistics', Country: 'France', Revenue: 92000, Tier: 'SMB' },
  { CustomerID: 'C007', Name: 'DataSystems', Industry: 'Technology', Country: 'USA', Revenue: 420000, Tier: 'Enterprise' },
  { CustomerID: 'C008', Name: 'GreenEnergy', Industry: 'Energy', Country: 'Netherlands', Revenue: 285000, Tier: 'Enterprise' },
];

async function main() {
  console.log('Seeding database...');

  const adminHash = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@insightbi.com' },
    update: {},
    create: { name: 'Admin User', email: 'admin@insightbi.com', passwordHash: adminHash, role: 'ADMIN' },
  });

  const demoHash = await bcrypt.hash('Demo@123456', 12);
  const demo = await prisma.user.upsert({
    where: { email: 'demo@insightbi.com' },
    update: {},
    create: { name: 'Demo User', email: 'demo@insightbi.com', passwordHash: demoHash, role: 'EDITOR' },
  });

  // Create workspace
  let workspace = await prisma.workspace.findFirst({ where: { ownerId: admin.id } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'Demo Workspace',
        description: 'Pre-loaded workspace with sample data',
        ownerId: admin.id,
      },
    });
    await prisma.workspaceMember.createMany({
      data: [
        { workspaceId: workspace.id, userId: admin.id, role: 'OWNER' },
        { workspaceId: workspace.id, userId: demo.id, role: 'EDITOR' },
      ],
    });
  }

  // Sales dataset
  let salesDataset = await prisma.dataset.findFirst({ where: { workspaceId: workspace.id, name: 'Sales Data' } });
  if (!salesDataset) {
    salesDataset = await prisma.dataset.create({
      data: {
        workspaceId: workspace.id,
        name: 'Sales Data',
        fileName: 'sales_data.csv',
        fileType: 'text/csv',
        filePath: '/seed/sales_data.csv',
        rowCount: salesData.length,
        columnCount: 7,
        schemaJson: JSON.stringify([
          { name: 'Month', type: 'text', nullable: false },
          { name: 'Region', type: 'text', nullable: false },
          { name: 'Product', type: 'text', nullable: false },
          { name: 'Sales', type: 'number', nullable: false },
          { name: 'Revenue', type: 'number', nullable: false },
          { name: 'Units', type: 'number', nullable: false },
          { name: 'Profit', type: 'number', nullable: false },
        ]),
      },
    });
    await prisma.datasetRow.createMany({
      data: salesData.map((row, i) => ({ datasetId: salesDataset!.id, rowIndex: i, rowJson: JSON.stringify(row) })),
    });
  }

  // Customer dataset
  let customerDataset = await prisma.dataset.findFirst({ where: { workspaceId: workspace.id, name: 'Customer Data' } });
  if (!customerDataset) {
    customerDataset = await prisma.dataset.create({
      data: {
        workspaceId: workspace.id,
        name: 'Customer Data',
        fileName: 'customers.csv',
        fileType: 'text/csv',
        filePath: '/seed/customers.csv',
        rowCount: customerData.length,
        columnCount: 6,
        schemaJson: JSON.stringify([
          { name: 'CustomerID', type: 'text', nullable: false },
          { name: 'Name', type: 'text', nullable: false },
          { name: 'Industry', type: 'text', nullable: false },
          { name: 'Country', type: 'text', nullable: false },
          { name: 'Revenue', type: 'number', nullable: false },
          { name: 'Tier', type: 'text', nullable: false },
        ]),
      },
    });
    await prisma.datasetRow.createMany({
      data: customerData.map((row, i) => ({ datasetId: customerDataset!.id, rowIndex: i, rowJson: JSON.stringify(row) })),
    });
  }

  // Demo report
  let report = await prisma.report.findFirst({ where: { workspaceId: workspace.id } });
  if (!report) {
    report = await prisma.report.create({
      data: {
        workspaceId: workspace.id,
        name: 'Sales Performance Overview',
        description: 'Monthly sales performance with regional breakdown',
        createdById: admin.id,
        layoutJson: JSON.stringify({
          widgets: [
            { id: 'w1', type: 'kpi', x: 0, y: 0, w: 3, h: 2, config: { title: 'Total Revenue', datasetId: salesDataset.id, valueField: 'Revenue', aggregation: 'sum', format: 'currency' } },
            { id: 'w2', type: 'kpi', x: 3, y: 0, w: 3, h: 2, config: { title: 'Total Sales', datasetId: salesDataset.id, valueField: 'Sales', aggregation: 'sum', format: 'currency' } },
            { id: 'w3', type: 'kpi', x: 6, y: 0, w: 3, h: 2, config: { title: 'Total Units', datasetId: salesDataset.id, valueField: 'Units', aggregation: 'sum', format: 'number' } },
            { id: 'w4', type: 'kpi', x: 9, y: 0, w: 3, h: 2, config: { title: 'Total Profit', datasetId: salesDataset.id, valueField: 'Profit', aggregation: 'sum', format: 'currency' } },
            { id: 'w5', type: 'bar', x: 0, y: 2, w: 6, h: 4, config: { title: 'Revenue by Region', datasetId: salesDataset.id, xField: 'Region', yField: 'Revenue', aggregation: 'sum' } },
            { id: 'w6', type: 'line', x: 6, y: 2, w: 6, h: 4, config: { title: 'Sales Trend by Month', datasetId: salesDataset.id, xField: 'Month', yField: 'Sales', aggregation: 'sum' } },
            { id: 'w7', type: 'pie', x: 0, y: 6, w: 4, h: 4, config: { title: 'Sales by Product', datasetId: salesDataset.id, groupField: 'Product', valueField: 'Sales', aggregation: 'sum' } },
            { id: 'w8', type: 'table', x: 4, y: 6, w: 8, h: 4, config: { title: 'Sales Details', datasetId: salesDataset.id, columns: ['Month', 'Region', 'Product', 'Sales', 'Revenue', 'Profit'] } },
          ],
        }),
        configJson: JSON.stringify({ theme: 'light', refreshInterval: 0, globalFilters: [] }),
      },
    });
  }

  await prisma.activityLog.createMany({
    data: [
      { userId: admin.id, workspaceId: workspace.id, action: 'USER_REGISTERED', metadataJson: JSON.stringify({ email: admin.email }) },
      { userId: admin.id, workspaceId: workspace.id, action: 'DATASET_UPLOADED', metadataJson: JSON.stringify({ name: 'Sales Data' }) },
      { userId: admin.id, workspaceId: workspace.id, action: 'REPORT_CREATED', metadataJson: JSON.stringify({ name: 'Sales Performance Overview' }) },
    ],
  });

  console.log('✅ Seed complete!');
  console.log('Admin: admin@insightbi.com / Admin@123456');
  console.log('Demo:  demo@insightbi.com  / Demo@123456');
}

main().catch(console.error).finally(() => prisma.$disconnect());

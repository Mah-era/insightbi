export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  avatarUrl?: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  owner?: Pick<User, 'id' | 'name' | 'email'>;
  memberRole?: string;
  createdAt: string;
  _count?: { datasets: number; reports: number; members: number };
}

export interface ColumnSchema {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  nullable: boolean;
  sampleValues?: unknown[];
}

export interface Dataset {
  id: string;
  workspaceId: string;
  name: string;
  fileName: string;
  fileType: string;
  rowCount: number;
  columnCount: number;
  schemaJson: ColumnSchema[];
  createdAt: string;
  updatedAt: string;
}

export interface TransformStep {
  id: string;
  type: string;
  column?: string;
  newName?: string;
  value?: unknown;
  operator?: string;
  direction?: 'asc' | 'desc';
  columns?: string[];
  caseType?: 'upper' | 'lower' | 'title';
  expression?: string;
  targetType?: string;
  label: string;
}

export type ChartType = 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter' | 'kpi' | 'number' | 'table' | 'matrix' | 'slicer' | 'daterange' | 'gauge' | 'combo' | 'waterfall' | 'treemap' | 'smartnarrative' | 'cardtrend' | 'histogram' | 'boxplot' | 'map' | 'decomptree' | 'funnel' | 'heatmap';

export interface WidgetConfig {
  title?: string;
  subtitle?: string;
  datasetId?: string;
  xField?: string;
  yField?: string;
  barField?: string;
  lineField?: string;
  groupField?: string;
  valueField?: string;
  categoryField?: string;
  comparisonField?: string;
  rowFields?: string[];
  columnField?: string;
  binCount?: number;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  columns?: string[];
  measure?: string;
  format?: 'number' | 'currency' | 'percent';
  colors?: string[];
  showLegend?: boolean;
  showDataLabels?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  filters?: Array<{ field: string; operator: string; value: unknown }>;
  interactionMode?: 'filter' | 'highlight' | 'none';
  // Map visual
  latField?: string;
  lngField?: string;
  locationField?: string;
  // Decomposition Tree
  metricField?: string;
  breakdownFields?: string[];
  maxNodes?: number;
  // Drill-down
  drillFields?: string[];
}

// Phase 9 - Filters & Cross-filtering
export interface FilterSpec {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'between' | 'blank' | 'notblank';
  value?: unknown;
  value2?: unknown;
}

// Phase 10 - Bookmarks
export interface Bookmark {
  id: string;
  name: string;
  reportFilters: FilterSpec[];
  crossFilters: Record<string, { field: string; value: unknown }[]>;
  createdAt: string;
}

// Phase 5 - Measures
export interface Measure {
  id: string;
  workspaceId: string;
  datasetId?: string | null;
  name: string;
  expression: string;
  format: string;
  description?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

// Phase 8 - Embed
export interface EmbedToken {
  id: string;
  reportId: string;
  token: string;
  expiresAt?: string | null;
  allowedOrigin?: string | null;
  createdById: string;
  createdAt: string;
  revokedAt?: string | null;
}

// Phase 12 - Connections
export interface DataConnection {
  id: string;
  workspaceId: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'rest';
  configJson: Record<string, unknown>;
  mode: 'IMPORT' | 'DIRECT_QUERY';
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

// Phase 3 - Semantic Model
export interface SemanticField {
  ref: string;
  datasetId: string;
  datasetName: string;
  columnName: string;
  displayName: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  isMeasure: false;
}

export interface SemanticMeasure {
  ref: string;
  id: string;
  name: string;
  expression: string;
  format: string;
  datasetId: string | null;
  isMeasure: true;
}

export interface SemanticModel {
  workspaceId: string;
  datasets: { id: string; name: string; fields: SemanticField[] }[];
  measures: SemanticMeasure[];
  relationships: Relationship[];
}

export interface Widget {
  id: string;
  type: ChartType;
  x: number;
  y: number;
  w: number;
  h: number;
  config: WidgetConfig;
}

export interface ReportLayout {
  widgets: Widget[];
}

export interface ReportConfig {
  theme: 'light' | 'dark';
  refreshInterval: number;
  globalFilters: Array<{ field: string; value: unknown }>;
}

export interface Report {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  layoutJson: ReportLayout;
  configJson: ReportConfig;
  thumbnail?: string;
  createdById: string;
  createdBy?: Pick<User, 'id' | 'name' | 'email'>;
  createdAt: string;
  updatedAt: string;
}

export interface ShareLink {
  id: string;
  reportId: string;
  token: string;
  permission: 'VIEW' | 'EDIT';
  isActive: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  workspaceId?: string;
  action: string;
  metadataJson: Record<string, unknown>;
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'email'>;
  workspace?: Pick<Workspace, 'id' | 'name'>;
}

export interface AggregatedResult {
  label: string;
  value: number;
  count: number;
}

export interface Relationship {
  id: string;
  sourceDatasetId: string;
  targetDatasetId: string;
  sourceColumn: string;
  targetColumn: string;
  relationshipType: string;
  sourceDataset?: { id: string; name: string };
  targetDataset?: { id: string; name: string };
}

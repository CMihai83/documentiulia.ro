import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type ChartCategory = 'comparison' | 'distribution' | 'trend' | 'composition' | 'relationship' | 'geographic';

export interface ChartDefinition {
  id: string;
  name: string;
  category: ChartCategory;
  type: string;
  description: string;
  supportedDataTypes: string[];
  requiredDimensions: number;
  maxDimensions?: number;
  requiredMeasures: number;
  maxMeasures?: number;
  defaultConfig: Record<string, any>;
}

export interface VisualizationDataset {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  source: DatasetSource;
  schema: DatasetSchema;
  refreshConfig?: RefreshConfig;
  cachedData?: any[];
  lastRefreshed?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatasetSource {
  type: 'query' | 'api' | 'file' | 'realtime';
  query?: string;
  endpoint?: string;
  filePath?: string;
  streamConfig?: Record<string, any>;
}

export interface DatasetSchema {
  fields: SchemaField[];
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'array';
  label?: string;
  format?: string;
  aggregatable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
}

export interface RefreshConfig {
  auto: boolean;
  interval?: number; // minutes
  cron?: string;
  onDemand?: boolean;
}

export interface Visualization {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  chartType: string;
  datasetId: string;
  config: VisualizationConfig;
  styling: VisualizationStyling;
  interactions: InteractionConfig;
  annotations?: Annotation[];
  isPublic?: boolean;
  publicToken?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VisualizationConfig {
  dimensions: DimensionConfig[];
  measures: MeasureConfig[];
  filters?: FilterConfig[];
  sorting?: SortConfig[];
  limit?: number;
  grouping?: GroupingConfig;
  pivotConfig?: PivotConfig;
}

export interface DimensionConfig {
  field: string;
  label?: string;
  sort?: 'asc' | 'desc' | 'none';
  format?: string;
  granularity?: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  binning?: BinningConfig;
}

export interface MeasureConfig {
  field: string;
  label?: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median' | 'stddev' | 'variance' | 'distinct';
  format?: FormatOptions;
  color?: string;
  stack?: string;
  yAxis?: 'left' | 'right';
}

export interface FormatOptions {
  type: 'number' | 'currency' | 'percent' | 'compact' | 'custom';
  decimals?: number;
  currency?: string;
  prefix?: string;
  suffix?: string;
  pattern?: string;
}

export interface FilterConfig {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'between' | 'contains' | 'startsWith' | 'endsWith' | 'isNull' | 'isNotNull';
  value: any;
  and?: FilterConfig[];
  or?: FilterConfig[];
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface GroupingConfig {
  fields: string[];
  totals?: boolean;
  subtotals?: boolean;
}

export interface PivotConfig {
  rows: string[];
  columns: string[];
  values: MeasureConfig[];
  showRowTotals?: boolean;
  showColumnTotals?: boolean;
}

export interface BinningConfig {
  type: 'auto' | 'fixed' | 'custom';
  count?: number;
  size?: number;
  boundaries?: number[];
}

export interface VisualizationStyling {
  colors?: ColorConfig;
  legend?: LegendConfig;
  axes?: AxesConfig;
  tooltip?: TooltipConfig;
  labels?: LabelConfig;
  grid?: GridConfig;
  animation?: AnimationConfig;
  theme?: string;
}

export interface ColorConfig {
  scheme?: string;
  palette?: string[];
  gradient?: GradientConfig;
  conditionalColors?: ConditionalColor[];
}

export interface GradientConfig {
  type: 'linear' | 'radial';
  stops: { offset: number; color: string }[];
}

export interface ConditionalColor {
  condition: string;
  color: string;
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  orientation?: 'horizontal' | 'vertical';
}

export interface AxesConfig {
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  y2Axis?: AxisConfig;
}

export interface AxisConfig {
  show?: boolean;
  label?: string;
  min?: number | 'auto';
  max?: number | 'auto';
  tickCount?: number;
  tickFormat?: string;
  gridLines?: boolean;
  logarithmic?: boolean;
}

export interface TooltipConfig {
  show: boolean;
  format?: string;
  custom?: boolean;
  template?: string;
}

export interface LabelConfig {
  show: boolean;
  position?: 'inside' | 'outside' | 'auto';
  format?: string;
  rotation?: number;
}

export interface GridConfig {
  show: boolean;
  strokeDasharray?: string;
  color?: string;
}

export interface AnimationConfig {
  enabled: boolean;
  duration?: number;
  easing?: string;
}

export interface InteractionConfig {
  hover?: boolean;
  click?: ClickConfig;
  zoom?: ZoomConfig;
  brush?: BrushConfig;
  drillDown?: DrillDownConfig;
  crossFilter?: CrossFilterConfig;
}

export interface ClickConfig {
  enabled: boolean;
  action?: 'filter' | 'drillDown' | 'navigate' | 'custom';
  target?: string;
}

export interface ZoomConfig {
  enabled: boolean;
  axis?: 'x' | 'y' | 'both';
  minZoom?: number;
  maxZoom?: number;
}

export interface BrushConfig {
  enabled: boolean;
  axis?: 'x' | 'y' | 'both';
}

export interface DrillDownConfig {
  enabled: boolean;
  levels: { field: string; label?: string }[];
}

export interface CrossFilterConfig {
  enabled: boolean;
  targetVisualizations: string[];
}

export interface Annotation {
  id: string;
  type: 'line' | 'area' | 'point' | 'text';
  position: AnnotationPosition;
  style?: Record<string, any>;
  label?: string;
}

export interface AnnotationPosition {
  type: 'value' | 'percent' | 'pixel';
  x?: number;
  y?: number;
  x2?: number;
  y2?: number;
}

export interface ChartRenderOutput {
  chartType: string;
  data: any[];
  options: Record<string, any>;
  dimensions: { width: number; height: number };
}

@Injectable()
export class DataVisualizationService {
  private chartDefinitions: Map<string, ChartDefinition> = new Map();
  private datasets: Map<string, VisualizationDataset> = new Map();
  private visualizations: Map<string, Visualization> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeChartDefinitions();
  }

  private initializeChartDefinitions() {
    const charts: ChartDefinition[] = [
      // Comparison charts
      {
        id: 'bar',
        name: 'Bar Chart',
        category: 'comparison',
        type: 'bar',
        description: 'Compare values across categories',
        supportedDataTypes: ['number'],
        requiredDimensions: 1,
        requiredMeasures: 1,
        maxMeasures: 5,
        defaultConfig: { orientation: 'vertical' },
      },
      {
        id: 'horizontal-bar',
        name: 'Horizontal Bar',
        category: 'comparison',
        type: 'bar',
        description: 'Compare values with horizontal bars',
        supportedDataTypes: ['number'],
        requiredDimensions: 1,
        requiredMeasures: 1,
        defaultConfig: { orientation: 'horizontal' },
      },
      {
        id: 'grouped-bar',
        name: 'Grouped Bar',
        category: 'comparison',
        type: 'bar',
        description: 'Compare grouped values',
        supportedDataTypes: ['number'],
        requiredDimensions: 2,
        requiredMeasures: 1,
        defaultConfig: { grouped: true },
      },
      {
        id: 'stacked-bar',
        name: 'Stacked Bar',
        category: 'comparison',
        type: 'bar',
        description: 'Show composition and comparison',
        supportedDataTypes: ['number'],
        requiredDimensions: 2,
        requiredMeasures: 1,
        defaultConfig: { stacked: true },
      },
      // Distribution charts
      {
        id: 'pie',
        name: 'Pie Chart',
        category: 'distribution',
        type: 'pie',
        description: 'Show part-to-whole relationships',
        supportedDataTypes: ['number'],
        requiredDimensions: 1,
        requiredMeasures: 1,
        maxMeasures: 1,
        defaultConfig: {},
      },
      {
        id: 'donut',
        name: 'Donut Chart',
        category: 'distribution',
        type: 'pie',
        description: 'Pie chart with center cutout',
        supportedDataTypes: ['number'],
        requiredDimensions: 1,
        requiredMeasures: 1,
        defaultConfig: { innerRadius: 0.6 },
      },
      {
        id: 'histogram',
        name: 'Histogram',
        category: 'distribution',
        type: 'histogram',
        description: 'Show frequency distribution',
        supportedDataTypes: ['number'],
        requiredDimensions: 0,
        requiredMeasures: 1,
        defaultConfig: { bins: 10 },
      },
      {
        id: 'boxplot',
        name: 'Box Plot',
        category: 'distribution',
        type: 'boxplot',
        description: 'Show statistical distribution',
        supportedDataTypes: ['number'],
        requiredDimensions: 1,
        requiredMeasures: 1,
        defaultConfig: {},
      },
      // Trend charts
      {
        id: 'line',
        name: 'Line Chart',
        category: 'trend',
        type: 'line',
        description: 'Show trends over time',
        supportedDataTypes: ['number', 'date'],
        requiredDimensions: 1,
        requiredMeasures: 1,
        maxMeasures: 10,
        defaultConfig: { smooth: false },
      },
      {
        id: 'area',
        name: 'Area Chart',
        category: 'trend',
        type: 'area',
        description: 'Show volume trends',
        supportedDataTypes: ['number', 'date'],
        requiredDimensions: 1,
        requiredMeasures: 1,
        defaultConfig: { fillOpacity: 0.3 },
      },
      {
        id: 'stacked-area',
        name: 'Stacked Area',
        category: 'trend',
        type: 'area',
        description: 'Show composition over time',
        supportedDataTypes: ['number', 'date'],
        requiredDimensions: 2,
        requiredMeasures: 1,
        defaultConfig: { stacked: true },
      },
      {
        id: 'sparkline',
        name: 'Sparkline',
        category: 'trend',
        type: 'sparkline',
        description: 'Compact inline trend',
        supportedDataTypes: ['number', 'date'],
        requiredDimensions: 1,
        requiredMeasures: 1,
        defaultConfig: { showAxis: false },
      },
      // Composition charts
      {
        id: 'treemap',
        name: 'Treemap',
        category: 'composition',
        type: 'treemap',
        description: 'Show hierarchical composition',
        supportedDataTypes: ['number'],
        requiredDimensions: 1,
        maxDimensions: 3,
        requiredMeasures: 1,
        defaultConfig: {},
      },
      {
        id: 'sunburst',
        name: 'Sunburst',
        category: 'composition',
        type: 'sunburst',
        description: 'Radial hierarchical view',
        supportedDataTypes: ['number'],
        requiredDimensions: 1,
        maxDimensions: 4,
        requiredMeasures: 1,
        defaultConfig: {},
      },
      {
        id: 'waterfall',
        name: 'Waterfall',
        category: 'composition',
        type: 'waterfall',
        description: 'Show cumulative effect',
        supportedDataTypes: ['number'],
        requiredDimensions: 1,
        requiredMeasures: 1,
        defaultConfig: {},
      },
      // Relationship charts
      {
        id: 'scatter',
        name: 'Scatter Plot',
        category: 'relationship',
        type: 'scatter',
        description: 'Show correlation',
        supportedDataTypes: ['number'],
        requiredDimensions: 0,
        requiredMeasures: 2,
        maxMeasures: 3,
        defaultConfig: {},
      },
      {
        id: 'bubble',
        name: 'Bubble Chart',
        category: 'relationship',
        type: 'scatter',
        description: 'Scatter with size dimension',
        supportedDataTypes: ['number'],
        requiredDimensions: 1,
        requiredMeasures: 3,
        defaultConfig: { sizeField: true },
      },
      {
        id: 'heatmap',
        name: 'Heatmap',
        category: 'relationship',
        type: 'heatmap',
        description: 'Show intensity matrix',
        supportedDataTypes: ['number'],
        requiredDimensions: 2,
        requiredMeasures: 1,
        defaultConfig: {},
      },
      // Geographic charts
      {
        id: 'map',
        name: 'Choropleth Map',
        category: 'geographic',
        type: 'map',
        description: 'Geographic data visualization',
        supportedDataTypes: ['number', 'string'],
        requiredDimensions: 1,
        requiredMeasures: 1,
        defaultConfig: { mapType: 'choropleth' },
      },
      {
        id: 'bubble-map',
        name: 'Bubble Map',
        category: 'geographic',
        type: 'map',
        description: 'Points on map with size',
        supportedDataTypes: ['number'],
        requiredDimensions: 2,
        requiredMeasures: 1,
        defaultConfig: { mapType: 'bubble' },
      },
      // Other
      {
        id: 'gauge',
        name: 'Gauge',
        category: 'comparison',
        type: 'gauge',
        description: 'Show progress to target',
        supportedDataTypes: ['number'],
        requiredDimensions: 0,
        requiredMeasures: 1,
        defaultConfig: { min: 0, max: 100 },
      },
      {
        id: 'radar',
        name: 'Radar Chart',
        category: 'comparison',
        type: 'radar',
        description: 'Multi-dimensional comparison',
        supportedDataTypes: ['number'],
        requiredDimensions: 1,
        requiredMeasures: 1,
        maxMeasures: 5,
        defaultConfig: {},
      },
      {
        id: 'funnel',
        name: 'Funnel Chart',
        category: 'composition',
        type: 'funnel',
        description: 'Show conversion stages',
        supportedDataTypes: ['number'],
        requiredDimensions: 1,
        requiredMeasures: 1,
        defaultConfig: {},
      },
      {
        id: 'sankey',
        name: 'Sankey Diagram',
        category: 'composition',
        type: 'sankey',
        description: 'Show flow between nodes',
        supportedDataTypes: ['number'],
        requiredDimensions: 2,
        requiredMeasures: 1,
        defaultConfig: {},
      },
    ];

    charts.forEach(c => this.chartDefinitions.set(c.id, c));
  }

  // =================== CHART DEFINITIONS ===================

  async getChartTypes(category?: ChartCategory): Promise<ChartDefinition[]> {
    let charts = Array.from(this.chartDefinitions.values());

    if (category) {
      charts = charts.filter(c => c.category === category);
    }

    return charts;
  }

  async getChartType(id: string): Promise<ChartDefinition | undefined> {
    return this.chartDefinitions.get(id);
  }

  async recommendChartType(data: {
    dimensionCount: number;
    measureCount: number;
    dataTypes: string[];
    preferredCategory?: ChartCategory;
  }): Promise<ChartDefinition[]> {
    const charts = Array.from(this.chartDefinitions.values());

    const suitable = charts.filter(chart => {
      const dimOk = data.dimensionCount >= chart.requiredDimensions &&
        (!chart.maxDimensions || data.dimensionCount <= chart.maxDimensions);
      const measureOk = data.measureCount >= chart.requiredMeasures &&
        (!chart.maxMeasures || data.measureCount <= chart.maxMeasures);
      const typeOk = data.dataTypes.some(t => chart.supportedDataTypes.includes(t));
      const categoryOk = !data.preferredCategory || chart.category === data.preferredCategory;

      return dimOk && measureOk && typeOk && categoryOk;
    });

    return suitable;
  }

  // =================== DATASETS ===================

  async createDataset(data: {
    tenantId: string;
    name: string;
    description?: string;
    source: DatasetSource;
    schema: DatasetSchema;
    refreshConfig?: RefreshConfig;
    createdBy: string;
  }): Promise<VisualizationDataset> {
    const id = `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const dataset: VisualizationDataset = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      source: data.source,
      schema: data.schema,
      refreshConfig: data.refreshConfig,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.datasets.set(id, dataset);
    this.eventEmitter.emit('dataset.created', { dataset });
    return dataset;
  }

  async getDataset(id: string): Promise<VisualizationDataset | undefined> {
    return this.datasets.get(id);
  }

  async getDatasets(tenantId: string): Promise<VisualizationDataset[]> {
    return Array.from(this.datasets.values())
      .filter(d => d.tenantId === tenantId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateDataset(id: string, updates: Partial<{
    name: string;
    description: string;
    source: DatasetSource;
    schema: DatasetSchema;
    refreshConfig: RefreshConfig;
  }>): Promise<VisualizationDataset | undefined> {
    const dataset = this.datasets.get(id);
    if (!dataset) return undefined;

    Object.assign(dataset, updates, { updatedAt: new Date() });
    return dataset;
  }

  async deleteDataset(id: string): Promise<void> {
    this.datasets.delete(id);
  }

  async refreshDataset(id: string): Promise<VisualizationDataset | undefined> {
    const dataset = this.datasets.get(id);
    if (!dataset) return undefined;

    // Fetch fresh data based on source type
    const data = await this.fetchDatasetData(dataset);
    dataset.cachedData = data;
    dataset.lastRefreshed = new Date();
    dataset.updatedAt = new Date();

    this.eventEmitter.emit('dataset.refreshed', { dataset });
    return dataset;
  }

  private async fetchDatasetData(dataset: VisualizationDataset): Promise<any[]> {
    // In production, this would execute actual queries/API calls
    // Simulate data fetching
    return Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      date: new Date(Date.now() - i * 86400000),
      category: ['A', 'B', 'C', 'D'][i % 4],
      value: Math.floor(Math.random() * 1000),
      amount: Math.floor(Math.random() * 10000) / 100,
    }));
  }

  // =================== VISUALIZATIONS ===================

  async createVisualization(data: {
    tenantId: string;
    name: string;
    description?: string;
    chartType: string;
    datasetId: string;
    config: VisualizationConfig;
    styling?: Partial<VisualizationStyling>;
    interactions?: Partial<InteractionConfig>;
    createdBy: string;
  }): Promise<Visualization> {
    const id = `viz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const visualization: Visualization = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      chartType: data.chartType,
      datasetId: data.datasetId,
      config: data.config,
      styling: {
        colors: { scheme: 'default' },
        legend: { show: true, position: 'bottom' },
        tooltip: { show: true },
        labels: { show: false },
        grid: { show: true },
        animation: { enabled: true, duration: 300 },
        ...data.styling,
      },
      interactions: {
        hover: true,
        click: { enabled: false },
        zoom: { enabled: false },
        brush: { enabled: false },
        drillDown: { enabled: false, levels: [] },
        crossFilter: { enabled: false, targetVisualizations: [] },
        ...data.interactions,
      },
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.visualizations.set(id, visualization);
    this.eventEmitter.emit('visualization.created', { visualization });
    return visualization;
  }

  async getVisualization(id: string): Promise<Visualization | undefined> {
    return this.visualizations.get(id);
  }

  async getVisualizations(tenantId: string, options?: {
    chartType?: string;
    datasetId?: string;
  }): Promise<Visualization[]> {
    let visualizations = Array.from(this.visualizations.values())
      .filter(v => v.tenantId === tenantId);

    if (options?.chartType) {
      visualizations = visualizations.filter(v => v.chartType === options.chartType);
    }
    if (options?.datasetId) {
      visualizations = visualizations.filter(v => v.datasetId === options.datasetId);
    }

    return visualizations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateVisualization(id: string, updates: Partial<{
    name: string;
    description: string;
    chartType: string;
    config: VisualizationConfig;
    styling: VisualizationStyling;
    interactions: InteractionConfig;
    annotations: Annotation[];
  }>): Promise<Visualization | undefined> {
    const visualization = this.visualizations.get(id);
    if (!visualization) return undefined;

    Object.assign(visualization, updates, { updatedAt: new Date() });
    this.eventEmitter.emit('visualization.updated', { visualization });
    return visualization;
  }

  async deleteVisualization(id: string): Promise<void> {
    this.visualizations.delete(id);
  }

  async duplicateVisualization(id: string, newName: string, userId: string): Promise<Visualization | undefined> {
    const original = this.visualizations.get(id);
    if (!original) return undefined;

    return this.createVisualization({
      tenantId: original.tenantId,
      name: newName,
      description: original.description,
      chartType: original.chartType,
      datasetId: original.datasetId,
      config: { ...original.config },
      styling: { ...original.styling },
      interactions: { ...original.interactions },
      createdBy: userId,
    });
  }

  // =================== RENDERING ===================

  async renderVisualization(id: string, filters?: FilterConfig[]): Promise<ChartRenderOutput | undefined> {
    const visualization = this.visualizations.get(id);
    if (!visualization) return undefined;

    const dataset = this.datasets.get(visualization.datasetId);
    if (!dataset) return undefined;

    // Get or refresh data
    let data = dataset.cachedData;
    if (!data) {
      await this.refreshDataset(dataset.id);
      data = dataset.cachedData || [];
    }

    // Apply visualization config
    const processedData = this.processData(data, visualization.config, filters);

    // Build chart options
    const options = this.buildChartOptions(visualization);

    return {
      chartType: visualization.chartType,
      data: processedData,
      options,
      dimensions: { width: 800, height: 400 },
    };
  }

  private processData(data: any[], config: VisualizationConfig, additionalFilters?: FilterConfig[]): any[] {
    let result = [...data];

    // Apply filters
    const allFilters = [...(config.filters || []), ...(additionalFilters || [])];
    if (allFilters.length > 0) {
      result = result.filter(row => {
        return allFilters.every(f => this.evaluateFilter(row, f));
      });
    }

    // Apply grouping and aggregation
    if (config.dimensions.length > 0 && config.measures.length > 0) {
      result = this.aggregateData(result, config.dimensions, config.measures);
    }

    // Apply sorting
    if (config.sorting?.length) {
      result.sort((a, b) => {
        for (const sort of config.sorting!) {
          const aVal = a[sort.field];
          const bVal = b[sort.field];
          if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    // Apply limit
    if (config.limit) {
      result = result.slice(0, config.limit);
    }

    return result;
  }

  private evaluateFilter(row: any, filter: FilterConfig): boolean {
    const value = row[filter.field];

    switch (filter.operator) {
      case 'eq': return value === filter.value;
      case 'neq': return value !== filter.value;
      case 'gt': return value > filter.value;
      case 'gte': return value >= filter.value;
      case 'lt': return value < filter.value;
      case 'lte': return value <= filter.value;
      case 'in': return Array.isArray(filter.value) && filter.value.includes(value);
      case 'nin': return Array.isArray(filter.value) && !filter.value.includes(value);
      case 'between': return Array.isArray(filter.value) && value >= filter.value[0] && value <= filter.value[1];
      case 'contains': return String(value).includes(filter.value);
      case 'startsWith': return String(value).startsWith(filter.value);
      case 'endsWith': return String(value).endsWith(filter.value);
      case 'isNull': return value === null || value === undefined;
      case 'isNotNull': return value !== null && value !== undefined;
      default: return true;
    }
  }

  private aggregateData(data: any[], dimensions: DimensionConfig[], measures: MeasureConfig[]): any[] {
    const groups = new Map<string, any[]>();

    // Group data
    data.forEach(row => {
      const key = dimensions.map(d => row[d.field]).join('|');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(row);
    });

    // Aggregate each group
    return Array.from(groups.entries()).map(([key, rows]) => {
      const result: Record<string, any> = {};

      // Set dimension values
      const keyParts = key.split('|');
      dimensions.forEach((d, i) => {
        result[d.field] = keyParts[i];
      });

      // Calculate measures
      measures.forEach(m => {
        const values = rows.map(r => r[m.field]).filter(v => v !== null && v !== undefined);
        result[m.field] = this.calculateAggregate(values, m.aggregation);
      });

      return result;
    });
  }

  private calculateAggregate(values: number[], aggregation: MeasureConfig['aggregation']): number {
    if (values.length === 0) return 0;

    switch (aggregation) {
      case 'sum': return values.reduce((a, b) => a + b, 0);
      case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
      case 'count': return values.length;
      case 'min': return Math.min(...values);
      case 'max': return Math.max(...values);
      case 'distinct': return new Set(values).size;
      case 'median': {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      }
      case 'stddev': {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
      }
      case 'variance': {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        return squareDiffs.reduce((a, b) => a + b, 0) / values.length;
      }
      default: return 0;
    }
  }

  private buildChartOptions(visualization: Visualization): Record<string, any> {
    const { styling, interactions } = visualization;

    return {
      colors: styling.colors,
      legend: styling.legend,
      axes: styling.axes,
      tooltip: styling.tooltip,
      labels: styling.labels,
      grid: styling.grid,
      animation: styling.animation,
      interactions: {
        hover: interactions.hover,
        click: interactions.click?.enabled,
        zoom: interactions.zoom?.enabled,
        brush: interactions.brush?.enabled,
      },
      annotations: visualization.annotations,
    };
  }

  // =================== PUBLIC SHARING ===================

  async generatePublicLink(id: string): Promise<string | undefined> {
    const visualization = this.visualizations.get(id);
    if (!visualization) return undefined;

    const token = `pub_viz_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    visualization.isPublic = true;
    visualization.publicToken = token;
    visualization.updatedAt = new Date();

    return `/public/visualization/${token}`;
  }

  async revokePublicLink(id: string): Promise<void> {
    const visualization = this.visualizations.get(id);
    if (visualization) {
      visualization.isPublic = false;
      visualization.publicToken = undefined;
      visualization.updatedAt = new Date();
    }
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalDatasets: number;
    totalVisualizations: number;
    byChartType: Record<string, number>;
    publicVisualizations: number;
    recentVisualizations: Visualization[];
  }> {
    const datasets = Array.from(this.datasets.values()).filter(d => d.tenantId === tenantId);
    const visualizations = Array.from(this.visualizations.values()).filter(v => v.tenantId === tenantId);

    const byChartType: Record<string, number> = {};
    visualizations.forEach(v => {
      byChartType[v.chartType] = (byChartType[v.chartType] || 0) + 1;
    });

    return {
      totalDatasets: datasets.length,
      totalVisualizations: visualizations.length,
      byChartType,
      publicVisualizations: visualizations.filter(v => v.isPublic).length,
      recentVisualizations: visualizations
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 5),
    };
  }
}

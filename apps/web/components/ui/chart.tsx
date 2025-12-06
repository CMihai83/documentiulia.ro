'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface DataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface ChartSeries {
  name: string;
  data: number[];
  color?: string;
}

export interface ChartConfig {
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  showLabels?: boolean;
  animated?: boolean;
  responsive?: boolean;
}

// ============================================================================
// Chart Context
// ============================================================================

interface ChartContextValue {
  config: ChartConfig;
  hoveredIndex: number | null;
  setHoveredIndex: (index: number | null) => void;
  selectedIndex: number | null;
  setSelectedIndex: (index: number | null) => void;
}

const ChartContext = React.createContext<ChartContextValue | undefined>(undefined);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error('useChart must be used within a ChartProvider');
  }
  return context;
}

// ============================================================================
// Chart Provider
// ============================================================================

interface ChartProviderProps {
  children: React.ReactNode;
  config?: ChartConfig;
}

export function ChartProvider({ children, config = {} }: ChartProviderProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  const defaultConfig: ChartConfig = {
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    showLabels: true,
    animated: true,
    responsive: true,
    ...config,
  };

  return (
    <ChartContext.Provider
      value={{
        config: defaultConfig,
        hoveredIndex,
        setHoveredIndex,
        selectedIndex,
        setSelectedIndex,
      }}
    >
      {children}
    </ChartContext.Provider>
  );
}

// ============================================================================
// Chart Container
// ============================================================================

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config?: ChartConfig;
}

export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, config, children, ...props }, ref) => {
    return (
      <ChartProvider config={config}>
        <div
          ref={ref}
          className={cn('relative w-full', className)}
          {...props}
        >
          {children}
        </div>
      </ChartProvider>
    );
  }
);
ChartContainer.displayName = 'ChartContainer';

// ============================================================================
// Chart Tooltip
// ============================================================================

interface ChartTooltipProps {
  content?: React.ReactNode;
  x?: number;
  y?: number;
  visible?: boolean;
}

export function ChartTooltip({ content, x = 0, y = 0, visible = false }: ChartTooltipProps) {
  if (!visible || !content) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute z-50 pointer-events-none"
        style={{ left: x, top: y, transform: 'translate(-50%, -100%)' }}
      >
        <div className="bg-popover text-popover-foreground border border-border rounded-md shadow-lg px-3 py-2 text-sm">
          {content}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// Chart Legend
// ============================================================================

interface ChartLegendItem {
  label: string;
  color: string;
  value?: number | string;
}

interface ChartLegendProps extends React.HTMLAttributes<HTMLDivElement> {
  items: ChartLegendItem[];
  orientation?: 'horizontal' | 'vertical';
}

export const ChartLegend = React.forwardRef<HTMLDivElement, ChartLegendProps>(
  ({ className, items, orientation = 'horizontal', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex gap-4 text-sm',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap justify-center',
          className
        )}
        {...props}
      >
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{item.label}</span>
            {item.value !== undefined && (
              <span className="font-medium">{item.value}</span>
            )}
          </div>
        ))}
      </div>
    );
  }
);
ChartLegend.displayName = 'ChartLegend';

// ============================================================================
// Bar Chart
// ============================================================================

interface BarChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: DataPoint[];
  height?: number;
  barWidth?: number;
  gap?: number;
  orientation?: 'vertical' | 'horizontal';
  showValues?: boolean;
  formatValue?: (value: number) => string;
  colors?: string[];
}

export const BarChart = React.forwardRef<HTMLDivElement, BarChartProps>(
  (
    {
      className,
      data,
      height = 300,
      barWidth = 40,
      gap = 8,
      orientation = 'vertical',
      showValues = true,
      formatValue = (v) => v.toLocaleString('ro-RO'),
      colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
      ...props
    },
    ref
  ) => {
    const maxValue = Math.max(...data.map((d) => d.value));
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

    if (orientation === 'horizontal') {
      return (
        <div ref={ref} className={cn('w-full', className)} {...props}>
          <div className="space-y-2">
            {data.map((item, index) => {
              const percentage = (item.value / maxValue) * 100;
              const color = item.color || colors[index % colors.length];

              return (
                <div
                  key={index}
                  className="flex items-center gap-3"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <span className="text-sm text-muted-foreground w-24 truncate">
                    {item.label}
                  </span>
                  <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={cn(
                        'h-full rounded-md transition-opacity',
                        hoveredIndex === index ? 'opacity-100' : 'opacity-80'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  </div>
                  {showValues && (
                    <span className="text-sm font-medium w-20 text-right">
                      {formatValue(item.value)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn('w-full', className)}
        style={{ height }}
        {...props}
      >
        <div className="h-full flex items-end justify-center gap-2">
          {data.map((item, index) => {
            const percentage = (item.value / maxValue) * 100;
            const color = item.color || colors[index % colors.length];

            return (
              <div
                key={index}
                className="flex flex-col items-center gap-2"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {showValues && hoveredIndex === index && (
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-medium"
                  >
                    {formatValue(item.value)}
                  </motion.span>
                )}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${percentage}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={cn(
                    'rounded-t-md transition-opacity cursor-pointer',
                    hoveredIndex === index ? 'opacity-100' : 'opacity-80'
                  )}
                  style={{
                    width: barWidth,
                    backgroundColor: color,
                    minHeight: 4,
                  }}
                />
                <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
BarChart.displayName = 'BarChart';

// ============================================================================
// Line Chart
// ============================================================================

interface LineChartProps extends React.SVGAttributes<SVGSVGElement> {
  data: DataPoint[];
  series?: ChartSeries[];
  width?: number;
  height?: number;
  showDots?: boolean;
  showArea?: boolean;
  curved?: boolean;
  strokeWidth?: number;
  colors?: string[];
}

export const LineChart = React.forwardRef<SVGSVGElement, LineChartProps>(
  (
    {
      className,
      data,
      series,
      width = 600,
      height = 300,
      showDots = true,
      showArea = false,
      curved = true,
      strokeWidth = 2,
      colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      ...props
    },
    ref
  ) => {
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const [hoveredPoint, setHoveredPoint] = React.useState<{
      seriesIndex: number;
      pointIndex: number;
    } | null>(null);

    // Determine data to render
    const chartData = series || [{ name: 'Default', data: data.map((d) => d.value), color: colors[0] }];
    const labels = data.map((d) => d.label);

    // Calculate scales
    const allValues = chartData.flatMap((s) => s.data);
    const maxValue = Math.max(...allValues) * 1.1;
    const minValue = Math.min(0, Math.min(...allValues));

    const xScale = (index: number) => (index / (labels.length - 1)) * chartWidth;
    const yScale = (value: number) =>
      chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

    // Generate path
    const generatePath = (values: number[]) => {
      if (values.length === 0) return '';

      const points = values.map((value, index) => ({
        x: xScale(index),
        y: yScale(value),
      }));

      if (curved) {
        // Smooth curve using cubic bezier
        let path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const curr = points[i];
          const midX = (prev.x + curr.x) / 2;
          path += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
        }
        return path;
      }

      return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    };

    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        className={cn('w-full h-auto', className)}
        {...props}
      >
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = chartHeight * tick;
            const value = maxValue - (maxValue - minValue) * tick;
            return (
              <g key={tick}>
                <line
                  x1={0}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={0.1}
                />
                <text
                  x={-10}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="text-xs fill-muted-foreground"
                >
                  {value.toLocaleString('ro-RO', { maximumFractionDigits: 0 })}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {labels.map((label, index) => (
            <text
              key={index}
              x={xScale(index)}
              y={chartHeight + 20}
              textAnchor="middle"
              className="text-xs fill-muted-foreground"
            >
              {label}
            </text>
          ))}

          {/* Series */}
          {chartData.map((seriesItem, seriesIndex) => {
            const color = seriesItem.color || colors[seriesIndex % colors.length];
            const path = generatePath(seriesItem.data);

            return (
              <g key={seriesIndex}>
                {/* Area fill */}
                {showArea && (
                  <motion.path
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.1 }}
                    d={`${path} L ${xScale(seriesItem.data.length - 1)} ${chartHeight} L ${xScale(0)} ${chartHeight} Z`}
                    fill={color}
                  />
                )}

                {/* Line */}
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, ease: 'easeInOut' }}
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Dots */}
                {showDots &&
                  seriesItem.data.map((value, pointIndex) => {
                    const isHovered =
                      hoveredPoint?.seriesIndex === seriesIndex &&
                      hoveredPoint?.pointIndex === pointIndex;

                    return (
                      <motion.circle
                        key={pointIndex}
                        cx={xScale(pointIndex)}
                        cy={yScale(value)}
                        r={isHovered ? 6 : 4}
                        fill={color}
                        stroke="white"
                        strokeWidth={2}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: pointIndex * 0.05 }}
                        onMouseEnter={() =>
                          setHoveredPoint({ seriesIndex, pointIndex })
                        }
                        onMouseLeave={() => setHoveredPoint(null)}
                        className="cursor-pointer"
                      />
                    );
                  })}
              </g>
            );
          })}

          {/* Tooltip */}
          {hoveredPoint && (
            <g
              transform={`translate(${xScale(hoveredPoint.pointIndex)}, ${yScale(
                chartData[hoveredPoint.seriesIndex].data[hoveredPoint.pointIndex]
              ) - 15})`}
            >
              <rect
                x={-40}
                y={-25}
                width={80}
                height={25}
                rx={4}
                fill="hsl(var(--popover))"
                stroke="hsl(var(--border))"
              />
              <text
                textAnchor="middle"
                y={-8}
                className="text-xs font-medium fill-foreground"
              >
                {chartData[hoveredPoint.seriesIndex].data[
                  hoveredPoint.pointIndex
                ].toLocaleString('ro-RO')}
              </text>
            </g>
          )}
        </g>
      </svg>
    );
  }
);
LineChart.displayName = 'LineChart';

// ============================================================================
// Pie Chart
// ============================================================================

interface PieChartProps extends React.SVGAttributes<SVGSVGElement> {
  data: DataPoint[];
  size?: number;
  innerRadius?: number;
  showLabels?: boolean;
  showPercentage?: boolean;
  colors?: string[];
}

export const PieChart = React.forwardRef<SVGSVGElement, PieChartProps>(
  (
    {
      className,
      data,
      size = 300,
      innerRadius = 0,
      showLabels = true,
      showPercentage = true,
      colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'],
      ...props
    },
    ref
  ) => {
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const center = size / 2;
    const radius = (size - 40) / 2;

    // Calculate arc paths
    let currentAngle = -Math.PI / 2;
    const arcs = data.map((item, index) => {
      const angle = (item.value / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const startX = center + radius * Math.cos(startAngle);
      const startY = center + radius * Math.sin(startAngle);
      const endX = center + radius * Math.cos(endAngle);
      const endY = center + radius * Math.sin(endAngle);

      const innerStartX = center + innerRadius * Math.cos(startAngle);
      const innerStartY = center + innerRadius * Math.sin(startAngle);
      const innerEndX = center + innerRadius * Math.cos(endAngle);
      const innerEndY = center + innerRadius * Math.sin(endAngle);

      const largeArcFlag = angle > Math.PI ? 1 : 0;

      const path =
        innerRadius > 0
          ? `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} L ${innerEndX} ${innerEndY} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY} Z`
          : `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

      // Label position
      const labelAngle = startAngle + angle / 2;
      const labelRadius = innerRadius > 0 ? (radius + innerRadius) / 2 : radius * 0.6;
      const labelX = center + labelRadius * Math.cos(labelAngle);
      const labelY = center + labelRadius * Math.sin(labelAngle);

      return {
        path,
        color: item.color || colors[index % colors.length],
        labelX,
        labelY,
        percentage: ((item.value / total) * 100).toFixed(1),
        value: item.value,
        label: item.label,
      };
    });

    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${size} ${size}`}
        className={cn('w-full h-auto max-w-[300px]', className)}
        {...props}
      >
        {arcs.map((arc, index) => {
          const isHovered = hoveredIndex === index;

          return (
            <g key={index}>
              <motion.path
                d={arc.path}
                fill={arc.color}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: isHovered ? 1.05 : 1,
                  opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1,
                }}
                transition={{ duration: 0.3 }}
                style={{ transformOrigin: `${center}px ${center}px` }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              />
              {showLabels && (
                <text
                  x={arc.labelX}
                  y={arc.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-medium fill-white pointer-events-none"
                >
                  {showPercentage ? `${arc.percentage}%` : arc.value.toLocaleString('ro-RO')}
                </text>
              )}
            </g>
          );
        })}

        {/* Hover tooltip */}
        {hoveredIndex !== null && (
          <g>
            <rect
              x={center - 50}
              y={center - 30}
              width={100}
              height={40}
              rx={4}
              fill="hsl(var(--popover))"
              stroke="hsl(var(--border))"
            />
            <text
              x={center}
              y={center - 12}
              textAnchor="middle"
              className="text-xs font-medium fill-foreground"
            >
              {arcs[hoveredIndex].label}
            </text>
            <text
              x={center}
              y={center + 8}
              textAnchor="middle"
              className="text-sm font-bold fill-foreground"
            >
              {arcs[hoveredIndex].value.toLocaleString('ro-RO')}
            </text>
          </g>
        )}
      </svg>
    );
  }
);
PieChart.displayName = 'PieChart';

// ============================================================================
// Donut Chart (wrapper around PieChart)
// ============================================================================

interface DonutChartProps extends Omit<PieChartProps, 'innerRadius'> {
  thickness?: number;
  centerLabel?: React.ReactNode;
}

export const DonutChart = React.forwardRef<SVGSVGElement, DonutChartProps>(
  ({ thickness = 40, centerLabel, size = 300, ...props }, ref) => {
    const innerRadius = (size - 40) / 2 - thickness;

    return (
      <div className="relative inline-block">
        <PieChart ref={ref} size={size} innerRadius={innerRadius} {...props} />
        {centerLabel && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">{centerLabel}</div>
          </div>
        )}
      </div>
    );
  }
);
DonutChart.displayName = 'DonutChart';

// ============================================================================
// Area Chart (wrapper around LineChart)
// ============================================================================

export const AreaChart = React.forwardRef<SVGSVGElement, LineChartProps>(
  (props, ref) => {
    return <LineChart ref={ref} showArea {...props} />;
  }
);
AreaChart.displayName = 'AreaChart';

// ============================================================================
// Spark Line (mini chart)
// ============================================================================

interface SparkLineProps extends React.SVGAttributes<SVGSVGElement> {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showFill?: boolean;
}

export const SparkLine = React.forwardRef<SVGSVGElement, SparkLineProps>(
  (
    {
      className,
      data,
      width = 100,
      height = 30,
      color = '#3b82f6',
      showFill = true,
      ...props
    },
    ref
  ) => {
    if (data.length === 0) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => ({
      x: (index / (data.length - 1)) * width,
      y: height - ((value - min) / range) * height,
    }));

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

    return (
      <svg
        ref={ref}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={cn('inline-block', className)}
        {...props}
      >
        {showFill && (
          <path d={areaD} fill={color} fillOpacity={0.1} />
        )}
        <motion.path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        />
        <circle
          cx={points[points.length - 1]?.x}
          cy={points[points.length - 1]?.y}
          r={2}
          fill={color}
        />
      </svg>
    );
  }
);
SparkLine.displayName = 'SparkLine';

// ============================================================================
// Progress Ring
// ============================================================================

interface ProgressRingProps extends React.SVGAttributes<SVGSVGElement> {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  showLabel?: boolean;
  label?: React.ReactNode;
}

export const ProgressRing = React.forwardRef<SVGSVGElement, ProgressRingProps>(
  (
    {
      className,
      value,
      max = 100,
      size = 100,
      strokeWidth = 8,
      color = '#3b82f6',
      trackColor = '#e5e7eb',
      showLabel = true,
      label,
      ...props
    },
    ref
  ) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const percentage = Math.min(Math.max(value / max, 0), 1);
    const strokeDashoffset = circumference * (1 - percentage);

    return (
      <div className="relative inline-block">
        <svg
          ref={ref}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={cn('transform -rotate-90', className)}
          {...props}
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </svg>
        {showLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-semibold">
              {label || `${Math.round(percentage * 100)}%`}
            </span>
          </div>
        )}
      </div>
    );
  }
);
ProgressRing.displayName = 'ProgressRing';

// ============================================================================
// Stat Card with Chart
// ============================================================================

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  sparkData?: number[];
  icon?: React.ReactNode;
}

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      title,
      value,
      change,
      changeLabel = 'vs luna trecuta',
      sparkData,
      icon,
      ...props
    },
    ref
  ) => {
    const isPositive = change !== undefined && change >= 0;

    return (
      <div
        ref={ref}
        className={cn(
          'bg-card border border-border rounded-lg p-4',
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">{value}</div>
            {change !== undefined && (
              <div
                className={cn(
                  'text-xs flex items-center gap-1 mt-1',
                  isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                <span>{isPositive ? '↑' : '↓'}</span>
                <span>{Math.abs(change)}%</span>
                <span className="text-muted-foreground">{changeLabel}</span>
              </div>
            )}
          </div>
          {sparkData && sparkData.length > 0 && (
            <SparkLine
              data={sparkData}
              color={isPositive ? '#10b981' : '#ef4444'}
              width={80}
              height={30}
            />
          )}
        </div>
      </div>
    );
  }
);
StatCard.displayName = 'StatCard';

// ============================================================================
// Simple Chart Components for Quick Use
// ============================================================================

interface SimpleBarChartProps {
  data: { label: string; value: number }[];
  title?: string;
  className?: string;
}

export function SimpleBarChart({ data, title, className }: SimpleBarChartProps) {
  return (
    <div className={cn('bg-card border border-border rounded-lg p-4', className)}>
      {title && <h3 className="text-sm font-medium mb-4">{title}</h3>}
      <BarChart data={data} height={200} orientation="horizontal" />
    </div>
  );
}

interface SimpleLineChartProps {
  data: { label: string; value: number }[];
  title?: string;
  className?: string;
}

export function SimpleLineChart({ data, title, className }: SimpleLineChartProps) {
  return (
    <div className={cn('bg-card border border-border rounded-lg p-4', className)}>
      {title && <h3 className="text-sm font-medium mb-4">{title}</h3>}
      <LineChart data={data} height={200} />
    </div>
  );
}

interface SimplePieChartProps {
  data: { label: string; value: number }[];
  title?: string;
  className?: string;
}

export function SimplePieChart({ data, title, className }: SimplePieChartProps) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className={cn('bg-card border border-border rounded-lg p-4', className)}>
      {title && <h3 className="text-sm font-medium mb-4 text-center">{title}</h3>}
      <div className="flex flex-col items-center gap-4">
        <PieChart data={data} size={200} />
        <ChartLegend
          items={data.map((d, i) => ({
            label: d.label,
            color: colors[i % colors.length],
            value: d.value.toLocaleString('ro-RO'),
          }))}
          orientation="vertical"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Revenue Chart (Accounting specific)
// ============================================================================

interface RevenueChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: {
    month: string;
    venituri: number;
    cheltuieli: number;
  }[];
  title?: string;
}

export function RevenueChart({ data, title = 'Venituri vs Cheltuieli', className }: RevenueChartProps) {
  const labels = data.map((d) => d.month);
  const series: ChartSeries[] = [
    { name: 'Venituri', data: data.map((d) => d.venituri), color: '#10b981' },
    { name: 'Cheltuieli', data: data.map((d) => d.cheltuieli), color: '#ef4444' },
  ];

  return (
    <div className={cn('bg-card border border-border rounded-lg p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">{title}</h3>
        <ChartLegend
          items={[
            { label: 'Venituri', color: '#10b981' },
            { label: 'Cheltuieli', color: '#ef4444' },
          ]}
        />
      </div>
      <LineChart
        data={labels.map((l) => ({ label: l, value: 0 }))}
        series={series}
        height={250}
        showArea
      />
    </div>
  );
}

// ============================================================================
// Expense Breakdown Chart
// ============================================================================

interface ExpenseBreakdownProps extends React.HTMLAttributes<HTMLDivElement> {
  data: { category: string; amount: number }[];
  title?: string;
  total?: number;
}

export function ExpenseBreakdownChart({
  data,
  title = 'Distribuție Cheltuieli',
  total,
  className,
}: ExpenseBreakdownProps) {
  const chartData = data.map((d) => ({ label: d.category, value: d.amount }));
  const calculatedTotal = total ?? data.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className={cn('bg-card border border-border rounded-lg p-4', className)}>
      <h3 className="text-sm font-medium mb-4 text-center">{title}</h3>
      <DonutChart
        data={chartData}
        size={200}
        thickness={30}
        showLabels={false}
        centerLabel={
          <div>
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-lg font-bold">
              {calculatedTotal.toLocaleString('ro-RO')} RON
            </div>
          </div>
        }
      />
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.category}</span>
            <span className="font-medium">{item.amount.toLocaleString('ro-RO')} RON</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Cash Flow Chart
// ============================================================================

interface CashFlowChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: {
    period: string;
    inflows: number;
    outflows: number;
  }[];
  title?: string;
}

export function CashFlowChart({ data, title = 'Flux de Numerar', className }: CashFlowChartProps) {
  const chartData = data.map((d) => ({
    label: d.period,
    value: d.inflows - d.outflows,
    color: d.inflows - d.outflows >= 0 ? '#10b981' : '#ef4444',
  }));

  return (
    <div className={cn('bg-card border border-border rounded-lg p-4', className)}>
      <h3 className="text-sm font-medium mb-4">{title}</h3>
      <BarChart data={chartData} height={200} showValues />
      <div className="mt-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Intrări</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-muted-foreground">Ieșiri</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// KPI Dashboard
// ============================================================================

interface KPIData {
  title: string;
  value: string | number;
  change?: number;
  sparkData?: number[];
  icon?: React.ReactNode;
}

interface KPIDashboardProps extends React.HTMLAttributes<HTMLDivElement> {
  kpis: KPIData[];
}

export function KPIDashboard({ kpis, className }: KPIDashboardProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {kpis.map((kpi, index) => (
        <StatCard
          key={index}
          title={kpi.title}
          value={kpi.value}
          change={kpi.change}
          sparkData={kpi.sparkData}
          icon={kpi.icon}
        />
      ))}
    </div>
  );
}

export { useChart };

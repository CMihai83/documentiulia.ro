'use client';

import { memo, useId } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// High contrast color palette for WCAG 2.1 AA compliance (4.5:1 ratio)
export const ACCESSIBLE_COLORS = {
  primary: '#1e40af', // Blue 800
  secondary: '#15803d', // Green 700
  tertiary: '#b45309', // Amber 700
  quaternary: '#7c2d12', // Orange 900
  danger: '#b91c1c', // Red 700
  info: '#0e7490', // Cyan 700
  purple: '#6b21a8', // Purple 800
  gray: '#374151', // Gray 700
};

export const ACCESSIBLE_CHART_COLORS = [
  ACCESSIBLE_COLORS.primary,
  ACCESSIBLE_COLORS.secondary,
  ACCESSIBLE_COLORS.tertiary,
  ACCESSIBLE_COLORS.quaternary,
  ACCESSIBLE_COLORS.danger,
  ACCESSIBLE_COLORS.info,
  ACCESSIBLE_COLORS.purple,
  ACCESSIBLE_COLORS.gray,
];

interface AccessibleChartProps {
  title: string;
  description?: string;
  data: any[];
  type: 'line' | 'bar' | 'pie';
  dataKey: string;
  xAxisKey?: string;
  secondaryDataKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  colors?: string[];
  valueFormatter?: (value: number) => string;
  className?: string;
}

// Screen reader accessible data table
const AccessibleDataTable = memo(function AccessibleDataTable({
  data,
  xAxisKey,
  dataKey,
  secondaryDataKey,
  title,
  valueFormatter,
}: {
  data: any[];
  xAxisKey?: string;
  dataKey: string;
  secondaryDataKey?: string;
  title: string;
  valueFormatter?: (value: number) => string;
}) {
  const format = valueFormatter || ((v: number) => v.toLocaleString('ro-RO'));

  return (
    <table className="sr-only" aria-label={`Date pentru graficul ${title}`}>
      <caption>{title}</caption>
      <thead>
        <tr>
          {xAxisKey && <th scope="col">{xAxisKey}</th>}
          <th scope="col">{dataKey}</th>
          {secondaryDataKey && <th scope="col">{secondaryDataKey}</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={index}>
            {xAxisKey && <td>{item[xAxisKey]}</td>}
            <td>{format(item[dataKey])}</td>
            {secondaryDataKey && <td>{format(item[secondaryDataKey])}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
});

export const AccessibleLineChart = memo(function AccessibleLineChart({
  title,
  description,
  data,
  dataKey,
  xAxisKey = 'name',
  secondaryDataKey,
  height = 300,
  showGrid = true,
  showLegend = true,
  colors = ACCESSIBLE_CHART_COLORS,
  valueFormatter,
  className = '',
}: Omit<AccessibleChartProps, 'type'>) {
  const chartId = useId();
  const format = valueFormatter || ((v: number) => `${v.toLocaleString('ro-RO')}`);

  return (
    <div
      role="figure"
      aria-labelledby={`${chartId}-title`}
      aria-describedby={description ? `${chartId}-desc` : undefined}
      className={className}
    >
      <h3 id={`${chartId}-title`} className="sr-only">
        {title}
      </h3>
      {description && (
        <p id={`${chartId}-desc`} className="sr-only">
          {description}
        </p>
      )}

      {/* Visual chart */}
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis
              dataKey={xAxisKey}
              stroke={ACCESSIBLE_COLORS.gray}
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: ACCESSIBLE_COLORS.gray }}
            />
            <YAxis
              stroke={ACCESSIBLE_COLORS.gray}
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => format(v)}
              tickLine={{ stroke: ACCESSIBLE_COLORS.gray }}
            />
            <Tooltip
              formatter={(value: number) => [format(value), '']}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={colors[0]}
              strokeWidth={2}
              dot={{ fill: colors[0], r: 4 }}
              activeDot={{ r: 6, stroke: colors[0], strokeWidth: 2 }}
              name={dataKey}
            />
            {secondaryDataKey && (
              <Line
                type="monotone"
                dataKey={secondaryDataKey}
                stroke={colors[1]}
                strokeWidth={2}
                dot={{ fill: colors[1], r: 4 }}
                activeDot={{ r: 6, stroke: colors[1], strokeWidth: 2 }}
                name={secondaryDataKey}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible data table for screen readers */}
      <AccessibleDataTable
        data={data}
        xAxisKey={xAxisKey}
        dataKey={dataKey}
        secondaryDataKey={secondaryDataKey}
        title={title}
        valueFormatter={valueFormatter}
      />
    </div>
  );
});

export const AccessibleBarChart = memo(function AccessibleBarChart({
  title,
  description,
  data,
  dataKey,
  xAxisKey = 'name',
  secondaryDataKey,
  height = 300,
  showGrid = true,
  showLegend = true,
  colors = ACCESSIBLE_CHART_COLORS,
  valueFormatter,
  className = '',
}: Omit<AccessibleChartProps, 'type'>) {
  const chartId = useId();
  const format = valueFormatter || ((v: number) => `${v.toLocaleString('ro-RO')}`);

  return (
    <div
      role="figure"
      aria-labelledby={`${chartId}-title`}
      aria-describedby={description ? `${chartId}-desc` : undefined}
      className={className}
    >
      <h3 id={`${chartId}-title`} className="sr-only">
        {title}
      </h3>
      {description && (
        <p id={`${chartId}-desc`} className="sr-only">
          {description}
        </p>
      )}

      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis
              dataKey={xAxisKey}
              stroke={ACCESSIBLE_COLORS.gray}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              stroke={ACCESSIBLE_COLORS.gray}
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => format(v)}
            />
            <Tooltip
              formatter={(value: number) => [format(value), '']}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            {showLegend && <Legend />}
            <Bar dataKey={dataKey} fill={colors[0]} radius={[4, 4, 0, 0]} name={dataKey} />
            {secondaryDataKey && (
              <Bar
                dataKey={secondaryDataKey}
                fill={colors[1]}
                radius={[4, 4, 0, 0]}
                name={secondaryDataKey}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <AccessibleDataTable
        data={data}
        xAxisKey={xAxisKey}
        dataKey={dataKey}
        secondaryDataKey={secondaryDataKey}
        title={title}
        valueFormatter={valueFormatter}
      />
    </div>
  );
});

export const AccessiblePieChart = memo(function AccessiblePieChart({
  title,
  description,
  data,
  dataKey,
  height = 300,
  showLegend = true,
  colors = ACCESSIBLE_CHART_COLORS,
  valueFormatter,
  className = '',
}: Omit<AccessibleChartProps, 'type' | 'xAxisKey' | 'secondaryDataKey' | 'showGrid'>) {
  const chartId = useId();
  const format = valueFormatter || ((v: number) => `${v.toLocaleString('ro-RO')}`);

  return (
    <div
      role="figure"
      aria-labelledby={`${chartId}-title`}
      aria-describedby={description ? `${chartId}-desc` : undefined}
      className={className}
    >
      <h3 id={`${chartId}-title`} className="sr-only">
        {title}
      </h3>
      {description && (
        <p id={`${chartId}-desc`} className="sr-only">
          {description}
        </p>
      )}

      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="70%"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: ACCESSIBLE_COLORS.gray }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || colors[index % colors.length]}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [format(value), '']}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            {showLegend && <Legend />}
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible data table for screen readers */}
      <table className="sr-only" aria-label={`Date pentru graficul ${title}`}>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Categorie</th>
            <th scope="col">Valoare</th>
            <th scope="col">Procent</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const total = data.reduce((sum, item) => sum + item[dataKey], 0);
            return data.map((item, index) => (
              <tr key={index}>
                <td>{item.name}</td>
                <td>{format(item[dataKey])}</td>
                <td>{((item[dataKey] / total) * 100).toFixed(1)}%</td>
              </tr>
            ));
          })()}
        </tbody>
      </table>
    </div>
  );
});

export default {
  LineChart: AccessibleLineChart,
  BarChart: AccessibleBarChart,
  PieChart: AccessiblePieChart,
  COLORS: ACCESSIBLE_CHART_COLORS,
};

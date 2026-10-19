import { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DemoBadge } from './DemoBadge';

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

interface SensorChartProps {
  data: Array<Record<string, number | string>>;
  series: ChartSeries[];
  xKey: string;
  height?: number;
  unit?: string;
  type?: 'area' | 'line';
  isDemo?: boolean;
  title?: string;
  action?: ReactNode;
}

const tooltipStyle = {
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  fontSize: 12,
  boxShadow: '0 4px 16px -2px rgba(16,40,12,0.08)',
  padding: '8px 12px',
};

export function SensorChart({
  data,
  series,
  xKey,
  height = 240,
  unit,
  type = 'area',
  isDemo,
  title,
  action,
}: SensorChartProps) {
  const Chart = type === 'area' ? AreaChart : LineChart;
  return (
    <div className="card p-5">
      {(title || isDemo || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {title && <h3 className="font-semibold text-gray-800">{title}</h3>}
            {isDemo && <DemoBadge />}
          </div>
          {action}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2eb" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={48}
            unit={unit}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: '#6b7280', fontWeight: 500 }}
            formatter={(value: any, name: any) => [
              `${value ?? ''}${unit ?? ''}`,
              name,
            ]}
          />
          {series.map((s) =>
            type === 'area' ? (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2.5}
                fill={`url(#grad-${s.key})`}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive
              />
            ) : (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive
              />
            )
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

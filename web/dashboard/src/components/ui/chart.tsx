'use client';

import * as React from 'react';
import {
  Legend as RechartsLegend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { cn } from '@/lib/utils';

export type ChartConfig = Record<
  string,
  {
    label?: string;
    color?: string;
  }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error('Chart components must be used inside ChartContainer.');
  }
  return context;
}

export function ChartContainer({
  config,
  className,
  children,
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
}) {
  const style = React.useMemo(() => {
    const vars: Record<string, string> = {};
    for (const [key, value] of Object.entries(config)) {
      if (value.color) {
        vars[`--color-${key}`] = value.color;
      }
    }
    return vars as React.CSSProperties;
  }, [config]);

  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn('min-w-0', className)} style={style}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsTooltip;
export const ChartLegend = RechartsLegend;

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  indicator = 'line',
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    value?: number;
    color?: string;
    name?: string;
  }>;
  label?: string;
  labelFormatter?: (value: string) => React.ReactNode;
  indicator?: 'line' | 'dot';
}) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-sm">
      {label ? (
        <div className="mb-2 font-medium text-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        {payload.map((item) => {
          const key = String(item.dataKey || item.name || 'value');
          const entry = config[key];
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    indicator === 'dot'
                      ? 'size-2 rounded-full'
                      : 'h-2 w-3 rounded-sm',
                  )}
                  style={{
                    backgroundColor: item.color || `var(--color-${key})`,
                  }}
                />
                <span className="text-muted-foreground">
                  {entry?.label || item.name || key}
                </span>
              </div>
              <span className="font-medium text-foreground">
                {item.value ?? 0}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChartLegendContent({
  payload,
}: {
  payload?: Array<{ dataKey?: string; color?: string; value?: string }>;
}) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-3 text-xs text-muted-foreground">
      {payload.map((item) => {
        const key = String(item.dataKey || item.value || 'value');
        const entry = config[key];
        return (
          <div key={key} className="flex items-center gap-2">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: item.color || `var(--color-${key})` }}
            />
            <span>{entry?.label || item.value || key}</span>
          </div>
        );
      })}
    </div>
  );
}

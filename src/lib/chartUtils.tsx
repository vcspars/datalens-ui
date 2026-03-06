/**
 * Shared chart helpers for GraphPreview, ConvertToGraphDialog, and dashboard previews.
 */
import React from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

export type GraphType = "bar" | "line" | "pie" | "area" | "scatter";

export interface ColumnMeta {
  name: string;
  isNumeric: boolean;
  isCategorical: boolean;
  uniqueCount: number;
}

export const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6",
];

const legendFormatter = (value: string) => (
  <span style={{ fontSize: 10 }}>{value}</span>
);

/** Custom legend content: 12 items per column, then new column to the right. Used only for export modal. */
function MultiColumnLegendContent({
  payload = [],
  formatter,
  columns = 12,
}: {
  payload?: Array<{ value?: string; color?: string; inactive?: boolean; type?: string }>;
  formatter?: (value: string, entry: unknown, index: number) => React.ReactNode;
  columns?: number;
}) {
  if (!payload.length) return null;
  return (
    <ul
      className="recharts-default-legend"
      style={{
        display: "grid",
        gridAutoFlow: "column",
        gridTemplateRows: `repeat(${columns}, auto)`,
        gap: "2px 12px",
        listStyle: "none",
        padding: 0,
        margin: 0,
        textAlign: "left",
      }}
    >
      {payload.map((entry, i) => {
        if ((entry as { type?: string }).type === "none") return null;
        const value = typeof entry.value !== "function" ? entry.value : "";
        const color = entry.inactive ? "#ccc" : entry.color;
        return (
          <li
            key={`legend-item-${i}`}
            className="recharts-legend-item"
            style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 0 }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                flexShrink: 0,
                backgroundColor: color,
                borderRadius: 2,
              }}
            />
            <span className="recharts-legend-item-text" style={{ color, fontSize: 10 }}>
              {formatter ? formatter(String(value ?? ""), entry, i) : value}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Strip $, commas, currency symbols before parsing so values like $10,000 or 10,000 parse correctly. */
function parseNumericValue(raw: string): number {
  if (!raw || typeof raw !== "string") return NaN;
  const cleaned = String(raw).replace(/[$€£¥,\s]/g, "").trim();
  return parseFloat(cleaned);
}

export function detectColumnMeta(data: Record<string, string>[], columns: string[]): ColumnMeta[] {
  return columns.map((col) => {
    const values = data.map((r) => r[col]).filter((v) => v !== undefined && v !== "");
    const numericCount = values.filter((v) => !isNaN(parseNumericValue(v))).length;
    const uniqueValues = new Set(values);
    return {
      name: col,
      isNumeric: numericCount / Math.max(values.length, 1) > 0.8,
      isCategorical: uniqueValues.size < 30 && numericCount / Math.max(values.length, 1) < 0.5,
      uniqueCount: uniqueValues.size,
    };
  });
}

export function getAvailableGraphTypes(colMeta: ColumnMeta[]): GraphType[] {
  const numericCols = colMeta.filter((c) => c.isNumeric);
  const catCols = colMeta.filter((c) => c.isCategorical);
  const types: GraphType[] = [];

  if (numericCols.length >= 1 && catCols.length >= 1) {
    types.push("bar", "line", "area", "pie");
  }
  if (numericCols.length >= 2) {
    types.push("scatter");
  }
  if (types.length === 0) {
    types.push("bar");
  }
  return [...new Set(types)];
}

export function prepareChartData(
  data: Record<string, string>[],
  xKey: string,
  yKey: string
): Record<string, unknown>[] {
  return data.slice(0, 100).map((row) => ({
    ...row,
    [xKey]: row[xKey],
    [yKey]: parseNumericValue(row[yKey]) || 0,
  }));
}

export interface RenderChartOptions {
  /** When true, legend does not use scroll (e.g. for export so scrollbar is not captured). */
  noLegendScroll?: boolean;
  /** When set (e.g. 12), legend items are laid out in columns with this many rows per column; overflow goes to columns to the right. */
  legendColumns?: number;
}

export function renderChart(
  type: GraphType,
  data: Record<string, unknown>[],
  xKey: string,
  yKey: string,
  colors: string[] = CHART_COLORS,
  options?: RenderChartOptions
): React.ReactNode {
  const commonProps = {
    data,
    margin: { top: 20, right: 20, left: 20, bottom: 40 },
  };

  switch (type) {
    case "bar":
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ marginTop: 16 }} formatter={legendFormatter} />
          <Bar dataKey={yKey} fill={colors[0]} radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    case "line":
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ marginTop: 16 }} formatter={legendFormatter} />
          <Line type="monotone" dataKey={yKey} stroke={colors[0]} strokeWidth={2} dot={false} />
        </LineChart>
      );
    case "area":
      return (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ marginTop: 16 }} formatter={legendFormatter} />
          <Area type="monotone" dataKey={yKey} stroke={colors[0]} fill={`${colors[0]}33`} strokeWidth={2} />
        </AreaChart>
      );
    case "pie":
      return (
        <PieChart margin={{ top: 40, right: 80, bottom: 32, left: 24 }}>
          <Pie
            data={data}
            dataKey={yKey}
            nameKey={xKey}
            cx="43%"
            cy="49%"
            outerRadius={80}
            label
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            content={
              options?.legendColumns ? (
                <MultiColumnLegendContent columns={options.legendColumns} />
              ) : undefined
            }
            wrapperStyle={{
              paddingLeft: -10,
              marginLeft: 18,
              ...(options?.noLegendScroll
                ? { maxHeight: "none", overflow: "visible" }
                : { maxHeight: 220, overflowY: "auto", overflowX: "hidden" }),
            }}
            formatter={legendFormatter}
          />
        </PieChart>
      );
    case "scatter":
      return (
        <ScatterChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey={xKey} name={xKey} tick={{ fontSize: 11 }} />
          <YAxis dataKey={yKey} name={yKey} tick={{ fontSize: 11 }} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Legend wrapperStyle={{ marginTop: 16 }} formatter={legendFormatter} />
          <Scatter data={data} fill={colors[0]} />
        </ScatterChart>
      );
    default:
      return null;
  }
}

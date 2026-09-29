/**
 * InlineCharts — read-only charts the assistant chose to render alongside its
 * answer. The agent proposes a `charts` spec array in its response; each entry
 * points at a table (by index) plus an x/y column. We render them with the
 * shared Recharts helpers used by the manual "Convert to Graph" feature.
 *
 * This is intentionally minimal (no axis/type pickers) — for interactive
 * editing the user still uses the Graphs tab via "Convert to Graph".
 */
import { type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";
import {
  prepareChartData,
  renderChart,
  CHART_COLORS,
  type GraphType,
} from "@/lib/chartUtils";

export interface ChartSpec {
  type: GraphType;
  tableIndex: number;
  xKey: string;
  yKey: string;
  title?: string;
}

interface TableEntry {
  columns: string[];
  data: Record<string, string>[];
}

interface InlineChartsProps {
  charts?: ChartSpec[];
  tables?: TableEntry[];
}

const ALLOWED_TYPES: GraphType[] = ["bar", "line", "pie", "area", "scatter"];

export default function InlineCharts({ charts, tables }: InlineChartsProps) {
  if (!charts?.length || !tables?.length) return null;

  // Only render charts whose referenced table + columns actually exist. The
  // backend already validates this, but we guard again so a malformed spec
  // never crashes the message bubble.
  const valid = charts.filter((c) => {
    if (!c || !ALLOWED_TYPES.includes(c.type)) return false;
    const t = tables[c.tableIndex ?? 0];
    return (
      !!t &&
      Array.isArray(t.data) &&
      t.data.length > 0 &&
      Array.isArray(t.columns) &&
      t.columns.includes(c.xKey) &&
      t.columns.includes(c.yKey)
    );
  });

  if (valid.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {valid.map((c, i) => {
        const t = tables[c.tableIndex ?? 0];
        const data = prepareChartData(t.data, c.xKey, c.yKey);
        return (
          <div
            key={`${c.type}-${c.xKey}-${c.yKey}-${i}`}
            className="bg-white border border-border rounded-lg p-3"
          >
            {c.title ? (
              <p className="text-xs xl:text-sm font-medium text-foreground mb-1.5">
                {c.title}
              </p>
            ) : null}
            <ResponsiveContainer width="100%" height={260}>
              {renderChart(c.type, data, c.xKey, c.yKey, CHART_COLORS, {
                multiColor: true,
              }) as ReactElement}
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}

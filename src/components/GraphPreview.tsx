/**
 * GraphPreview component
 * - Detects column data types to suggest appropriate graph types
 * - Lets user pick graph type, X-axis, Y-axis
 * - Renders chart with Recharts
 * - Action buttons: Download (PNG/SVG/JPG), Convert (change graph type), Save to Dashboard
 */
import { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { toPng, toSvg, toJpeg } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { saveDashboardGraph } from "@/lib/api";
import SaveNameModal from "@/components/SaveNameModal";
import {
  Download,
  BookmarkPlus,
  Loader2,
  BarChart2,
  TrendingUp,
  PieChart as PieIcon,
  Activity,
  Circle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type GraphType = "bar" | "line" | "pie" | "area" | "scatter";

interface GraphPreviewProps {
  tableData: Record<string, string>[];
  tableColumns: string[];
  sourceQuestion?: string;
}

interface ColumnMeta {
  name: string;
  isNumeric: boolean;
  isCategorical: boolean;
  uniqueCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6",
];

function detectColumnMeta(data: Record<string, string>[], columns: string[]): ColumnMeta[] {
  return columns.map((col) => {
    const values = data.map((r) => r[col]).filter((v) => v !== undefined && v !== "");
    const numericCount = values.filter((v) => !isNaN(parseFloat(v))).length;
    const uniqueValues = new Set(values);
    return {
      name: col,
      isNumeric: numericCount / Math.max(values.length, 1) > 0.8,
      isCategorical: uniqueValues.size < 30 && numericCount / Math.max(values.length, 1) < 0.5,
      uniqueCount: uniqueValues.size,
    };
  });
}

function getAvailableGraphTypes(colMeta: ColumnMeta[]): GraphType[] {
  const numericCols = colMeta.filter((c) => c.isNumeric);
  const catCols = colMeta.filter((c) => c.isCategorical);
  const types: GraphType[] = [];

  if (numericCols.length >= 1 && catCols.length >= 1) {
    types.push("bar", "line", "area");
  }
  if (numericCols.length >= 2) {
    types.push("scatter");
  }
  if (numericCols.length >= 1 && catCols.length === 1 && catCols[0].uniqueCount <= 15) {
    types.push("pie");
  }
  if (types.length === 0) {
    types.push("bar"); // fallback
  }
  return [...new Set(types)];
}

function prepareChartData(
  data: Record<string, string>[],
  xKey: string,
  yKey: string
): Record<string, unknown>[] {
  return data.slice(0, 100).map((row) => ({
    ...row,
    [xKey]: row[xKey],
    [yKey]: parseFloat(row[yKey]) || 0,
  }));
}

const GRAPH_ICONS: Record<GraphType, React.ReactNode> = {
  bar: <BarChart2 className="h-4 w-4" />,
  line: <TrendingUp className="h-4 w-4" />,
  pie: <PieIcon className="h-4 w-4" />,
  area: <Activity className="h-4 w-4" />,
  scatter: <Circle className="h-4 w-4" />,
};

// ---------------------------------------------------------------------------
// Chart renderers
// ---------------------------------------------------------------------------
function renderChart(
  type: GraphType,
  data: Record<string, unknown>[],
  xKey: string,
  yKey: string
) {
  const commonProps = {
    data,
    margin: { top: 10, right: 20, left: 0, bottom: 40 },
  };

  switch (type) {
    case "bar":
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey={yKey} fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    case "line":
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={yKey} stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
        </LineChart>
      );
    case "area":
      return (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey={yKey} stroke={CHART_COLORS[0]} fill={`${CHART_COLORS[0]}33`} strokeWidth={2} />
        </AreaChart>
      );
    case "pie":
      return (
        <PieChart>
          <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={120} label>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      );
    case "scatter":
      return (
        <ScatterChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey={xKey} name={xKey} tick={{ fontSize: 11 }} />
          <YAxis dataKey={yKey} name={yKey} tick={{ fontSize: 11 }} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={data} fill={CHART_COLORS[0]} />
        </ScatterChart>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function GraphPreview({ tableData, tableColumns, sourceQuestion = "" }: GraphPreviewProps) {
  const { toast } = useToast();
  const chartRef = useRef<HTMLDivElement>(null);

  const colMeta = detectColumnMeta(tableData, tableColumns);
  const availableTypes = getAvailableGraphTypes(colMeta);
  const numericCols = colMeta.filter((c) => c.isNumeric).map((c) => c.name);
  const categoryCols = colMeta.filter((c) => c.isCategorical).map((c) => c.name);
  const allCols = tableColumns;

  const [graphType, setGraphType] = useState<GraphType>(availableTypes[0] || "bar");
  const [xKey, setXKey] = useState<string>(categoryCols[0] || allCols[0] || "");
  const [yKey, setYKey] = useState<string>(numericCols[0] || allCols[1] || "");
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  const chartData = prepareChartData(tableData, xKey, yKey);

  // When graph type changes, suggest valid axes
  useEffect(() => {
    if (graphType === "pie") {
      if (!categoryCols.includes(xKey) && categoryCols.length > 0) setXKey(categoryCols[0]);
      if (!numericCols.includes(yKey) && numericCols.length > 0) setYKey(numericCols[0]);
    } else if (graphType === "scatter") {
      if (!numericCols.includes(xKey) && numericCols.length > 0) setXKey(numericCols[0]);
      if (!numericCols.includes(yKey) && numericCols.length > 1) setYKey(numericCols[1]);
    }
  }, [graphType]);

  const handleDownload = async (format: "png" | "svg" | "jpg") => {
    if (!chartRef.current) return;
    setDownloading(true);
    console.log("[GraphPreview] Downloading chart as:", format);
    try {
      const el = chartRef.current;
      // Wait for Recharts animations to finish before capturing
      await new Promise((r) => setTimeout(r, 150));
      const opts = {
        width: el.offsetWidth || 600,
        height: el.offsetHeight || 320,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      };
      let dataUrl: string;
      if (format === "png") dataUrl = await toPng(el, opts);
      else if (format === "jpg") dataUrl = await toJpeg(el, { ...opts, quality: 0.95 });
      else dataUrl = await toSvg(el, opts);

      const link = document.createElement("a");
      link.download = `chart-${Date.now()}.${format}`;
      link.href = dataUrl;
      link.click();
      toast({ title: "Downloaded", description: `Chart saved as ${format.toUpperCase()}` });
    } catch (err) {
      console.error("[GraphPreview] Download error:", err);
      toast({ title: "Download failed", description: String(err), variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveConfirm = async (name: string) => {
    setSaving(true);
    console.log(`[GraphPreview] Saving graph "${name}" to dashboard:`, graphType, xKey, yKey);
    try {
      await saveDashboardGraph({
        name,
        graph_type: graphType,
        graph_config: { xKey, yKey, data: chartData, colors: CHART_COLORS },
        table_data: tableData as Record<string, string>[],
        table_columns: tableColumns,
        source_question: sourceQuestion,
      });
      toast({ title: "Saved", description: "Chart saved to your dashboard." });
    } catch (err) {
      console.error("[GraphPreview] Save error:", err);
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getValidXCols = () => {
    if (graphType === "pie") return categoryCols.length > 0 ? categoryCols : allCols;
    if (graphType === "scatter") return numericCols.length > 0 ? numericCols : allCols;
    return allCols;
  };

  const getValidYCols = () => {
    if (graphType === "pie" || graphType === "bar" || graphType === "line" || graphType === "area" || graphType === "scatter")
      return numericCols.length > 0 ? numericCols : allCols;
    return allCols;
  };

  if (!tableData.length || !tableColumns.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3 p-8">
        <BarChart2 className="h-12 w-12 opacity-30" />
        <p className="text-sm font-medium">No table data to visualize</p>
        <p className="text-xs">Ask a question that returns tabular results, then click "Convert to Graph".</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Controls */}
      <div className="grid grid-cols-1 gap-3 p-1">
        {/* Graph type */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Chart Type</Label>
          <div className="flex gap-2 flex-wrap">
            {availableTypes.map((type) => (
              <Button
                key={type}
                size="sm"
                variant={graphType === type ? "default" : "outline"}
                className="h-8 text-xs gap-1.5 capitalize"
                onClick={() => {
                  console.log("[GraphPreview] Graph type changed to:", type);
                  setGraphType(type);
                }}
              >
                {GRAPH_ICONS[type]}
                {type}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* X-axis */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {graphType === "pie" ? "Category" : "X-Axis"}
            </Label>
            <Select value={xKey} onValueChange={(v) => { console.log("[GraphPreview] X-axis:", v); setXKey(v); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getValidXCols().map((col) => (
                  <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Y-axis */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {graphType === "pie" ? "Value" : "Y-Axis"}
            </Label>
            <Select value={yKey} onValueChange={(v) => { console.log("[GraphPreview] Y-axis:", v); setYKey(v); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getValidYCols().map((col) => (
                  <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Chart — explicit pixel height ensures html-to-image captures non-blank output */}
      <div ref={chartRef} className="bg-white border border-border rounded-lg p-3 flex-1" style={{ minHeight: 300 }}>
        <ResponsiveContainer width="100%" height={300}>
          {renderChart(graphType, chartData, xKey, yKey) as React.ReactElement}
        </ResponsiveContainer>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pb-1">
        {/* Download */}
        <div className="flex items-center gap-1">
          {(["png", "jpg", "svg"] as const).map((fmt) => (
            <Button
              key={fmt}
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => handleDownload(fmt)}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
              {fmt.toUpperCase()}
            </Button>
          ))}
        </div>

        {/* Save to Dashboard */}
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs gap-1.5 ml-auto"
          onClick={() => setSaveModalOpen(true)}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <BookmarkPlus className="h-3 w-3" />
          )}
          Save to Dashboard
        </Button>
      </div>

      <SaveNameModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onConfirm={handleSaveConfirm}
        title="Save Chart to Dashboard"
        placeholder="e.g. Monthly Revenue Bar Chart"
        defaultName={`${graphType.charAt(0).toUpperCase() + graphType.slice(1)} Chart — ${new Date().toLocaleString()}`}
      />
    </div>
  );
}

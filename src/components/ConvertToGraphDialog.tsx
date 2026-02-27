/**
 * Dialog to configure a chart before adding it to the Graphs tab.
 * Collects: table (if multiple), graph type, X-axis, Y-axis.
 */
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  detectColumnMeta,
  getAvailableGraphTypes,
  type GraphType,
  type ColumnMeta,
} from "@/lib/chartUtils";
import { BarChart2, TrendingUp, PieChart as PieIcon, Activity, Circle } from "lucide-react";

const GRAPH_ICONS: Record<GraphType, React.ReactNode> = {
  bar: <BarChart2 className="h-4 w-4" />,
  line: <TrendingUp className="h-4 w-4" />,
  pie: <PieIcon className="h-4 w-4" />,
  area: <Activity className="h-4 w-4" />,
  scatter: <Circle className="h-4 w-4" />,
};

export interface ConvertToGraphMessage {
  content?: string;
  table_data?: Record<string, string>[];
  table_columns?: string[];
  tables?: { columns: string[]; data: Record<string, string>[] }[];
}

export interface ConvertToGraphConfig {
  tableIndex: number;
  graphType: GraphType;
  xKey: string;
  yKey: string;
}

interface ConvertToGraphDialogProps {
  open: boolean;
  onClose: () => void;
  message: ConvertToGraphMessage | null;
  onConfirm: (config: ConvertToGraphConfig) => void;
}

function getTableData(message: ConvertToGraphMessage | null, tableIndex: number): { data: Record<string, string>[]; columns: string[] } {
  if (!message) return { data: [], columns: [] };
  if (message.tables && message.tables.length > 0) {
    const t = message.tables[tableIndex] ?? message.tables[0];
    return { data: t.data, columns: t.columns };
  }
  return {
    data: message.table_data || [],
    columns: message.table_columns || [],
  };
}

export default function ConvertToGraphDialog({
  open,
  onClose,
  message,
  onConfirm,
}: ConvertToGraphDialogProps) {
  const [tableIndex, setTableIndex] = useState(0);
  const [graphType, setGraphType] = useState<GraphType>("bar");
  const [xKey, setXKey] = useState("");
  const [yKey, setYKey] = useState("");

  const tables = message?.tables && message.tables.length > 0 ? message.tables : null;
  const { data: tableData, columns: tableColumns } = getTableData(message, tableIndex);

  const colMeta: ColumnMeta[] = detectColumnMeta(tableData, tableColumns);
  const availableTypes = getAvailableGraphTypes(colMeta);
  const numericCols = colMeta.filter((c) => c.isNumeric).map((c) => c.name);
  const categoryCols = colMeta.filter((c) => c.isCategorical).map((c) => c.name);
  const allCols = tableColumns;

  const getValidXCols = () => {
    if (graphType === "pie") return categoryCols.length > 0 ? categoryCols : allCols;
    if (graphType === "scatter") return numericCols.length > 0 ? numericCols : allCols;
    return allCols;
  };

  const getValidYCols = () => {
    return numericCols.length > 0 ? numericCols : allCols;
  };

  // Reset table selection when dialog opens
  useEffect(() => {
    if (open) setTableIndex(0);
  }, [open]);

  // Reset / derive state when dialog opens or table selection changes
  useEffect(() => {
    if (!open || !tableColumns.length) return;
    const types = getAvailableGraphTypes(colMeta);
    const gType = (types.includes(graphType) ? graphType : types[0]) as GraphType;
    setGraphType(gType);
    const catCols = colMeta.filter((c) => c.isCategorical).map((c) => c.name);
    const numCols = colMeta.filter((c) => c.isNumeric).map((c) => c.name);
    setXKey(catCols[0] || allCols[0] || "");
    setYKey(numCols[0] || allCols[1] || "");
  }, [open, tableIndex, tableColumns.join(",")]);

  // When graph type changes, adjust axes to valid values
  useEffect(() => {
    const xCols = getValidXCols();
    const yCols = getValidYCols();
    if (xCols.length && !xCols.includes(xKey)) setXKey(xCols[0]);
    if (yCols.length && !yCols.includes(yKey)) setYKey(yCols[0]);
  }, [graphType]);

  const handleConfirm = () => {
    if (!xKey || !yKey) return;
    onConfirm({ tableIndex, graphType, xKey, yKey });
    onClose();
  };

  const canConfirm = tableData.length > 0 && tableColumns.length > 0 && xKey && yKey;

  if (!message) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Graphs</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {tables && tables.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Table</Label>
              <Select value={String(tableIndex)} onValueChange={(v) => setTableIndex(Number(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((t, i) => (
                    <SelectItem key={i} value={String(i)} className="text-xs">
                      Table {i + 1} ({t.columns.length} cols)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {tableData.length > 0 && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Chart type</Label>
                <div className="flex gap-2 flex-wrap">
                  {availableTypes.map((type) => (
                    <Button
                      key={type}
                      size="sm"
                      variant={graphType === type ? "default" : "outline"}
                      className="h-8 text-xs gap-1.5 capitalize"
                      onClick={() => setGraphType(type)}
                    >
                      {GRAPH_ICONS[type]}
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {graphType === "pie" ? "Category" : "X-Axis"}
                  </Label>
                  <Select value={xKey} onValueChange={setXKey}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getValidXCols().map((col) => (
                        <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {graphType === "pie" ? "Value" : "Y-Axis"}
                  </Label>
                  <Select value={yKey} onValueChange={setYKey}>
                    <SelectTrigger className="h-9 text-xs">
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
            </>
          )}

          {tableData.length === 0 && (
            <p className="text-sm text-muted-foreground">No table data to visualize.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            Add to Graphs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

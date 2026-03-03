import { useState, useEffect } from "react";
import Header from "@/components/Header";
import MarkdownMessage from "@/components/MarkdownMessage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import GenerateReportDialog from "@/components/GenerateReportDialog";
import { renderChart, CHART_COLORS, type GraphType } from "@/lib/chartUtils";
import {
  BarChart3, Table2, FileText, Trash2, Eye, Download, Loader2, RefreshCw, Info, Maximize2,
} from "lucide-react";
import { ResponsiveContainer } from "recharts";
import {
  getDashboardItems,
  getDashboardReports,
  deleteDashboardItem,
  deleteDashboardReport,
  streamGenerateReport,
  saveDashboardReport,
  downloadDashboardReportPdf,
  type DashboardItemOut,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// SSE parser (same as ChatWithDatabase)
// ---------------------------------------------------------------------------
function parseSSELine(line: string): { type: string; [key: string]: unknown } | null {
  const t = line.trim();
  if (!t.startsWith("data: ")) return null;
  try { return JSON.parse(t.slice(6)); } catch { return null; }
}

// ---------------------------------------------------------------------------
// View Report Modal — shows real markdown content
// ---------------------------------------------------------------------------
function ViewReportModal({
  report,
  selectedItems,
  onClose,
}: {
  report: DashboardItemOut | null;
  selectedItems: DashboardItemOut[];
  onClose: () => void;
}) {
  if (!report) return null;

  return (
    <Dialog open={!!report} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {report.name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 border rounded-lg p-4 bg-muted/20 max-h-[60vh] overflow-auto space-y-4">
          <div>
            <MarkdownMessage content={report.report_content || "No content available."} />
          </div>
          {selectedItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Selected Items</h3>
              <ul className="space-y-1 text-xs">
                {selectedItems.map((item) => (
                  <li key={item.id} className="flex justify-between gap-2 border-b border-border/40 pb-1">
                    <span className="truncate">
                      {item.name}{" "}
                      <span className="text-muted-foreground">
                        ({item.item_type}{item.graph_type ? ` · ${item.graph_type}` : ""})
                      </span>
                    </span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 flex-shrink-0">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function MyDashboard() {
  const { toast } = useToast();
  const [items, setItems] = useState<DashboardItemOut[]>([]);
  const [reports, setReports] = useState<DashboardItemOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewReport, setViewReport] = useState<DashboardItemOut | null>(null);
  const [metaItem, setMetaItem] = useState<DashboardItemOut | null>(null);
  const [previewItem, setPreviewItem] = useState<DashboardItemOut | null>(null);

  const [itemTypeFilter, setItemTypeFilter] = useState<"all" | "table" | "graph">("all");
  const [graphTypeFilter, setGraphTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "24h" | "7d" | "30d">("all");

  const loadData = async () => {
    console.log("[MyDashboard] Loading dashboard data...");
    setLoading(true);
    try {
      const [fetchedItems, fetchedReports] = await Promise.all([
        getDashboardItems(),
        getDashboardReports(),
      ]);
      console.log(`[MyDashboard] Loaded ${fetchedItems.length} items, ${fetchedReports.length} reports`);
      setItems(fetchedItems);
      setReports(fetchedReports);
    } catch (err) {
      console.error("[MyDashboard] Load error:", err);
      toast({ title: "Error loading dashboard", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Delete this item from your dashboard?")) return;
    console.log("[MyDashboard] Deleting item:", id);
    try {
      await deleteDashboardItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast({ title: "Deleted", description: "Item removed from dashboard." });
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm("Delete this report?")) return;
    console.log("[MyDashboard] Deleting report:", id);
    try {
      await deleteDashboardReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Deleted", description: "Report removed." });
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    }
  };

  // Called by GenerateReportDialog — streams and saves the report
  const handleGenerateReport = async (
    reportName: string,
    selectedItemIds: string[],
    instructions: string,
  ) => {
    console.log("[MyDashboard] Generating report:", reportName, "items:", selectedItemIds);
    const reader = await streamGenerateReport({
      name: reportName,
      item_ids: selectedItemIds,
      template: "executive",
      prompt: instructions,
    });

    const decoder = new TextDecoder();
    let buffer = "";
    let accumulated = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const event = parseSSELine(line);
        if (!event) continue;
        if (event.type === "token") {
          accumulated += event.content as string;
        } else if (event.type === "done") {
          accumulated = (event.full_report as string) || accumulated;
        } else if (event.type === "error") {
          throw new Error(event.content as string);
        }
      }
    }

    if (accumulated) {
      await saveDashboardReport({
        name: reportName,
        content: accumulated,
        template: "executive",
        item_ids: selectedItemIds,
      });
      console.log("[MyDashboard] Report saved:", reportName);
      await loadData();
    }
  };

  // Derive report items for GenerateReportDialog
  const reportItems = items.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.item_type as "graph" | "table",
  }));

  // Filtered items for Saved Items grid
  const filteredItems = items.filter((item) => {
    if (itemTypeFilter !== "all" && item.item_type !== itemTypeFilter) {
      return false;
    }
    if (itemTypeFilter === "graph" && graphTypeFilter !== "all") {
      if (!item.graph_type || item.graph_type !== graphTypeFilter) return false;
    }
    if (dateFilter !== "all") {
      const created = new Date(item.created_at);
      if (!Number.isFinite(created.getTime())) return false;
      const now = Date.now();
      const diff = now - created.getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      if (dateFilter === "24h" && diff > dayMs) return false;
      if (dateFilter === "7d" && diff > 7 * dayMs) return false;
      if (dateFilter === "30d" && diff > 30 * dayMs) return false;
    }
    return true;
  });

  const hasPrompt =
    !!(metaItem?.source_prompt && metaItem.source_prompt.trim().length > 0);

  const hasResponse =
    !!(metaItem?.source_response && metaItem.source_response.trim().length > 0);

  const getSelectedItemsForReport = (report: DashboardItemOut | null): DashboardItemOut[] => {
    if (!report?.metadata) return [];
    const rawIds = (report.metadata["item_ids"] as string[] | undefined) ?? [];
    if (!Array.isArray(rawIds) || rawIds.length === 0) return [];
    return items.filter((i) => rawIds.includes(i.id));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto p-6 max-w-7xl">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Your saved charts, tables, and generated reports
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <GenerateReportDialog items={reportItems} onGenerate={handleGenerateReport} />
          </div>
        </div>

        <Tabs defaultValue="items" className="w-full">
          <div className="flex items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="items">
                Saved Items
                {items.length > 0 && (
                  <span className="ml-1.5 text-xs bg-primary/10 text-primary rounded-full px-1.5">
                    {items.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="reports">
                My Reports
                {reports.length > 0 && (
                  <span className="ml-1.5 text-xs bg-primary/10 text-primary rounded-full px-1.5">
                    {reports.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 text-xs">
              <Select value={itemTypeFilter} onValueChange={(v) => setItemTypeFilter(v as "all" | "table" | "graph")}>
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All items</SelectItem>
                  <SelectItem value="table">Tables</SelectItem>
                  <SelectItem value="graph">Graphs</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={graphTypeFilter}
                onValueChange={(v) => setGraphTypeFilter(v)}
                disabled={itemTypeFilter !== "graph"}
              >
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue placeholder="Graph type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All graphs</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="pie">Pie</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                  <SelectItem value="scatter">Scatter</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as "all" | "24h" | "7d" | "30d")}>
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ---- Saved Items ---- */}
          <TabsContent value="items" className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                <BarChart3 className="h-12 w-12 opacity-30" />
                <p className="text-sm font-medium">No saved items yet</p>
                <p className="text-xs text-center max-w-xs">
                  Go to Chat with Database, ask a question that returns a table, then click
                  "Save to Dashboard" or "Convert to Graph".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="group relative h-full flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="flex items-center gap-2 text-base">
                            {item.item_type === "graph" ? (
                              <BarChart3 className="h-4 w-4 text-primary flex-shrink-0" />
                            ) : (
                              <Table2 className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                            <span className="truncate">{item.name}</span>
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {new Date(item.created_at).toLocaleDateString()} ·{" "}
                            <span className="capitalize">{item.item_type}</span>
                            {item.graph_type && ` · ${item.graph_type}`}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full bg-background/80 backdrop-blur border border-border shadow-sm flex items-center justify-center"
                            onClick={() => setMetaItem(item)}
                            aria-label="Show source details"
                          >
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full bg-background/80 backdrop-blur border border-border shadow-sm flex items-center justify-center"
                            onClick={() => setPreviewItem(item)}
                            aria-label="Enlarge view"
                          >
                            <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-1 flex flex-col h-full">
                      {/* Real preview: table or chart */}
                      {item.item_type === "table" && item.table_columns?.length > 0 ? (
                        <div className="h-72 border rounded-lg overflow-hidden mb-3 bg-muted mt-1">
                          <div className="h-full w-full overflow-auto">
                            <div className="inline-block min-w-full align-middle p-2">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr>
                                  {item.table_columns.map((col) => (
                                    <th key={col} className="text-left font-medium px-2 py-1.5 border border-border bg-muted/50 whitespace-nowrap">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {(item.table_data || []).slice(0, 10).map((row, ri) => (
                                  <tr key={ri}>
                                    {item.table_columns!.map((col) => (
                                      <td key={col} className="px-2 py-1.5 border border-border whitespace-nowrap" title={String(row[col] ?? "")}>
                                        {String(row[col] ?? "")}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                            </div>
                          </div>
                      ) : item.item_type === "graph" && item.graph_config && item.graph_type ? (
                        <div className="h-72 bg-muted rounded-lg mb-3 mt-1">
                          <ResponsiveContainer width="100%" height="100%">
                            {renderChart(
                              item.graph_type as GraphType,
                              (item.graph_config.data as Record<string, unknown>[]) || [],
                              (item.graph_config.xKey as string) || "",
                              (item.graph_config.yKey as string) || "",
                              (item.graph_config.colors as string[]) || CHART_COLORS
                            ) as React.ReactElement}
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-72 flex items-center justify-center rounded-lg bg-muted/50 mb-3 mt-1">
                          {item.item_type === "graph" ? (
                            <BarChart3 className="h-12 w-12 text-muted-foreground/40" />
                          ) : (
                            <Table2 className="h-12 w-12 text-muted-foreground/40" />
                          )}
                        </div>
                      )}
                      <div className="flex justify-end mt-auto pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ---- Reports ---- */}
          <TabsContent value="reports" className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                <FileText className="h-12 w-12 opacity-30" />
                <p className="text-sm font-medium">No reports yet</p>
                <p className="text-xs">Click "Generate PDF Report" above to create your first report.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((report) => (
                  <Card key={report.id} className="group">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="truncate">{report.name}</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(report.created_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => {
                            console.log("[MyDashboard] Viewing report:", report.id);
                            setViewReport(report);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          View Report
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={async () => {
                            console.log("[MyDashboard] Downloading report PDF:", report.id);
                            try {
                              const blob = await downloadDashboardReportPdf(report.id);
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `${report.name.replace(/\s+/g, "-").toLowerCase()}.pdf`;
                              a.click();
                              URL.revokeObjectURL(url);
                            } catch (err) {
                              console.error("[MyDashboard] Report PDF download failed:", err);
                              toast({ title: "Download failed", description: String(err), variant: "destructive" });
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteReport(report.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* View Report Modal */}
      <ViewReportModal
        report={viewReport}
        selectedItems={getSelectedItemsForReport(viewReport)}
        onClose={() => setViewReport(null)}
      />

      {/* Large preview modal for saved items */}
      <Dialog open={!!previewItem} onOpenChange={(v) => !v && setPreviewItem(null)}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewItem?.item_type === "graph" ? (
                <BarChart3 className="h-4 w-4 text-primary" />
              ) : (
                <Table2 className="h-4 w-4 text-primary" />
              )}
              <span className="truncate">{previewItem?.name}</span>
            </DialogTitle>
            {previewItem && (
              <p className="text-xs text-muted-foreground">
                {new Date(previewItem.created_at).toLocaleString()} ·{" "}
                <span className="capitalize">{previewItem.item_type}</span>
                {previewItem.graph_type && ` · ${previewItem.graph_type}`}
              </p>
            )}
          </DialogHeader>
          <div className="flex-1 mt-2">
            {previewItem?.item_type === "table" && previewItem.table_columns?.length > 0 ? (
              <div className="h-full border rounded-lg bg-muted overflow-auto">
                <div className="inline-block min-w-full align-middle p-3">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        {previewItem.table_columns.map((col) => (
                          <th
                            key={col}
                            className="text-left font-medium px-2 py-2 border border-border bg-muted/50 whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(previewItem.table_data || []).map((row, ri) => (
                        <tr key={ri}>
                          {previewItem.table_columns!.map((col) => (
                            <td
                              key={col}
                              className="px-2 py-1.5 border border-border whitespace-nowrap"
                              title={String(row[col] ?? "")}
                            >
                              {String(row[col] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : previewItem?.item_type === "graph" && previewItem.graph_config && previewItem.graph_type ? (
              <div className="h-[420px] border rounded-lg bg-muted">
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart(
                    previewItem.graph_type as GraphType,
                    (previewItem.graph_config.data as Record<string, unknown>[]) || [],
                    (previewItem.graph_config.xKey as string) || "",
                    (previewItem.graph_config.yKey as string) || "",
                    (previewItem.graph_config.colors as string[]) || CHART_COLORS
                  ) as React.ReactElement}
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-full border rounded-lg bg-muted/50 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No preview available for this item.</p>
              </div>
            )}
          </div>
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setPreviewItem(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Source details modal for saved items */}
      <Dialog open={!!metaItem} onOpenChange={(v) => !v && setMetaItem(null)}>
        <DialogContent className="max-w-xl w-[95vw] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <span className="truncate">
                {metaItem?.name}
              </span>
            </DialogTitle>
            {metaItem && (
              <p className="text-xs text-muted-foreground">
                {new Date(metaItem.created_at).toLocaleString()} ·{" "}
                <span className="capitalize">{metaItem.item_type}</span>
                {metaItem.graph_type && ` · ${metaItem.graph_type}`}
              </p>
            )}
          </DialogHeader>
          <div className="flex-1 border rounded-lg p-4 bg-muted/20 overflow-auto space-y-4 text-sm">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Prompt
              </h3>
              {hasPrompt ? (
                <MarkdownMessage content={metaItem?.source_prompt || ""} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Prompt not available for this item.
                </p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                AI response snippet
              </h3>
              {hasResponse ? (
                <MarkdownMessage content={metaItem?.source_response || ""} />
              ) : metaItem?.source_question && metaItem.source_question.trim().length > 0 ? (
                <MarkdownMessage content={metaItem.source_question} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  No response snippet captured for this item.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setMetaItem(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

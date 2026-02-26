import { useState, useEffect } from "react";
import Header from "@/components/Header";
import MarkdownMessage from "@/components/MarkdownMessage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import GenerateReportDialog from "@/components/GenerateReportDialog";
import {
  BarChart3, Table2, FileText, Trash2, Eye, Download, Loader2, RefreshCw,
} from "lucide-react";
import {
  getDashboardItems,
  getDashboardReports,
  deleteDashboardItem,
  deleteDashboardReport,
  streamGenerateReport,
  saveDashboardReport,
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
  onClose,
}: {
  report: DashboardItemOut | null;
  onClose: () => void;
}) {
  if (!report) return null;

  const handleDownload = () => {
    console.log("[ViewReportModal] Downloading report:", report.name);
    const blob = new Blob([report.report_content || ""], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.name.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={!!report} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {report.name}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 border rounded-lg p-4 bg-muted/20 max-h-[60vh]">
          <MarkdownMessage content={report.report_content || "No content available."} />
        </ScrollArea>
        <DialogFooter className="gap-2 flex-shrink-0">
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
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
      await saveDashboardReport({ name: reportName, content: accumulated, template: "executive" });
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

          {/* ---- Saved Items ---- */}
          <TabsContent value="items" className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                <BarChart3 className="h-12 w-12 opacity-30" />
                <p className="text-sm font-medium">No saved items yet</p>
                <p className="text-xs text-center max-w-xs">
                  Go to Chat with Database, ask a question that returns a table, then click
                  "Save to Dashboard" or "Convert to Graph".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <Card key={item.id} className="group">
                    <CardHeader className="pb-2">
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
                    </CardHeader>
                    <CardContent>
                      {/* Visual placeholder — same style as the original UI */}
                      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-3">
                        {item.item_type === "graph" ? (
                          <BarChart3 className="h-12 w-12 text-muted-foreground/40" />
                        ) : (
                          <Table2 className="h-12 w-12 text-muted-foreground/40" />
                        )}
                      </div>
                      {item.source_question && (
                        <p className="text-[11px] text-muted-foreground italic truncate mb-2">
                          "{item.source_question}"
                        </p>
                      )}
                      <div className="flex justify-end">
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
                          onClick={() => {
                            console.log("[MyDashboard] Downloading report:", report.id);
                            const blob = new Blob([report.report_content || ""], { type: "text/markdown" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${report.name.replace(/\s+/g, "-").toLowerCase()}.md`;
                            a.click();
                            URL.revokeObjectURL(url);
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
      <ViewReportModal report={viewReport} onClose={() => setViewReport(null)} />
    </div>
  );
}

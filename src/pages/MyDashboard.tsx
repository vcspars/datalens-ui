import { useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Table2, FileDown, Trash2, Eye, FileText } from "lucide-react";
import GenerateReportDialog from "@/components/GenerateReportDialog";
import ReportDesignSelectionDialog from "@/components/ReportDesignSelectionDialog";
import ReportPreviewDialog from "@/components/ReportPreviewDialog";
import { useToast } from "@/hooks/use-toast";

interface SavedItem {
  id: number;
  type: 'graph' | 'table';
  name: string;
  createdAt: Date;
}

interface Report {
  id: number;
  name: string;
  createdAt: Date;
  pdfUrl: string;
}

export default function MyDashboard() {
  const { toast } = useToast();
  const [savedItems, setSavedItems] = useState<SavedItem[]>([
    { id: 1, type: 'graph', name: 'Sales Trend Chart', createdAt: new Date('2024-01-15') },
    { id: 2, type: 'table', name: 'Customer Analysis Table', createdAt: new Date('2024-01-14') },
    { id: 3, type: 'graph', name: 'Revenue Distribution', createdAt: new Date('2024-01-13') },
    { id: 4, type: 'table', name: 'Product Performance', createdAt: new Date('2024-01-12') },
  ]);

  const [reports, setReports] = useState<Report[]>([
    { id: 1, name: 'Q4 Analysis Report', createdAt: new Date('2024-01-20'), pdfUrl: '/reports/q4.pdf' },
    { id: 2, name: 'Customer Insights Report', createdAt: new Date('2024-01-18'), pdfUrl: '/reports/insights.pdf' },
  ]);

  const [showDesignSelection, setShowDesignSelection] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState("");
  const [previewReportName, setPreviewReportName] = useState("");
  const [previewReportContent, setPreviewReportContent] = useState("");

  const reportItems = savedItems.map(item => ({
    id: item.id.toString(),
    name: item.name,
    type: item.type
  }));

  const handleGenerateReport = async (reportName: string, selectedItemIds: string[], instructions: string) => {
    try {
      const response = await fetch('/generate_dashboard_report/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          report_name: reportName,
          item_ids: selectedItemIds,
          instructions: instructions
        }),
      });
      
      if (response.ok) {
        const newReport: Report = {
          id: reports.length + 1,
          name: reportName,
          createdAt: new Date(),
          pdfUrl: '/reports/latest.pdf',
        };
        setReports([newReport, ...reports]);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  };

  const handleDeleteSavedItem = (id: number) => {
    setSavedItems(savedItems => savedItems.filter(item => item.id !== id));
    toast({
      title: "Item Deleted",
      description: "The saved item has been removed successfully.",
    });
  };

  const handleDeleteReport = (id: number) => {
    setReports(reports => reports.filter(report => report.id !== id));
    toast({
      title: "Report Deleted",
      description: "The report has been removed successfully.",
    });
  };

  const handleViewReport = (report: Report) => {
    setPreviewReportName(report.name);
    setPreviewReportContent("Sample report content would be loaded here...");
    setSelectedDesign("professional");
    setShowReportPreview(true);
  };

  const handleDownloadReport = (report: Report) => {
    setPreviewReportName(report.name);
    setPreviewReportContent("Sample report content would be loaded here...");
    setShowDesignSelection(true);
  };

  const handleSelectDesign = (designId: string) => {
    setSelectedDesign(designId);
    setShowReportPreview(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Dashboard</h1>
            <p className="text-muted-foreground">Manage your saved visualizations and reports</p>
          </div>
          <GenerateReportDialog items={reportItems} onGenerate={handleGenerateReport} />
        </div>

        <Tabs defaultValue="items" className="w-full">
          <TabsList>
            <TabsTrigger value="items">Saved Items</TabsTrigger>
            <TabsTrigger value="reports">My Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedItems.map((item) => (
                <Card key={item.id} className="group">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.type === 'graph' ? (
                          <BarChart3 className="h-5 w-5 text-primary" />
                        ) : (
                          <Table2 className="h-5 w-5 text-primary" />
                        )}
                        <CardTitle className="text-base">{item.name}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteSavedItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <CardDescription>
                      Created {item.createdAt.toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                      {item.type === 'graph' ? (
                        <BarChart3 className="h-12 w-12 text-muted-foreground" />
                      ) : (
                        <Table2 className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report) => (
                <Card key={report.id} className="group">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{report.name}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() => handleDeleteReport(report.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <CardDescription>
                      Generated {report.createdAt.toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewReport(report)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownloadReport(report)}>
                        <FileDown className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        <ReportDesignSelectionDialog
          open={showDesignSelection}
          onOpenChange={setShowDesignSelection}
          onSelectDesign={handleSelectDesign}
        />
        
        <ReportPreviewDialog
          open={showReportPreview}
          onOpenChange={setShowReportPreview}
          designId={selectedDesign}
          reportContent={previewReportContent}
          reportName={previewReportName}
        />
      </div>
    </div>
  );
}

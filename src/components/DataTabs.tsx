import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, BarChart3, Download, Database, Sheet, Send, Maximize2, Minimize2, Network, CheckCircle2, XCircle, Sparkles, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import PDFViewer from "./PDFViewer";
import CSVPreview from "./CSVPreview";
import DatabaseERDViewer from "./DatabaseERDViewer";
import ReportDesignSelectionDialog from "./ReportDesignSelectionDialog";
import ReportPreviewDialog from "./ReportPreviewDialog";
import { getDatasetById, DatasetResponse, generateSummary, generateQuestions, generateReport } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface DataTabsProps {
  datasetType: 'pdf' | 'csv' | 'database';
  datasetId: number | string;
  onSendQuestion?: (question: string) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function DataTabs({ datasetType, datasetId, onSendQuestion, isFullscreen, onToggleFullscreen }: DataTabsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [pendingTabChange, setPendingTabChange] = useState<string | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<any[]>([]);
  const [showTabChangeDialog, setShowTabChangeDialog] = useState(false);
  const csvPreviewConfirmRef = useRef<(() => void) | null>(null);
  const csvPreviewDiscardRef = useRef<(() => void) | null>(null);
  const [dataset, setDataset] = useState<DatasetResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reportText, setReportText] = useState("Loading report...");
  const [showERD, setShowERD] = useState(false);
  const [showDesignSelection, setShowDesignSelection] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    const loadDataset = async () => {
      try {
        setIsLoading(true);
        const data = await getDatasetById(datasetId);
        setDataset(data);
        setReportText(data.report || "");
      } catch (error: any) {
        toast({
          title: "Failed to load dataset",
          description: error?.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDataset();
  }, [datasetId, toast]);

  const dataSummaryText = dataset?.summary || (datasetType === 'database' 
    ? "Your database contains 12 tables with a total of 45,892 records. The data is well-structured and ready for analysis. Key tables include customer information, transaction history, and product catalog."
    : datasetType === 'pdf'
    ? "This PDF document contains 24 pages with approximately 5.2 MB of content. The document includes text, tables, and some embedded images. The content has been extracted and is ready for AI-powered analysis."
    : "Your CSV file contains 1,245 rows and 8 columns. The data appears to be clean with minimal missing values. Column types include numeric values, categorical data, and timestamp information.");

  const suggestedQuestions = dataset?.questions || [
    "What are the top 10 customers by revenue?",
    "Show me sales trends for the last quarter",
    "Which products have the highest profit margins?",
    "What is the average order value by region?"
  ];

  const handleGenerateSummary = async () => {
    try {
      setIsGeneratingSummary(true);
      const updated = await generateSummary(datasetId);
      setDataset(updated);
      toast({
        title: "Summary generated",
        description: "Summary has been generated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Failed to generate summary",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateQuestions = async () => {
    try {
      setIsGeneratingQuestions(true);
      const updated = await generateQuestions(datasetId);
      setDataset(updated);
      toast({
        title: "Questions generated",
        description: "Questions have been generated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Failed to generate questions",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setIsGeneratingReport(true);
      const updated = await generateReport(datasetId);
      setDataset(updated);
      setReportText(updated.report || "");
      toast({
        title: "Report generated",
        description: "Report has been generated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Failed to generate report",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSendQuestion = (question: string) => {
    if (onSendQuestion) {
      onSendQuestion(question);
    }
  };

  const handleDownloadReport = () => {
    setShowDesignSelection(true);
  };

  const handleSelectDesign = (designId: string) => {
    setSelectedDesign(designId);
    setShowReportPreview(true);
  };

  const renderOverviewTab = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading dataset...</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center justify-between text-base sm:text-lg">
              <div className="flex items-center gap-2">
                {datasetType === 'database' ? (
                  <Database className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                ) : datasetType === 'pdf' ? (
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                ) : (
                  <Sheet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                )}
                Data Summary
              </div>
              {((datasetType === 'pdf' || datasetType === 'csv') && (!dataset?.summary_generated || !dataset?.summary)) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                  className="gap-2"
                >
                  {isGeneratingSummary ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      Generate Summary
                    </>
                  )}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {dataset?.summary ? (
              <ScrollArea className="h-[200px] pr-2 sm:pr-4">
                <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {dataset.summary}
                </p>
              </ScrollArea>
            ) : (datasetType === 'database' || !dataset) ? (
              <ScrollArea className="h-[200px] pr-2 sm:pr-4">
                <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {dataSummaryText}
                </p>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No summary generated yet. Click "Generate Summary" to create a data summary.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center justify-between text-base sm:text-lg">
              <span>Suggested Questions</span>
              {((datasetType === 'pdf' || datasetType === 'csv') && (!dataset?.questions_generated || !dataset?.questions || dataset.questions.length === 0)) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateQuestions}
                  disabled={isGeneratingQuestions}
                  className="gap-2"
                >
                  {isGeneratingQuestions ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      Generate Questions
                    </>
                  )}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {suggestedQuestions && suggestedQuestions.length > 0 ? (
              <div className="space-y-2">
                {suggestedQuestions.map((question, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 p-2 sm:p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <span className="text-xs sm:text-sm flex-1 text-foreground">{question}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 opacity-70 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleSendQuestion(question)}
                    >
                      <Send className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No questions generated yet. Click "Generate Questions" to create suggested questions.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const getTabsForDatasetType = () => {
    if (datasetType === 'pdf') {
      return ['overview', 'pdfPreview', 'report']; // No graphs for PDF
    } else if (datasetType === 'csv') {
      return ['overview', 'csvPreview', 'report', 'graphs'];
    } else {
      return ['overview', 'report', 'graphs'];
    }
  };

  const handleTabChange = (newTab: string) => {
    // If there are pending changes and user is leaving CSV Preview tab
    if (hasPendingChanges && activeTab === "csvPreview" && newTab !== "csvPreview") {
      setPendingTabChange(newTab);
      setShowTabChangeDialog(true);
    } else {
      setActiveTab(newTab);
    }
  };
  
  const handleSaveAndSwitchTab = () => {
    // Close tab change dialog
    setShowTabChangeDialog(false);
    
    // Trigger CSVPreview's confirm dialog with callback to switch tab after save
    if (csvPreviewConfirmRef.current) {
      const targetTab = pendingTabChange;
      csvPreviewConfirmRef.current(() => {
        // This callback will be called after changes are confirmed
        if (targetTab) {
          setActiveTab(targetTab);
          setPendingTabChange(null);
        }
      });
    }
  };
  
  const handleDiscardAndSwitchTab = () => {
    // Close tab change dialog
    setShowTabChangeDialog(false);
    
    // Discard changes and switch tab
    if (csvPreviewDiscardRef.current && pendingTabChange) {
      const targetTab = pendingTabChange;
      csvPreviewDiscardRef.current(() => {
        // Switch tab after discard
        setActiveTab(targetTab);
        setPendingTabChange(null);
      });
    }
  };
  
  const handleCancelTabChange = () => {
    setShowTabChangeDialog(false);
    setPendingTabChange(null);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col overflow-hidden">
      <div className="px-4 pt-4 border-b bg-background flex items-center justify-between flex-shrink-0">
        <TabsList className="flex-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {datasetType === 'pdf' && (
            <TabsTrigger value="pdfPreview">PDF Preview</TabsTrigger>
          )}
          {datasetType === 'csv' && (
            <TabsTrigger value="csvPreview">CSV Preview</TabsTrigger>
          )}
          {datasetType === 'database' && (
            <TabsTrigger value="erdPreview">Preview Database</TabsTrigger>
          )}
          <TabsTrigger value="report">Report</TabsTrigger>
          {datasetType !== 'pdf' && (
            <TabsTrigger value="graphs">Graphs</TabsTrigger>
          )}
        </TabsList>
        {onToggleFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            className="ml-2 h-8 w-8 flex-shrink-0"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-4 h-full">
          <TabsContent value="overview" className="mt-0 h-full">
            {renderOverviewTab()}
          </TabsContent>

          {datasetType === 'pdf' && (
            <TabsContent value="pdfPreview" className="mt-0 h-[calc(100vh-200px)] overflow-hidden">
              <div className="h-full overflow-auto">
                <PDFViewer pdfId={datasetId} />
              </div>
            </TabsContent>
          )}

          {datasetType === 'csv' && (
            <TabsContent value="csvPreview" className="mt-0 h-[calc(100vh-200px)]">
              <Card className="h-full">
                <CardContent className="p-0 h-full">
                  <CSVPreview 
                    csvId={datasetId}
                    onPendingChangesChange={(hasChanges, changes) => {
                      setHasPendingChanges(hasChanges);
                      setPendingChanges(changes);
                    }}
                    onRequestConfirm={(confirmFn, discardFn) => {
                      csvPreviewConfirmRef.current = confirmFn;
                      csvPreviewDiscardRef.current = discardFn;
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {datasetType === 'database' && (
            <TabsContent value="erdPreview" className="mt-0">
              <Card className="h-[500px] flex items-center justify-center">
                <CardContent className="flex flex-col items-center gap-6">
                  <div className="text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Network className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Database Schema Visualization</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Explore your database structure with an interactive Entity Relationship Diagram. 
                        Drag tables, zoom, and understand your data relationships visually.
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="lg" 
                    onClick={() => setShowERD(true)}
                    className="gap-2"
                  >
                    <Network className="h-5 w-5" />
                    Open ERD Viewer
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="report" className="mt-0">
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6">
                <div className="space-y-1.5">
                  <CardTitle className="text-xl sm:text-2xl">Analysis Report</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Detailed insights from your data analysis</CardDescription>
                </div>
                <div className="flex gap-2">
                  {((datasetType === 'pdf' || datasetType === 'csv') && (!dataset?.report_generated || !dataset?.report)) && (
                    <Button 
                      onClick={handleGenerateReport} 
                      variant="outline" 
                      className="gap-2"
                      disabled={isGeneratingReport}
                    >
                      {isGeneratingReport ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Generate Report
                        </>
                      )}
                    </Button>
                  )}
                  {dataset?.report && (
                    <Button onClick={handleDownloadReport} variant="outline" className="gap-2 w-full sm:w-auto flex-shrink-0">
                      <Download className="h-4 w-4" />
                      Download Report
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {reportText ? (
                  <ScrollArea className="h-[500px] border rounded-lg p-6 bg-muted/30">
                    <div className="prose prose-sm max-w-none">
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">{reportText}</p>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-[500px] border rounded-lg flex items-center justify-center bg-muted/30">
                    <div className="text-center space-y-4">
                      <Sparkles className="h-12 w-12 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-muted-foreground font-medium">No report generated yet</p>
                        <p className="text-sm text-muted-foreground mt-1">Click "Generate Report" to create an analysis report</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {datasetType !== 'pdf' && (
            <TabsContent value="graphs" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Visualizations
                  </CardTitle>
                  <CardDescription>Charts and graphs from your queries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg bg-muted h-[400px] flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No visualizations yet</p>
                      <p className="text-sm text-muted-foreground">Ask questions to generate charts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </div>
      </div>
      
      {datasetType === 'database' && (
        <DatabaseERDViewer 
          open={showERD} 
          onOpenChange={setShowERD}
          datasetId={datasetId}
        />
      )}
      
      <ReportDesignSelectionDialog
        open={showDesignSelection}
        onOpenChange={setShowDesignSelection}
        onSelectDesign={handleSelectDesign}
      />
      
      <ReportPreviewDialog
        open={showReportPreview}
        onOpenChange={setShowReportPreview}
        designId={selectedDesign}
        reportContent={reportText}
        reportName="Analysis Report"
      />
      
      {/* Tab Change Confirmation Dialog */}
      <Dialog open={showTabChangeDialog} onOpenChange={setShowTabChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have {pendingChanges.length} pending change{pendingChanges.length > 1 ? 's' : ''} in the CSV Preview tab.
              What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              {pendingChanges.map((change, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium">
                    {change.type === 'add' ? 'Add' : change.type === 'delete' ? 'Delete' : 'Modify'}:
                  </span> {change.columnName}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCancelTabChange}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleDiscardAndSwitchTab}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Discard & Switch
            </Button>
            <Button
              onClick={handleSaveAndSwitchTab}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Save & Switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

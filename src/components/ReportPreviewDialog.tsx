import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, X, FileText, BarChart3, TrendingUp, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designId: string;
  reportContent: string;
  reportName?: string;
  /** When "Back to Designs" is clicked, reopen design selection (optional) */
  onBackToDesigns?: () => void;
}

const designStyles = {
  professional: {
    fontFamily: 'Inter, sans-serif',
    primaryColor: '#1e3a8a',
    accentColor: '#3b82f6',
    backgroundColor: '#f8fafc'
  },
  executive: {
    fontFamily: 'Roboto, sans-serif',
    primaryColor: '#1e40af',
    accentColor: '#fbbf24',
    backgroundColor: '#fefce8'
  },
  modern: {
    fontFamily: 'Poppins, sans-serif',
    primaryColor: '#0284c7',
    accentColor: '#06b6d4',
    backgroundColor: '#f0f9ff'
  },
  academic: {
    fontFamily: 'Georgia, serif',
    primaryColor: '#000000',
    accentColor: '#374151',
    backgroundColor: '#ffffff'
  }
};

export default function ReportPreviewDialog({ 
  open, 
  onOpenChange, 
  designId, 
  reportContent,
  reportName = "Analysis Report",
  onBackToDesigns
}: ReportPreviewDialogProps) {
  const { toast } = useToast();
  const style = designStyles[designId as keyof typeof designStyles] || designStyles.professional;
  const safeContent = reportContent ?? "";

  const handleDownload = () => {
    if (!safeContent.trim()) {
      toast({
        title: "No report content",
        description: "Generate a report first, then download.",
        variant: "destructive",
      });
      return;
    }
    // Create a styled HTML document
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${reportName}</title>
          <style>
            body {
              font-family: ${style.fontFamily};
              background-color: ${style.backgroundColor};
              color: #1f2937;
              line-height: 1.6;
              padding: 40px;
              max-width: 900px;
              margin: 0 auto;
            }
            .header {
              border-bottom: 3px solid ${style.primaryColor};
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            h1 {
              color: ${style.primaryColor};
              font-size: 32px;
              margin: 0 0 10px 0;
            }
            .date {
              color: #6b7280;
              font-size: 14px;
            }
            .content {
              white-space: pre-wrap;
              font-size: 14px;
            }
            .accent {
              color: ${style.accentColor};
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportName}</h1>
            <p class="date">Generated: ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="content">${safeContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName.replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "Your report has been downloaded successfully.",
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 gap-0 rounded-xl overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4 bg-background">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Report Preview</h2>
                <p className="text-xs text-muted-foreground capitalize">{designId} design</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div 
                className="p-12"
                style={{ 
                  fontFamily: style.fontFamily,
                  backgroundColor: style.backgroundColor
                }}
              >
                {/* Report Header */}
                <div 
                  className="pb-8 mb-8"
                  style={{ borderBottom: `3px solid ${style.primaryColor}` }}
                >
                  <h1 
                    className="text-4xl font-bold mb-3"
                    style={{ color: style.primaryColor }}
                  >
                    {reportName}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Generated: {new Date().toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>

                {/* Sample KPI Cards */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[
                    { label: 'Total Records', value: '1,245', icon: FileText },
                    { label: 'Growth Rate', value: '+24%', icon: TrendingUp },
                    { label: 'Active Users', value: '892', icon: Users }
                  ].map((kpi, idx) => {
                    const Icon = kpi.icon;
                    return (
                      <div 
                        key={idx}
                        className="p-4 rounded-lg border"
                        style={{ backgroundColor: 'white' }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-4 w-4" style={{ color: style.accentColor }} />
                          <span className="text-xs text-muted-foreground">{kpi.label}</span>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: style.primaryColor }}>
                          {kpi.value}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Report Content */}
                <div className="prose max-w-none">
                  <h2 style={{ color: style.primaryColor, marginBottom: '16px' }}>
                    Executive Summary
                  </h2>
                  <div 
                    className="whitespace-pre-wrap text-sm leading-relaxed mb-8"
                    style={{ color: '#374151' }}
                  >
                    {reportContent}
                  </div>

                  {/* Sample Chart Placeholder */}
                  <div className="my-8 p-8 rounded-lg border bg-white">
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <BarChart3 className="h-16 w-16 mx-auto mb-3" style={{ color: style.accentColor }} />
                        <p className="text-sm text-muted-foreground">
                          Charts and visualizations will appear here
                        </p>
                      </div>
                    </div>
                  </div>

                  <h2 style={{ color: style.primaryColor, marginBottom: '16px' }}>
                    Key Findings
                  </h2>
                  <ul className="space-y-2 text-sm" style={{ color: '#374151' }}>
                    <li>Data analysis reveals significant patterns in user behavior</li>
                    <li>Performance metrics show consistent growth trends</li>
                    <li>Key indicators suggest opportunities for optimization</li>
                  </ul>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-6 border-t text-center">
                  <p className="text-xs text-muted-foreground">
                    Generated by DataLens • {new Date().getFullYear()}
                  </p>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="border-t px-6 py-4 bg-background">
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onBackToDesigns?.();
                }}
              >
                Back to Designs
              </Button>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download Report
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

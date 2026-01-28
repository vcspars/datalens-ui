import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportItem {
  id: string;
  name: string;
  type: 'graph' | 'table';
}

interface GenerateReportDialogProps {
  items: ReportItem[];
  onGenerate: (reportName: string, selectedItems: string[], instructions: string) => Promise<void>;
}

export default function GenerateReportDialog({ items, onGenerate }: GenerateReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reportName, setReportName] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleGenerate = async () => {
    if (!reportName.trim()) {
      toast({
        title: "Report Name Required",
        description: "Please enter a name for your report",
        variant: "destructive",
      });
      return;
    }

    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one graph or table",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await onGenerate(reportName, selectedItems, instructions);
      toast({
        title: "Success",
        description: "Report is being generated",
      });
      setOpen(false);
      // Reset form
      setReportName("");
      setSelectedItems([]);
      setInstructions("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const graphs = items.filter(item => item.type === 'graph');
  const tables = items.filter(item => item.type === 'table');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <FileText className="h-4 w-4" />
          Generate PDF Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate PDF Report
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="report-name">Report Name *</Label>
            <Input
              id="report-name"
              placeholder="e.g., Q4 Sales Analysis Report"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>Select Items to Include *</Label>
            <ScrollArea className="h-[200px] rounded-md border p-4">
              {graphs.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-sm mb-2 text-foreground">Graphs</h4>
                  <div className="space-y-2">
                    {graphs.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={item.id}
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => handleToggleItem(item.id)}
                        />
                        <Label
                          htmlFor={item.id}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {item.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {tables.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-foreground">Tables</h4>
                  <div className="space-y-2">
                    {tables.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={item.id}
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => handleToggleItem(item.id)}
                        />
                        <Label
                          htmlFor={item.id}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {item.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No graphs or tables available
                </p>
              )}
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Report Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              placeholder="Provide any specific instructions for the report generation. E.g., 'Include executive summary, focus on trends, highlight key insights from the selected graphs and tables...'"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Explain what should be emphasized or how the data should be presented
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
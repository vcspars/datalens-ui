import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadCSV } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";

interface UploadCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UploadCSVDialog({ open, onOpenChange }: UploadCSVDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generateSummary, setGenerateSummary] = useState(true);
  const [generateQuestions, setGenerateQuestions] = useState(true);
  const [generateReport, setGenerateReport] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 50MB",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      if (!name) {
        setName(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your dataset",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("file", file);
      if (description) {
        formData.append("description", description);
      }
      formData.append("generate_summary", generateSummary.toString());
      formData.append("generate_questions", generateQuestions.toString());
      formData.append("generate_report", generateReport.toString());

      const response = await uploadCSV(formData);
      
      if (!response || !response.id) {
        throw new Error("Invalid response from server");
      }
      
      toast({
        title: "Dataset uploaded successfully",
        description: `${name} has been processed and is ready to use.`,
      });

      // Navigate to the dashboard with the new dataset
      // Use MongoDB ObjectId (_id) if available, otherwise use numeric id
      const datasetId = response._id || response.id.toString();
      navigate(`/dashboard/csv/${datasetId}`);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload CSV",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setFile(null);
    setGenerateSummary(true);
    setGenerateQuestions(true);
    setGenerateReport(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sheet className="h-5 w-5 text-primary" />
            Chat with CSV/Excel File
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to analyze and chat with its data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="csv-name">Dataset Name</Label>
            <Input
              id="csv-name"
              placeholder="Enter your dataset name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="csv-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={isLoading}
                className="cursor-pointer"
              />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Sheet className="h-4 w-4" />
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Supported formats: CSV, Excel (.xlsx, .xls)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-description">Description (Optional)</Label>
            <Textarea
              id="csv-description"
              placeholder="Add a description for this dataset..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="space-y-3 border-t pt-4">
            <Label>Generate Content (Select what to generate)</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generate-summary"
                  checked={generateSummary}
                  onCheckedChange={(checked) => setGenerateSummary(checked === true)}
                  disabled={isLoading}
                />
                <Label
                  htmlFor="generate-summary"
                  className="text-sm font-normal cursor-pointer"
                >
                  Generate Summary
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generate-questions"
                  checked={generateQuestions}
                  onCheckedChange={(checked) => setGenerateQuestions(checked === true)}
                  disabled={isLoading}
                />
                <Label
                  htmlFor="generate-questions"
                  className="text-sm font-normal cursor-pointer"
                >
                  Generate Questions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generate-report"
                  checked={generateReport}
                  onCheckedChange={(checked) => setGenerateReport(checked === true)}
                  disabled={isLoading}
                />
                <Label
                  htmlFor="generate-report"
                  className="text-sm font-normal cursor-pointer"
                >
                  Generate Report
                </Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              You can generate missing content later from the overview page
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={isLoading || !file}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

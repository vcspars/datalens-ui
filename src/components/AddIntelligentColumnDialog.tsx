import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddIntelligentColumnDialogProps {
  columns: string[];
  onAddColumn: (sourceColumn: string, newColumnName: string, prompt: string) => Promise<void>;
}

export default function AddIntelligentColumnDialog({ columns, onAddColumn }: AddIntelligentColumnDialogProps) {
  const [open, setOpen] = useState(false);
  const [sourceColumn, setSourceColumn] = useState("");
  const [newColumnName, setNewColumnName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!sourceColumn || !newColumnName || !prompt) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await onAddColumn(sourceColumn, newColumnName, prompt);
      toast({
        title: "Success",
        description: "Intelligent column added successfully",
      });
      setOpen(false);
      // Reset form
      setSourceColumn("");
      setNewColumnName("");
      setPrompt("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add intelligent column",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Add Intelligent Column
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Add Intelligent Column
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="source-column">Source Column</Label>
            <Select value={sourceColumn} onValueChange={setSourceColumn}>
              <SelectTrigger id="source-column">
                <SelectValue placeholder="Select a column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose the column to base the intelligent column on
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-column-name">New Column Name</Label>
            <Input
              id="new-column-name"
              placeholder="e.g., Category, Sentiment, Description"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Transformation Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Describe how to transform the data. E.g., 'Convert numeric values to their alphabetical representation' or 'Categorize the values into High, Medium, Low'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Explain what transformation should be applied to create the new column
            </p>
          </div>

          <div className="rounded-lg bg-primary-light p-3 border border-primary/20">
            <p className="text-sm text-foreground">
              <strong>Example:</strong> Select "Price" column, name it "Price Category", 
              and prompt "Categorize into Low (0-100), Medium (101-500), High (500+)"
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Add Column
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
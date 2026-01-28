import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calculator } from "lucide-react";

interface ColumnCalculationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnName: string;
  operation: string;
  result: {
    value?: number;
    min?: number;
    max?: number;
    formatted: string;
  };
  totalValues?: number;
  validNumericValues?: number;
}

export default function ColumnCalculationModal({
  open,
  onOpenChange,
  columnName,
  operation,
  result,
  totalValues,
  validNumericValues,
}: ColumnCalculationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            {operation} - {columnName}
          </DialogTitle>
          <DialogDescription>
            Calculation result for column "{columnName}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {result.formatted}
            </div>
            <div className="text-sm text-muted-foreground">
              {operation}
            </div>
          </div>
          
          {totalValues !== undefined && validNumericValues !== undefined && (
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Total values: {totalValues}</div>
              <div>Valid numeric values: {validNumericValues}</div>
              {totalValues > validNumericValues && (
                <div className="text-amber-600 dark:text-amber-400">
                  Note: {totalValues - validNumericValues} non-numeric values were excluded
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  ColumnSizingState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Search, ArrowUpDown, MoreVertical, Plus, Minus, AlignLeft, AlignCenter, AlignRight, Calculator, Filter, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddIntelligentColumnDialog from "./AddIntelligentColumnDialog";
import ColumnCalculationModal from "./ColumnCalculationModal";
import EditableCell from "./EditableCell";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, saveDatasetChanges, getDatasetById, addIntelligentColumn } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CSVPreviewProps {
  csvId: number | string;
  onPendingChangesChange?: (hasChanges: boolean, changes: ColumnChange[]) => void;
  onRequestConfirm?: (confirmFn: () => void, discardFn: () => void) => void;
}

interface ColumnChange {
  type: 'add' | 'modify' | 'delete' | 'format';
  columnName: string;
  data?: any[];
  position?: number;
  rowIndex?: number;
  oldValue?: any;
  newValue?: any;
  formatType?: 'align' | 'display';
  formatValue?: 'left' | 'center' | 'right' | 'currency' | 'percentage';
}

export default function CSVPreview({ csvId, onPendingChangesChange, onRequestConfirm }: CSVPreviewProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [debouncedGlobalFilter, setDebouncedGlobalFilter] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [columns, setColumns] = useState<ColumnDef<any>[]>([]);
  const [originalColumns, setOriginalColumns] = useState<ColumnDef<any>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [pendingChanges, setPendingChanges] = useState<ColumnChange[]>([]);
  const [calculationModalOpen, setCalculationModalOpen] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);
  const [showColumnNameDialog, setShowColumnNameDialog] = useState(false);
  const [pendingColumnAdd, setPendingColumnAdd] = useState<{position: 'left' | 'right', columnId: string} | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [editingCell, setEditingCell] = useState<{rowIndex: number, columnId: string} | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(1000);
  const [columnDisplayFormat, setColumnDisplayFormat] = useState<Record<string, { align?: 'left' | 'center' | 'right'; format?: 'currency' | 'percentage' }>>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const { toast } = useToast();

  // Load column sizing from localStorage on mount
  useEffect(() => {
    const storageKey = `columnSizing_${csvId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ColumnSizingState;
        setColumnSizing(parsed);
      } catch (e) {
        console.error("Failed to parse saved column sizing:", e);
      }
    } else {
      setColumnSizing({});
    }
  }, [csvId]);

  // Save column sizing to localStorage when it changes
  useEffect(() => {
    if (Object.keys(columnSizing).length > 0) {
      const storageKey = `columnSizing_${csvId}`;
      localStorage.setItem(storageKey, JSON.stringify(columnSizing));
    }
  }, [columnSizing, csvId]);

  // Reset to page 0 when page size changes
  useEffect(() => {
    setCurrentPage(0);
  }, [pageSize]);

  // Debounce global filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedGlobalFilter(globalFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [globalFilter]);

  // Load column display format from localStorage on mount
  useEffect(() => {
    const storageKey = `columnFormat_${csvId}`;
    const savedFormat = localStorage.getItem(storageKey);
    if (savedFormat) {
      try {
        const parsed = JSON.parse(savedFormat);
        setColumnDisplayFormat(parsed);
      } catch (e) {
        console.error("Failed to parse saved column format:", e);
      }
    }
  }, [csvId]);

  // Save column display format to localStorage when it changes
  useEffect(() => {
    if (Object.keys(columnDisplayFormat).length > 0) {
      const storageKey = `columnFormat_${csvId}`;
      localStorage.setItem(storageKey, JSON.stringify(columnDisplayFormat));
    }
  }, [columnDisplayFormat, csvId]);

  useEffect(() => {
    const loadCSVData = async () => {
      try {
        setIsLoading(true);
        const offset = currentPage * pageSize;
        // If pageSize is very large (all rows), fetch all data without limit
        const limit = pageSize >= 1000000 ? undefined : pageSize;
        const url = limit 
          ? `/datasets/${csvId}/data?limit=${limit}&offset=${offset}`
          : `/datasets/${csvId}/data?offset=${offset}`;
        const response = await apiRequest<{
          columns: string[];
          data: any[];
          total_rows: number;
          returned_rows: number;
          total_columns: number;
        }>(url);
        
        if (response && response.data && response.columns) {
          setData(response.data);
          setTotalRows(response.total_rows || response.data.length);
          
          // Store column names - only update columns if they changed
          const columnNames = response.columns || [];
          
          // Always update columns on first load or if structure changed
          setColumns((prevColumns) => {
            const prevColumnIds = prevColumns.map(c => c.id as string);
            const newColumnIds = columnNames;
            
            // If column structure changed, update
            if (prevColumns.length === 0 || 
                prevColumnIds.length !== newColumnIds.length || 
                !prevColumnIds.every((id, idx) => id === newColumnIds[idx])) {
              return columnNames.map((colName) => ({
                id: colName,
                accessorKey: colName,
                header: colName,
                size: 150,
                minSize: 60,
                maxSize: 800,
              }));
            }
            return prevColumns;
          });
          
          // Only update originalData and originalColumns on first load (page 0)
          setOriginalData((prevOriginal) => {
            if (currentPage === 0 && prevOriginal.length === 0) {
              return response.data;
            }
            return prevOriginal;
          });
          
          setOriginalColumns((prevOriginal) => {
            if (currentPage === 0 && prevOriginal.length === 0) {
              return columnNames.map((colName) => ({
                id: colName,
                accessorKey: colName,
                header: colName,
                size: 150,
                minSize: 60,
                maxSize: 800,
              }));
            }
            return prevOriginal;
          });
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (error: any) {
        console.error("Error loading CSV data:", error);
        toast({
          title: "Failed to load CSV data",
          description: error?.message || "Please try again.",
          variant: "destructive",
        });
        // Fallback to empty data
        setData([]);
        setColumns([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (csvId) {
      loadCSVData();
    }
  }, [csvId, currentPage, pageSize, toast]);

  // Memoized cell handlers
  const handleCellEdit = useCallback((rowIndex: number, columnId: string, value: any) => {
    setEditingCell({ rowIndex, columnId });
    setEditingValue(value || "");
  }, []);

  const handleCellSave = useCallback((rowIndex: number, columnId: string, newValue: any) => {
    setData((prevData) => {
      const updatedData = [...prevData];
      updatedData[rowIndex] = {
        ...updatedData[rowIndex],
        [columnId]: newValue,
      };
      return updatedData;
    });

    // Track change if value changed
    const originalValue = originalData[rowIndex]?.[columnId] || "";
    if (newValue !== originalValue) {
      setPendingChanges((prevChanges) => {
        const changeExists = prevChanges.some(
          c => c.type === 'modify' && c.columnName === columnId && c.rowIndex === rowIndex
        );
        if (!changeExists) {
          const updatedChanges = [...prevChanges, {
            type: 'modify' as const,
            columnName: columnId,
            rowIndex: rowIndex,
            oldValue: originalValue,
            newValue: newValue,
          }];
          onPendingChangesChange?.(updatedChanges.length > 0, updatedChanges);
          return updatedChanges;
        }
        return prevChanges;
      });
    }

    setEditingCell(null);
    setEditingValue("");
  }, [originalData, onPendingChangesChange]);

  const handleCellCancel = useCallback(() => {
    setEditingCell(null);
    setEditingValue("");
  }, []);

  // Memoize column definitions with EditableCell
  const memoizedColumns = useMemo(() => {
    if (columns.length === 0) return [];
    
    return columns.map((col) => ({
      ...col,
      cell: ({ row, column }: any) => {
        const value = row.original[column.id];
        const isEditing = editingCell?.rowIndex === row.index && editingCell?.columnId === column.id;
        const displayFormat = columnDisplayFormat[column.id];
        
        return (
          <EditableCell
            value={value}
            rowIndex={row.index}
            columnId={column.id}
            isEditing={isEditing}
            onEdit={handleCellEdit}
            onSave={handleCellSave}
            onCancel={handleCellCancel}
            align={displayFormat?.align}
            format={displayFormat?.format}
          />
        );
      },
    }));
  }, [columns, editingCell, columnDisplayFormat, handleCellEdit, handleCellSave, handleCellCancel]);

  // Use memoized columns if available, otherwise fall back to regular columns
  const tableColumns = memoizedColumns.length > 0 ? memoizedColumns : columns;
  
  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      globalFilter: debouncedGlobalFilter,
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setDebouncedGlobalFilter,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  const handleExport = useCallback(async () => {
    try {
      // Warn user if there are unsaved changes
      if (pendingChanges.length > 0) {
        toast({
          title: "Unsaved changes detected",
          description: "You have unsaved changes. The export will include only saved data. Save changes first to include them in the export.",
          variant: "default",
        });
      }
      
      // Get dataset info for filename
      const datasetInfo = await getDatasetById(csvId);
      const fileName = datasetInfo.file_name || `dataset_${csvId}.csv`;
      const baseFileName = fileName.replace(/\.[^/.]+$/, '');
      
      // Fetch all data from backend (includes saved changes, but not unsaved pending changes)
      const response = await apiRequest<{
        columns: string[];
        data: any[];
        total_rows: number;
      }>(`/datasets/${csvId}/data?limit=1000000`);
      
      if (!response || !response.data || !response.columns) {
        throw new Error("Failed to fetch data for export");
      }
      
      const dataToExport = response.data;
      const exportColumns = response.columns;
      
      // Convert to CSV format
      // Escape CSV values properly
      const escapeCSVValue = (value: any): string => {
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        // If value contains comma, newline, or quote, wrap in quotes and escape quotes
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };
      
      // Create CSV content
      const csvRows: string[] = [];
      
      // Add header row
      csvRows.push(exportColumns.map(escapeCSVValue).join(','));
      
      // Add data rows
      dataToExport.forEach((row) => {
        const csvRow = exportColumns.map((col) => {
          const value = row[col];
          return escapeCSVValue(value);
        });
        csvRows.push(csvRow.join(','));
      });
      
      const csvContent = csvRows.join('\n');
      
      // Create blob and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const exportFileName = `${baseFileName}_export.csv`;
      link.download = exportFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "CSV exported successfully",
        description: `Exported ${dataToExport.length} rows to ${exportFileName}`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error?.message || "Failed to export CSV",
        variant: "destructive",
      });
    }
  }, [csvId, pendingChanges, toast]);

  const handleColumnAction = useCallback(async (action: string, columnId: string) => {
    try {
      // Display-only actions (formatting) - track in pending changes
      if (action === 'Align Left' || action === 'Align Center' || action === 'Align Right') {
        const align = action === 'Align Left' ? 'left' : action === 'Align Center' ? 'center' : 'right';
        const oldAlign = columnDisplayFormat[columnId]?.align;
        
        // Only track if alignment actually changed
        if (oldAlign !== align) {
          setColumnDisplayFormat((prev) => ({ ...prev, [columnId]: { ...prev[columnId], align } }));
          setPendingChanges((prev) => {
            // Remove existing format change for this column's alignment, if any
            const filtered = prev.filter(c => 
              !(c.type === 'format' && c.columnName === columnId && c.formatType === 'align')
            );
            const next = [...filtered, { 
              type: 'format' as const, 
              columnName: columnId,
              formatType: 'align' as const,
              formatValue: align,
              oldValue: oldAlign,
              newValue: align,
            }];
            onPendingChangesChange?.(true, next);
            return next;
          });
          toast({ title: "Format applied", description: `Column "${columnId}" aligned ${align}` });
        } else {
          toast({ title: "No change", description: `Column "${columnId}" is already aligned ${align}` });
        }
        return;
      }
      if (action === 'Format as Currency' || action === 'Format as Percentage') {
        const format = action === 'Format as Currency' ? 'currency' : 'percentage';
        const oldFormat = columnDisplayFormat[columnId]?.format;
        
        // Only track if format actually changed
        if (oldFormat !== format) {
          setColumnDisplayFormat((prev) => ({ ...prev, [columnId]: { ...prev[columnId], format } }));
          setPendingChanges((prev) => {
            // Remove existing format change for this column's display format, if any
            const filtered = prev.filter(c => 
              !(c.type === 'format' && c.columnName === columnId && c.formatType === 'display')
            );
            const next = [...filtered, { 
              type: 'format' as const, 
              columnName: columnId,
              formatType: 'display' as const,
              formatValue: format,
              oldValue: oldFormat,
              newValue: format,
            }];
            onPendingChangesChange?.(true, next);
            return next;
          });
          toast({ title: "Format applied", description: `Column "${columnId}" formatted as ${format}` });
        } else {
          toast({ title: "No change", description: `Column "${columnId}" is already formatted as ${format}` });
        }
        return;
      }

      // Map action names to backend operation names (statistics - show in modal)
      const operationMap: Record<string, string> = {
        'Calculate Sum': 'sum',
        'Calculate Average': 'average',
        'Calculate Median': 'median',
        'Calculate Min/Max': 'min/max',
        'Standard Deviation': 'standard deviation',
        'Count Unique Values': 'count unique',
        'Calculate Variance': 'variance',
        'Calculate Mode': 'mode',
        'Calculate Range': 'range',
        'Calculate Percentiles': 'percentiles',
      };

      const operation = operationMap[action];
      const backendStats = ['sum', 'average', 'median', 'min/max', 'standard deviation', 'count unique', 'variance', 'mode', 'range', 'percentiles'];

      if (operation && backendStats.includes(operation)) {
        const response = await apiRequest<{
          column: string;
          operation: string;
          result: { value?: number; min?: number; max?: number; formatted: string; p25?: number; p50?: number; p75?: number };
          total_values: number;
          valid_numeric_values: number;
        }>(`/datasets/${csvId}/column/calculate`, {
          method: "POST",
          body: JSON.stringify({ column_name: columnId, operation }),
        });
        setCalculationResult({
          columnName: response.column,
          operation: response.operation,
          result: response.result,
          totalValues: response.total_values,
          validNumericValues: response.valid_numeric_values,
        });
        setCalculationModalOpen(true);
        return;
      }

      // Data-modifying actions (client-side on current data, add to pending)
      const colValues = data.map((row) => row[columnId]);
      const numericValues = colValues.map((v) => (v !== null && v !== undefined && v !== '' ? Number(v) : NaN)).filter((n) => !Number.isNaN(n));
      const num = numericValues.length;

      if (action === 'Remove Outliers') {
        if (num < 4) {
          toast({ title: "Not enough data", description: "Need at least 4 numeric values for IQR.", variant: "destructive" });
          return;
        }
        const sorted = [...numericValues].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(num * 0.25)];
        const q3 = sorted[Math.floor(num * 0.75)];
        const iqr = q3 - q1;
        const low = q1 - 1.5 * iqr;
        const high = q3 + 1.5 * iqr;
        const newData = data.filter((row) => {
          const v = row[columnId];
          const n = Number(v);
          if (v === null || v === undefined || v === '' || Number.isNaN(n)) return true;
          return n >= low && n <= high;
        });
        setData(newData);
        setPendingChanges((prev) => {
          const next = [...prev, { type: 'modify' as const, columnName: columnId }];
          onPendingChangesChange?.(true, next);
          return next;
        });
        toast({ title: "Outliers removed", description: `Filtered to ${newData.length} rows (IQR). Export or confirm to save.` });
        return;
      }

      if (action === 'Remove Duplicates') {
        const seen = new Set<string>();
        const newData = data.filter((row) => {
          const key = String(row[columnId] ?? '');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setData(newData);
        setPendingChanges((prev) => {
          const next = [...prev, { type: 'modify' as const, columnName: columnId }];
          onPendingChangesChange?.(true, next);
          return next;
        });
        toast({ title: "Duplicates removed", description: `Kept ${newData.length} unique rows. Export or confirm to save.` });
        return;
      }

      if (action === 'Fill Missing Values') {
        const mean = num > 0 ? numericValues.reduce((a, b) => a + b, 0) / num : 0;
        const newData = data.map((row) => ({
          ...row,
          [columnId]: row[columnId] === null || row[columnId] === undefined || row[columnId] === '' ? mean : row[columnId],
        }));
        setData(newData);
        setPendingChanges((prev) => {
          const next = [...prev, { type: 'modify' as const, columnName: columnId }];
          onPendingChangesChange?.(true, next);
          return next;
        });
        toast({ title: "Missing values filled", description: `Filled with mean (${mean.toFixed(2)}). Confirm changes to save.` });
        return;
      }

      if (action === 'Normalize Data') {
        if (num === 0) {
          toast({ title: "No numeric values", description: "Column has no numeric values to normalize.", variant: "destructive" });
          return;
        }
        const min = Math.min(...numericValues);
        const max = Math.max(...numericValues);
        const range = max - min || 1;
        const newData = data.map((row) => {
          const v = row[columnId];
          const n = Number(v);
          if (v === null || v === undefined || v === '' || Number.isNaN(n)) return row;
          return { ...row, [columnId]: (n - min) / range };
        });
        setData(newData);
        setPendingChanges((prev) => {
          const next = [...prev, { type: 'modify' as const, columnName: columnId }];
          onPendingChangesChange?.(true, next);
          return next;
        });
        toast({ title: "Data normalized", description: "Min-max scaled to [0, 1]. Confirm changes to save." });
        return;
      }

      if (action === 'Standardize Data' || action === 'Standardize Data (Z-Score)') {
        if (num < 2) {
          toast({ title: "Not enough data", description: "Need at least 2 values for z-score.", variant: "destructive" });
          return;
        }
        const mean = numericValues.reduce((a, b) => a + b, 0) / num;
        const variance = numericValues.reduce((s, x) => s + (x - mean) ** 2, 0) / num;
        const std = Math.sqrt(variance) || 1;
        const newData = data.map((row) => {
          const v = row[columnId];
          const n = Number(v);
          if (v === null || v === undefined || v === '' || Number.isNaN(n)) return row;
          return { ...row, [columnId]: (n - mean) / std };
        });
        setData(newData);
        setPendingChanges((prev) => {
          const next = [...prev, { type: 'modify' as const, columnName: columnId }];
          onPendingChangesChange?.(true, next);
          return next;
        });
        toast({ title: "Data standardized", description: "Z-score applied. Confirm changes to save." });
        return;
      }

      if (action === 'Log Transform') {
        if (num === 0) {
          toast({ title: "No numeric values", description: "Column has no numeric values.", variant: "destructive" });
          return;
        }
        const newData = data.map((row) => {
          const v = row[columnId];
          const n = Number(v);
          if (v === null || v === undefined || v === '' || Number.isNaN(n)) return row;
          return { ...row, [columnId]: Math.log(Math.max(0, n) + 1) };
        });
        setData(newData);
        setPendingChanges((prev) => {
          const next = [...prev, { type: 'modify' as const, columnName: columnId }];
          onPendingChangesChange?.(true, next);
          return next;
        });
        toast({ title: "Log transform applied", description: "log(x+1). Confirm changes to save." });
        return;
      }

      if (action === 'Square Root Transform') {
        if (num === 0) {
          toast({ title: "No numeric values", description: "Column has no numeric values.", variant: "destructive" });
          return;
        }
        const newData = data.map((row) => {
          const v = row[columnId];
          const n = Number(v);
          if (v === null || v === undefined || v === '' || Number.isNaN(n)) return row;
          return { ...row, [columnId]: Math.sqrt(Math.max(0, n)) };
        });
        setData(newData);
        setPendingChanges((prev) => {
          const next = [...prev, { type: 'modify' as const, columnName: columnId }];
          onPendingChangesChange?.(true, next);
          return next;
        });
        toast({ title: "Square root applied", description: "sqrt(x). Confirm changes to save." });
        return;
      }

      if (action === 'Bin Data' || action === 'Bin/Group Data') {
        if (num === 0) {
          toast({ title: "No numeric values", description: "Column has no numeric values.", variant: "destructive" });
          return;
        }
        const bins = 5;
        const minVal = Math.min(...numericValues);
        const maxVal = Math.max(...numericValues);
        const step = (maxVal - minVal) / bins || 1;
        const newData = data.map((row) => {
          const v = row[columnId];
          const n = Number(v);
          if (v === null || v === undefined || v === '' || Number.isNaN(n)) return row;
          const binIndex = Math.min(Math.floor((n - minVal) / step), bins - 1);
          return { ...row, [columnId]: `Bin ${binIndex + 1} (${(minVal + binIndex * step).toFixed(1)}-${(minVal + (binIndex + 1) * step).toFixed(1)})` };
        });
        setData(newData);
        setPendingChanges((prev) => {
          const next = [...prev, { type: 'modify' as const, columnName: columnId }];
          onPendingChangesChange?.(true, next);
          return next;
        });
        toast({ title: "Data binned", description: `${bins} equal-width bins. Confirm changes to save.` });
        return;
      }

      toast({
        title: "Action not found",
        description: `"${action}" could not be applied.`,
        variant: "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Action failed",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  }, [csvId, data, columnDisplayFormat, onPendingChangesChange, toast]);
  
  const handleAddColumn = useCallback((position: 'left' | 'right', columnId: string) => {
    // Store the pending column add info and show dialog
    setPendingColumnAdd({ position, columnId });
    setNewColumnName("");
    setShowColumnNameDialog(true);
  }, []);
  
  const confirmAddColumn = useCallback(() => {
    if (!pendingColumnAdd || !newColumnName.trim()) {
      toast({
        title: "Invalid column name",
        description: "Please enter a valid column name",
        variant: "destructive",
      });
      return;
    }
    
    // Check if column name already exists
    if (columns.some(col => col.id === newColumnName.trim())) {
      toast({
        title: "Column name exists",
        description: "A column with this name already exists. Please choose a different name.",
        variant: "destructive",
      });
      return;
    }
    
    const columnName = newColumnName.trim();
    const newColumn: ColumnDef<any> = {
      id: columnName,
      accessorKey: columnName,
      header: columnName,
      size: 150,
      minSize: 60,
      maxSize: 800,
    };
    
    const currentCols = [...columns];
    const colIndex = currentCols.findIndex(col => col.id === pendingColumnAdd.columnId);
    
    if (pendingColumnAdd.position === 'left') {
      currentCols.splice(colIndex, 0, newColumn);
    } else {
      currentCols.splice(colIndex + 1, 0, newColumn);
    }
    
    // Add empty values to all rows
    const newData = data.map(row => ({
      ...row,
      [columnName]: "",
    }));
    
    setColumns(currentCols);
    setData(newData);
    
    // Track change
    const updatedChanges = [...pendingChanges, {
      type: 'add',
      columnName: columnName,
      position: pendingColumnAdd.position === 'left' ? colIndex : colIndex + 1,
    }];
    setPendingChanges(updatedChanges);
    onPendingChangesChange?.(updatedChanges.length > 0, updatedChanges);
    
    setShowColumnNameDialog(false);
    setPendingColumnAdd(null);
    setNewColumnName("");
    
    toast({
      title: "Column added",
      description: `New column "${columnName}" added ${pendingColumnAdd.position} of ${pendingColumnAdd.columnId}`,
    });
  }, [pendingColumnAdd, newColumnName, columns, data, pendingChanges, onPendingChangesChange, toast]);
  
  const handleDuplicateColumn = useCallback((columnId: string) => {
    const newColumnName = `${columnId}_copy_${Date.now()}`;
    const newColumn: ColumnDef<any> = {
      id: newColumnName,
      accessorKey: newColumnName,
      header: newColumnName,
      size: 150,
      minSize: 60,
      maxSize: 800,
    };
    
    const colIndex = columns.findIndex(col => col.id === columnId);
    const currentCols = [...columns];
    currentCols.splice(colIndex + 1, 0, newColumn);
    
    // Copy values from original column
    const newData = data.map(row => ({
      ...row,
      [newColumnName]: row[columnId] || "",
    }));
    
    setColumns(currentCols);
    setData(newData);
    
    const updatedChanges = [...pendingChanges, {
      type: 'add',
      columnName: newColumnName,
      position: colIndex + 1,
    }];
    setPendingChanges(updatedChanges);
    onPendingChangesChange?.(updatedChanges.length > 0, updatedChanges);
    
      toast({
        title: "Column duplicated",
        description: `${columnId} has been duplicated`,
      });
  }, [columns, data, pendingChanges, onPendingChangesChange, toast]);
  
  const handleDeleteColumn = useCallback((columnId: string) => {
    const newCols = columns.filter(col => col.id !== columnId);
    const newData = data.map(row => {
      const { [columnId]: _, ...rest } = row;
      return rest;
    });
    
    setColumns(newCols);
    setData(newData);
    
    const updatedChanges = [...pendingChanges, {
      type: 'delete',
      columnName: columnId,
    }];
    setPendingChanges(updatedChanges);
    onPendingChangesChange?.(updatedChanges.length > 0, updatedChanges);
    
    toast({
      title: "Column deleted",
      description: `${columnId} has been removed`,
    });
  }, [columns, data, pendingChanges, onPendingChangesChange, toast]);
  
  const handleConfirmChanges = useCallback(async () => {
    try {
      // Fetch all data from backend (not just current page)
      // Use a large limit to get all data, or fetch without limit if backend supports it
      const allDataResponse = await apiRequest<{
        columns: string[];
        data: any[];
        total_rows: number;
        returned_rows: number;
        total_columns: number;
      }>(`/datasets/${csvId}/data?limit=1000000`); // Large limit to get all data
      
      if (!allDataResponse || !allDataResponse.data) {
        throw new Error("Failed to fetch all data for saving");
      }
      
      // Start with all original data
      let dataToSave = [...allDataResponse.data];
      let columnsToSave = [...allDataResponse.columns];
      
      // Apply pending changes
      // First, handle column additions and deletions
      const addedColumns: string[] = [];
      const deletedColumns: string[] = [];
      
      pendingChanges.forEach(change => {
        if (change.type === 'add' && change.columnName) {
          if (!columnsToSave.includes(change.columnName)) {
            columnsToSave.push(change.columnName);
            addedColumns.push(change.columnName);
            // Add empty values for this column to all rows
            dataToSave = dataToSave.map(row => ({
              ...row,
              [change.columnName]: ""
            }));
          }
        } else if (change.type === 'delete' && change.columnName) {
          if (columnsToSave.includes(change.columnName)) {
            columnsToSave = columnsToSave.filter(col => col !== change.columnName);
            deletedColumns.push(change.columnName);
            // Remove column from all rows
            dataToSave = dataToSave.map(row => {
              const { [change.columnName]: _, ...rest } = row;
              return rest;
            });
          }
        }
      });
      
      // Then apply cell modifications
      // Note: rowIndex in pendingChanges is relative to current page, so we need to adjust
      const pageOffset = currentPage * pageSize;
      pendingChanges.forEach(change => {
        if (change.type === 'modify' && change.rowIndex !== undefined && change.columnName && change.newValue !== undefined) {
          const globalRowIndex = pageOffset + change.rowIndex;
          if (globalRowIndex < dataToSave.length) {
            dataToSave[globalRowIndex] = {
              ...dataToSave[globalRowIndex],
              [change.columnName]: change.newValue
            };
          }
        }
      });
      
      // Also apply any changes from current page data that might not be in pendingChanges
      // (in case user edited cells but changes weren't tracked)
      data.forEach((row, localIndex) => {
        const globalIndex = pageOffset + localIndex;
        if (globalIndex < dataToSave.length) {
          // Merge current page data with saved data
          dataToSave[globalIndex] = {
            ...dataToSave[globalIndex],
            ...row
          };
        }
      });
      
      // Ensure all columns from current columns are included
      const currentColumnNames = columns.map(col => col.id as string);
      currentColumnNames.forEach(colName => {
        if (!columnsToSave.includes(colName)) {
          columnsToSave.push(colName);
          // Add empty values for missing columns
          dataToSave = dataToSave.map(row => ({
            ...row,
            [colName]: row[colName] || ""
          }));
        }
      });
      
      // Reorder columns to match current column order
      const columnOrder = columns.map(col => col.id as string);
      const orderedColumns = columnOrder.filter(col => columnsToSave.includes(col));
      const remainingColumns = columnsToSave.filter(col => !columnOrder.includes(col));
      columnsToSave = [...orderedColumns, ...remainingColumns];
      
      // Save to backend
      await saveDatasetChanges(csvId.toString(), columnsToSave, dataToSave);
      
      // Update original data and columns to reflect saved state
      setOriginalData([...data]);
      setOriginalColumns([...columns]);
      setPendingChanges([]);
      setConfirmDialogOpen(false);
      onPendingChangesChange?.(false, []);
      
      // Reload current page data to reflect saved changes
      const offset = currentPage * pageSize;
      const limit = pageSize >= 1000000 ? undefined : pageSize;
      const reloadUrl = limit 
        ? `/datasets/${csvId}/data?limit=${limit}&offset=${offset}`
        : `/datasets/${csvId}/data?offset=${offset}`;
      const pageDataResponse = await apiRequest<{
        columns: string[];
        data: any[];
        total_rows: number;
        returned_rows: number;
        total_columns: number;
      }>(reloadUrl);
      
      if (pageDataResponse && pageDataResponse.data) {
        setData(pageDataResponse.data);
        setTotalRows(pageDataResponse.total_rows);
      }
      
      // Execute callback if provided (e.g., for tab switching)
      if (onConfirmCallback) {
        onConfirmCallback();
        setOnConfirmCallback(null);
      }
      
      toast({
        title: "Changes saved",
        description: `Successfully saved ${dataToSave.length} rows and ${columnsToSave.length} columns`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to save changes",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    }
  }, [csvId, data, columns, pendingChanges, currentPage, pageSize, onPendingChangesChange, onConfirmCallback, toast]);
  
  // Expose function to trigger confirm dialog from parent
  const triggerConfirmDialog = useCallback((callback?: () => void) => {
    if (callback) {
      setOnConfirmCallback(() => callback);
    }
    setConfirmDialogOpen(true);
  }, []);
  
  // Expose function to discard changes from parent
  const triggerDiscardChanges = useCallback((callback?: () => void) => {
    setData([...originalData]);
    setColumns([...originalColumns]);
    setPendingChanges([]);
    setConfirmDialogOpen(false);
    onPendingChangesChange?.(false, []);
    
    if (callback) {
      callback();
    }
    
    toast({
      title: "Changes discarded",
      description: "All changes have been reverted",
    });
  }, [originalData, originalColumns, onPendingChangesChange, toast]);
  
  const handleDiscardChanges = useCallback(() => {
    triggerDiscardChanges();
  }, [triggerDiscardChanges]);
  
  // Expose functions for parent component to call
  useEffect(() => {
    // Store functions in a way parent can access them if needed
    // For now, we'll use the callback approach
  }, []);
  
  // Expose function to check and handle pending changes (for parent component)
  useEffect(() => {
    onPendingChangesChange?.(pendingChanges.length > 0, pendingChanges);
  }, [pendingChanges, onPendingChangesChange]);
  
  // Expose confirm/discard functions to parent
  useEffect(() => {
    if (onRequestConfirm) {
      onRequestConfirm(
        (callback?: () => void) => triggerConfirmDialog(callback),
        (callback?: () => void) => triggerDiscardChanges(callback)
      );
    }
  }, [onRequestConfirm]);

  const handleAddIntelligentColumn = useCallback(async (sourceColumn: string, newColumnName: string, prompt: string) => {
    const columnName = newColumnName.trim();
    if (!columnName) {
      toast({
        title: "Missing column name",
        description: "Please enter a name for the new column.",
        variant: "destructive",
      });
      return;
    }
    if (columns.some(col => col.id === columnName)) {
      toast({
        title: "Column name exists",
        description: "A column with this name already exists. Please choose a different name.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await addIntelligentColumn(String(csvId), {
        source_columns: [sourceColumn],
        prompt,
        new_column_name: columnName,
      });
      if (!res.success || !res.new_column_data) {
        throw new Error(res.message || "Failed to add intelligent column");
      }
      const newColName = res.new_column_name;
      const newColumn: ColumnDef<any> = {
        id: newColName,
        accessorKey: newColName,
        header: newColName,
        size: 150,
        minSize: 60,
        maxSize: 800,
      };
      setColumns(prev => [...prev, newColumn]);
      const offset = currentPage * pageSize;
      setData(prev => prev.map((row, i) => ({
        ...row,
        [newColName]: res.new_column_data[offset + i] ?? "",
      })));
      toast({
        title: "Intelligent column added",
        description: `${newColName} was generated and saved to the dataset.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to add column",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
      throw error;
    }
  }, [columns, csvId, currentPage, pageSize, toast]);

  const columnNames = useMemo(() => {
    return columns.map(col => col.id as string);
  }, [columns]);

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-border bg-background flex-shrink-0">
        <div className="flex flex-col gap-3">
          {pendingChanges.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  You have {pendingChanges.length} pending change{pendingChanges.length > 1 ? 's' : ''}
                </span>
              </div>
              <Button
                onClick={() => setConfirmDialogOpen(true)}
                size="sm"
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirm Changes
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Search across all columns..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <AddIntelligentColumnDialog 
                columns={columnNames}
                onAddColumn={handleAddIntelligentColumn}
              />
              <Button onClick={handleExport} variant="outline" className="gap-2 whitespace-nowrap">
                <Download className="h-4 w-4" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
            <span className="font-medium">Total Rows: <span className="text-foreground">{totalRows || data.length}</span></span>
            <span className="font-medium">Total Columns: <span className="text-foreground">{columns.length || table.getAllColumns().length}</span></span>
            {totalRows > pageSize && pageSize < 1000000 && (
              <span className="font-medium">
                Page: <span className="text-foreground">{currentPage + 1} of {Math.ceil(totalRows / pageSize)}</span>
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className="font-medium">Rows per page:</span>
              <Select
                value={pageSize >= 1000000 ? "all" : pageSize.toString()}
                onValueChange={(value) => {
                  if (value === "all") {
                    setPageSize(1000000); // Large number to get all rows
                  } else {
                    setPageSize(parseInt(value));
                  }
                }}
              >
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
                  <SelectItem value="2000">2000</SelectItem>
                  <SelectItem value="5000">5000</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {totalRows > pageSize && pageSize < 1000000 && (
            <div className="flex items-center gap-2 justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0 || isLoading}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, totalRows)} of {totalRows}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={(currentPage + 1) * pageSize >= totalRows || isLoading}
                className="gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          {pageSize >= 1000000 && totalRows > 0 && (
            <div className="flex items-center justify-center pt-2">
              <span className="text-sm text-muted-foreground">
                Showing all {totalRows} rows
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading CSV data...</p>
            </div>
          </div>
        ) : data.length === 0 || columns.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No data available</p>
          </div>
        ) : (
          <div className="p-3 sm:p-4 min-w-max">
            <div className="border rounded-lg overflow-hidden">
              <table
                className="border-collapse"
                style={{
                  tableLayout: 'fixed',
                  width: table.getTotalSize(),
                  minWidth: '100%',
                }}
              >
              <thead>
                <tr className="border-b bg-muted/50">
                  {table.getFlatHeaders().map((header) => (
                    <th
                      key={header.id}
                      className="text-left p-2 sm:p-3 font-semibold text-xs sm:text-sm text-foreground border-r last:border-r-0 whitespace-nowrap relative group"
                      style={{
                        width: header.getSize(),
                        minWidth: header.column.columnDef.minSize ?? 60,
                        maxWidth: header.column.columnDef.maxSize ?? 800,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 pr-1">
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 hover:text-primary transition-colors min-w-0 flex-1 text-left"
                        >
                          <span className="truncate block">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 sm:h-7 sm:w-7 shrink-0"
                            >
                              <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto bg-background z-50">
                            <DropdownMenuLabel>Column Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Arithmetic Operations</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleColumnAction('Calculate Sum', header.id)}>
                              <Calculator className="h-4 w-4 mr-2" />
                              Calculate Sum
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Calculate Average', header.id)}>
                              <Calculator className="h-4 w-4 mr-2" />
                              Calculate Average
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Calculate Median', header.id)}>
                              <Calculator className="h-4 w-4 mr-2" />
                              Calculate Median
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Calculate Min/Max', header.id)}>
                              <Calculator className="h-4 w-4 mr-2" />
                              Calculate Min/Max
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Standard Deviation', header.id)}>
                              <Calculator className="h-4 w-4 mr-2" />
                              Standard Deviation
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Count Unique Values', header.id)}>
                              <Calculator className="h-4 w-4 mr-2" />
                              Count Unique Values
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Calculate Variance', header.id)}>
                              <Calculator className="h-4 w-4 mr-2" />
                              Calculate Variance
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Calculate Mode', header.id)}>
                              <Calculator className="h-4 w-4 mr-2" />
                              Calculate Mode
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Calculate Range', header.id)}>
                              <Calculator className="h-4 w-4 mr-2" />
                              Calculate Range
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Calculate Percentiles', header.id)}>
                              <Calculator className="h-4 w-4 mr-2" />
                              Calculate Percentiles
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Data Operations</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleColumnAction('Remove Outliers', header.id)}>
                              <Filter className="h-4 w-4 mr-2" />
                              Remove Outliers
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Remove Duplicates', header.id)}>
                              <Filter className="h-4 w-4 mr-2" />
                              Remove Duplicates
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Fill Missing Values', header.id)}>
                              <Filter className="h-4 w-4 mr-2" />
                              Fill Missing Values
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Normalize Data', header.id)}>
                              <Filter className="h-4 w-4 mr-2" />
                              Normalize Data
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Standardize Data', header.id)}>
                              <Filter className="h-4 w-4 mr-2" />
                              Standardize Data (Z-Score)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Log Transform', header.id)}>
                              <Filter className="h-4 w-4 mr-2" />
                              Log Transform
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Square Root Transform', header.id)}>
                              <Filter className="h-4 w-4 mr-2" />
                              Square Root Transform
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Bin Data', header.id)}>
                              <Filter className="h-4 w-4 mr-2" />
                              Bin/Group Data
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Column Management</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleAddColumn('left', header.id)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Column Left
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAddColumn('right', header.id)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Column Right
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateColumn(header.id)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Duplicate Column
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Formatting</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleColumnAction('Align Left', header.id)}>
                              <AlignLeft className="h-4 w-4 mr-2" />
                              Align Left
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Align Center', header.id)}>
                              <AlignCenter className="h-4 w-4 mr-2" />
                              Align Center
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Align Right', header.id)}>
                              <AlignRight className="h-4 w-4 mr-2" />
                              Align Right
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Format as Currency', header.id)}>
                              <AlignLeft className="h-4 w-4 mr-2" />
                              Format as Currency
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Format as Percentage', header.id)}>
                              <AlignLeft className="h-4 w-4 mr-2" />
                              Format as Percentage
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteColumn(header.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Minus className="h-4 w-4 mr-2" />
                              Delete Column
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          header.getResizeHandler()(e);
                        }}
                        onTouchStart={(e) => {
                          header.getResizeHandler()(e);
                        }}
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none z-10 hover:bg-primary/40 active:bg-primary/60 shrink-0"
                        style={{ userSelect: 'none', minWidth: 8 }}
                        title="Drag to resize column"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, rowIndex) => (
                  <tr 
                    key={row.id} 
                    className={`border-b hover:bg-muted/30 transition-colors ${rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="p-2 sm:p-3 text-xs sm:text-sm text-foreground border-r last:border-r-0 whitespace-nowrap"
                        style={{
                          width: cell.column.getSize(),
                          minWidth: cell.column.columnDef.minSize ?? 60,
                          maxWidth: cell.column.columnDef.maxSize ?? 800,
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Calculation Result Modal */}
      {calculationResult && (
        <ColumnCalculationModal
          open={calculationModalOpen}
          onOpenChange={setCalculationModalOpen}
          columnName={calculationResult.columnName}
          operation={calculationResult.operation}
          result={calculationResult.result}
          totalValues={calculationResult.totalValues}
          validNumericValues={calculationResult.validNumericValues}
        />
      )}
      
      {/* Confirm Changes Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Changes</DialogTitle>
            <DialogDescription>
              You have {pendingChanges.length} pending change{pendingChanges.length > 1 ? 's' : ''}. 
              Do you want to save these changes to the dataset?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              {pendingChanges.map((change, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium">{change.type === 'add' ? 'Add' : change.type === 'delete' ? 'Delete' : 'Modify'}:</span> {change.columnName}
                  {change.type === 'modify' && change.rowIndex !== undefined && (
                    <span className="text-muted-foreground ml-2">(Row {change.rowIndex + 1})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleDiscardChanges}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleConfirmChanges}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Column Name Dialog */}
      <Dialog open={showColumnNameDialog} onOpenChange={setShowColumnNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Column</DialogTitle>
            <DialogDescription>
              Enter a name for the new column
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Column name"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  confirmAddColumn();
                } else if (e.key === 'Escape') {
                  setShowColumnNameDialog(false);
                  setPendingColumnAdd(null);
                  setNewColumnName("");
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowColumnNameDialog(false);
                setPendingColumnAdd(null);
                setNewColumnName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAddColumn}
              disabled={!newColumnName.trim()}
            >
              Add Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

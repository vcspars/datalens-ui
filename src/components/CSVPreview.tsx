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
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Search, ArrowUpDown, MoreVertical, Plus, Minus, AlignLeft, AlignCenter, AlignRight, Calculator, Filter, Loader2, CheckCircle2, XCircle } from "lucide-react";
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
import { apiRequest, saveDatasetChanges } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CSVPreviewProps {
  csvId: number | string;
  onPendingChangesChange?: (hasChanges: boolean, changes: ColumnChange[]) => void;
  onRequestConfirm?: (confirmFn: () => void, discardFn: () => void) => void;
}

interface ColumnChange {
  type: 'add' | 'modify' | 'delete';
  columnName: string;
  data?: any[];
  position?: number;
  rowIndex?: number;
  oldValue?: any;
  newValue?: any;
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
  const [pageSize] = useState(100);
  const { toast } = useToast();

  // Debounce global filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedGlobalFilter(globalFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [globalFilter]);

  useEffect(() => {
    const loadCSVData = async () => {
      try {
        setIsLoading(true);
        const offset = currentPage * pageSize;
        const response = await apiRequest<{
          columns: string[];
          data: any[];
          total_rows: number;
          returned_rows: number;
          total_columns: number;
        }>(`/datasets/${csvId}/data?limit=${pageSize}&offset=${offset}`);
        
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
        
        return (
          <EditableCell
            value={value}
            rowIndex={row.index}
            columnId={column.id}
            isEditing={isEditing}
            onEdit={handleCellEdit}
            onSave={handleCellSave}
            onCancel={handleCellCancel}
          />
        );
      },
    }));
  }, [columns, editingCell, handleCellEdit, handleCellSave, handleCellCancel]);

  // Use memoized columns if available, otherwise fall back to regular columns
  const tableColumns = memoizedColumns.length > 0 ? memoizedColumns : columns;
  
  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      globalFilter: debouncedGlobalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setDebouncedGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableColumnResizing: false,
  });

  const handleExport = useCallback(() => {
    console.log('Exporting CSV:', csvId);
    // Call backend API to export
  }, [csvId]);

  const handleColumnAction = useCallback(async (action: string, columnId: string) => {
    try {
      // Map action names to backend operation names
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
      };
      
      const operation = operationMap[action] || action.toLowerCase();
      
      if (!operationMap[action] && !['sum', 'average', 'median', 'min', 'max', 'min/max', 'standard deviation', 'variance', 'mode', 'range', 'count unique', 'count'].includes(operation)) {
        toast({
          title: "Action not implemented",
          description: `${action} is not yet available`,
          variant: "destructive",
        });
        return;
      }
      
      // Call backend API for calculation
      const response = await apiRequest<{
        column: string;
        operation: string;
        result: {
          value?: number;
          min?: number;
          max?: number;
          formatted: string;
        };
        total_values: number;
        valid_numeric_values: number;
      }>(`/datasets/${csvId}/column/calculate`, {
        method: "POST",
        body: JSON.stringify({
          column_name: columnId,
          operation: operation,
        }),
      });
      
      setCalculationResult({
        columnName: response.column,
        operation: response.operation,
        result: response.result,
        totalValues: response.total_values,
        validNumericValues: response.valid_numeric_values,
      });
      setCalculationModalOpen(true);
    } catch (error: any) {
      toast({
        title: "Calculation failed",
        description: error?.message || "Failed to calculate statistic",
        variant: "destructive",
      });
    }
  }, [csvId, toast]);
  
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
      const pageDataResponse = await apiRequest<{
        columns: string[];
        data: any[];
        total_rows: number;
        returned_rows: number;
        total_columns: number;
      }>(`/datasets/${csvId}/data?limit=${pageSize}&offset=${offset}`);
      
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
    try {
      // TODO: Call backend API to add intelligent column
      // For now, simulate adding a column
      const newColumn: ColumnDef<any> = {
        id: columnName,
        accessorKey: columnName,
        header: columnName,
      };
      
      const currentCols = [...columns];
      currentCols.push(newColumn);
      
      // Add empty values to all rows (or calculated values from backend)
      const newData = data.map(row => ({
        ...row,
        [columnName]: "", // Placeholder - would be calculated by backend
      }));
      
      setColumns(currentCols);
      setData(newData);
      
      // Track change
      const updatedChanges = [...pendingChanges, {
        type: 'add',
        columnName: columnName,
      }];
      setPendingChanges(updatedChanges);
      onPendingChangesChange?.(updatedChanges.length > 0, updatedChanges);
      
      toast({
        title: "Intelligent column added",
        description: `${columnName} has been added`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to add column",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    }
  }, [columns, data, pendingChanges, onPendingChangesChange, toast]);

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
            {totalRows > pageSize && (
              <span className="font-medium">
                Page: <span className="text-foreground">{currentPage + 1} of {Math.ceil(totalRows / pageSize)}</span>
              </span>
            )}
          </div>
          {totalRows > pageSize && (
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
              <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  {table.getFlatHeaders().map((header) => (
                    <th
                      key={header.id}
                      className="text-left p-2 sm:p-3 font-semibold text-xs sm:text-sm text-foreground border-r last:border-r-0 whitespace-nowrap min-w-[150px]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
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
                      <td key={cell.id} className="p-2 sm:p-3 text-xs sm:text-sm text-foreground border-r last:border-r-0 whitespace-nowrap min-w-[150px]">
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

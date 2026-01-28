import { useState, useMemo } from "react";
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
import { Download, Search, ArrowUpDown, MoreVertical, Plus, Minus, AlignLeft, AlignCenter, AlignRight, Calculator, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AddIntelligentColumnDialog from "./AddIntelligentColumnDialog";
import { useToast } from "@/hooks/use-toast";

interface CSVPreviewProps {
  csvId: number;
}

export default function CSVPreview({ csvId }: CSVPreviewProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const { toast } = useToast();

  // Mock data - replace with actual CSV data from backend
  const data = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      category: ['Electronics', 'Clothing', 'Food', 'Books'][i % 4],
      price: (Math.random() * 1000).toFixed(2),
      quantity: Math.floor(Math.random() * 100),
      date: new Date(2024, 0, i + 1).toLocaleDateString(),
    }));
  }, []);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "id",
        accessorKey: "id",
        header: "ID",
      },
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
      },
      {
        id: "category",
        accessorKey: "category",
        header: "Category",
      },
      {
        id: "price",
        accessorKey: "price",
        header: "Price",
      },
      {
        id: "quantity",
        accessorKey: "quantity",
        header: "Quantity",
      },
      {
        id: "date",
        accessorKey: "date",
        header: "Date",
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleExport = () => {
    console.log('Exporting CSV:', csvId);
    // Call backend API to export
  };

  const handleColumnAction = (action: string, columnId: string) => {
    console.log('Column action:', action, columnId);
    toast({
      title: "Action Triggered",
      description: `${action} on column ${columnId}`,
    });
    // Call backend API for column actions
  };

  const handleAddIntelligentColumn = async (sourceColumn: string, newColumnName: string, prompt: string) => {
    console.log('Adding intelligent column:', { sourceColumn, newColumnName, prompt });
    // Call backend API to add intelligent column
    // Simulating API call
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  const columnNames = useMemo(() => {
    return columns.map(col => col.id as string);
  }, [columns]);

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-border bg-background flex-shrink-0">
        <div className="flex flex-col gap-3">
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
            <span className="font-medium">Total Rows: <span className="text-foreground">{data.length}</span></span>
            <span className="font-medium">Total Columns: <span className="text-foreground">{table.getAllColumns().length}</span></span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
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
                            <DropdownMenuItem onClick={() => handleColumnAction('Calculate Standard Deviation', header.id)}>
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
                            <DropdownMenuItem onClick={() => handleColumnAction('Add Column Left', header.id)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Column Left
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Add Column Right', header.id)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Column Right
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleColumnAction('Duplicate Column', header.id)}>
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
                              onClick={() => handleColumnAction('Delete Column', header.id)}
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
      </div>
    </div>
  );
}

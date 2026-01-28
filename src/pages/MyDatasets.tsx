import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Sheet, Database, ChevronRight, Trash2, Plus } from "lucide-react";
import { getDatasets, deleteDataset, DatasetResponse } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import UploadPDFDialog from "@/components/UploadPDFDialog";
import UploadCSVDialog from "@/components/UploadCSVDialog";
import ConnectDatabaseDialog from "@/components/ConnectDatabaseDialog";

interface DatasetItem {
  id: number;
  name: string;
  uploadedAt: Date;
  size?: string;
  _id?: string; // MongoDB ObjectId for navigation
}

export default function MyDatasets() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [csvFiles, setCsvFiles] = useState<DatasetItem[]>([]);
  const [pdfFiles, setPdfFiles] = useState<DatasetItem[]>([]);
  const [databases, setDatabases] = useState<DatasetItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [dbDialogOpen, setDbDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDatasets = async () => {
    try {
      setIsLoading(true);
      const datasets = await getDatasets();

      const csv: DatasetItem[] = [];
      const pdf: DatasetItem[] = [];
      const db: DatasetItem[] = [];

      datasets.forEach((d: DatasetResponse) => {
        // Ensure _id is present - it should always be the MongoDB ObjectId from backend
        if (!d._id) {
          console.error("Dataset missing _id:", d);
          return; // Skip datasets without valid MongoDB ID
        }
        
        const item: DatasetItem = {
          id: d.id,
          name: d.name,
          uploadedAt: new Date(d.uploadedAt),
          size: d.size,
          _id: d._id, // MongoDB ObjectId string
        };

        if (d.type === "csv") {
          csv.push(item);
        } else if (d.type === "pdf") {
          pdf.push(item);
        } else if (d.type === "database") {
          db.push(item);
        }
      });

      setCsvFiles(csv);
      setPdfFiles(pdf);
      setDatabases(db);
    } catch (error: any) {
      toast({
        title: "Failed to load datasets",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, [toast]);

  const handleDatasetClick = (type: 'csv' | 'pdf' | 'database', item: DatasetItem) => {
    // Use MongoDB ObjectId (_id) - it should always be present
    if (!item._id) {
      toast({
        title: "Invalid dataset",
        description: "Dataset ID is missing. Please try refreshing the page.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/dashboard/${type}/${item._id}`);
  };

  const handleDelete = async (e: React.MouseEvent, item: DatasetItem, type: 'csv' | 'pdf' | 'database') => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    
    if (!item._id) {
      toast({
        title: "Cannot delete",
        description: "Dataset ID not found",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(item._id);
      await deleteDataset(item._id);
      
      toast({
        title: "Dataset deleted",
        description: `${item.name} has been deleted successfully.`,
      });

      // Reload datasets
      await loadDatasets();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "Failed to delete dataset",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploadSuccess = () => {
    // Reload datasets after successful upload
    loadDatasets();
  };

  const renderDatasetList = (
    items: DatasetItem[],
    type: 'csv' | 'pdf' | 'database',
    Icon: typeof FileText
  ) => {
    if (isLoading) {
      return (
        <p className="text-muted-foreground text-sm py-4 text-center">Loading {type} files...</p>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="text-center space-y-2">
            <Icon className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
            <p className="text-muted-foreground text-sm">No {type} files uploaded yet</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (type === 'csv') {
                setCsvDialogOpen(true);
              } else if (type === 'pdf') {
                setPdfDialogOpen(true);
              } else if (type === 'database') {
                setDbDialogOpen(true);
              }
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add {type === 'csv' ? 'CSV File' : type === 'pdf' ? 'PDF File' : 'Database'}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div
              onClick={() => handleDatasetClick(type, item)}
              className="flex items-center gap-3 flex-1 cursor-pointer"
            >
              <Icon className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  Uploaded {item.uploadedAt.toLocaleDateString()}
                  {item.size && ` • ${item.size}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleDelete(e, item, type)}
                disabled={deletingId === item._id}
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete dataset"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Datasets</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your connected data sources
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sheet className="h-5 w-5 text-primary" />
                CSV / Excel Files
              </CardTitle>
              <CardDescription>
                Uploaded spreadsheet files for analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderDatasetList(csvFiles, 'csv', Sheet)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                PDF Files
              </CardTitle>
              <CardDescription>
                Uploaded PDF documents for analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderDatasetList(pdfFiles, 'pdf', FileText)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Databases
              </CardTitle>
              <CardDescription>
                Connected database sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderDatasetList(databases, 'database', Database)}
            </CardContent>
          </Card>
        </div>
      </div>

      <UploadPDFDialog 
        open={pdfDialogOpen} 
        onOpenChange={(open) => {
          setPdfDialogOpen(open);
          if (!open) handleUploadSuccess();
        }} 
      />
      <UploadCSVDialog 
        open={csvDialogOpen} 
        onOpenChange={(open) => {
          setCsvDialogOpen(open);
          if (!open) handleUploadSuccess();
        }} 
      />
      <ConnectDatabaseDialog 
        open={dbDialogOpen} 
        onOpenChange={(open) => {
          setDbDialogOpen(open);
          if (!open) handleUploadSuccess();
        }} 
      />
    </div>
  );
}

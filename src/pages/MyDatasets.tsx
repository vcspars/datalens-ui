import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Sheet, Database, ChevronRight } from "lucide-react";
import { getDatasets, DatasetResponse } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

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

  useEffect(() => {
    const loadDatasets = async () => {
      try {
        setIsLoading(true);
        const datasets = await getDatasets();

        const csv: DatasetItem[] = [];
        const pdf: DatasetItem[] = [];
        const db: DatasetItem[] = [];

        datasets.forEach((d: DatasetResponse) => {
          const item: DatasetItem = {
            id: d.id,
            name: d.name,
            uploadedAt: new Date(d.uploadedAt),
            size: d.size,
            _id: d._id || d.id.toString(), // Use MongoDB ID if available
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

    loadDatasets();
  }, [toast]);

  const handleDatasetClick = (type: 'csv' | 'pdf' | 'database', item: DatasetItem) => {
    // Use MongoDB ObjectId (_id) if available, otherwise fall back to numeric id
    const datasetId = item._id || item.id.toString();
    navigate(`/dashboard/${type}/${datasetId}`);
  };

  const renderDatasetList = (
    items: DatasetItem[],
    type: 'csv' | 'pdf' | 'database',
    Icon: typeof FileText
  ) => (
    <div className="space-y-2">
      {isLoading ? (
        <p className="text-muted-foreground text-sm py-4 text-center">Loading {type} files...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4 text-center">No {type} files uploaded yet</p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            onClick={() => handleDatasetClick(type, item)}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  Uploaded {item.uploadedAt.toLocaleDateString()}
                  {item.size && ` • ${item.size}`}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        ))
      )}
    </div>
  );

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
    </div>
  );
}

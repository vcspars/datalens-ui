import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { connectDatabase, hasVCSAccess } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ConnectDatabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ConnectDatabaseDialog({ open, onOpenChange }: ConnectDatabaseDialogProps) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [useVCS, setUseVCS] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const vcsAccess = hasVCSAccess();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 100MB",
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

  const handleConnect = async () => {
    if (!useVCS && !file) {
      toast({
        title: "No database selected",
        description: "Please select a database file or use VCS access",
        variant: "destructive",
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your database",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await connectDatabase({
        name,
        file: file || undefined,
        useVCSAccess: useVCS,
      });
      
      toast({
        title: "Database connected successfully",
        description: `${name} has been connected and is ready to use.`,
      });

      // Navigate to the dashboard with the new dataset
      navigate(`/dashboard/database/${response.id}`);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setFile(null);
    setUseVCS(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Chat with Database
          </DialogTitle>
          <DialogDescription>
            Connect to a database to analyze and query its data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {vcsAccess && (
            <Alert className="border-primary bg-primary-light">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <strong>VCS Special Access Available!</strong>
                    <p className="text-sm text-muted-foreground">
                      You have access to SparsDB with pre-configured credentials.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setUseVCS(true);
                      setName("SparsDB VCS");
                    }}
                    size="sm"
                    className="shrink-0"
                    disabled={isLoading}
                  >
                    Use VCS Access
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {vcsAccess && !useVCS && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or upload your own database file
                </span>
              </div>
            </div>
          )}

          {useVCS ? (
            <Alert className="bg-muted">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>
                <strong>Using VCS Special Access</strong>
                <p className="text-sm">Connected to SparsDB with pre-configured credentials.</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setUseVCS(false);
                    setName("");
                  }}
                  className="h-auto p-0 text-sm"
                  disabled={isLoading}
                >
                  Use different database
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="db-file">Upload Database File</Label>
                <Input
                  id="db-file"
                  type="file"
                  accept=".db,.sqlite,.sql,.mdb,.accdb"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  className="cursor-pointer"
                />
                {file && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Supported formats: SQLite (.db, .sqlite), SQL dumps (.sql), Access (.mdb, .accdb)
                </p>
                <p className="text-xs text-muted-foreground">
                  Maximum file size: 100MB
                </p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="db-name">Database Name</Label>
            <Input
              id="db-name"
              placeholder="Enter database name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading || useVCS}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={isLoading || (!useVCS && !file)}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Connect
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

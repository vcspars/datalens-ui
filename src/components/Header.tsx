import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Sheet, Menu, ChevronDown, LayoutDashboard, HelpCircle, LogOut, Plus, FolderOpen, Sun, Moon, User } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import UploadPDFDialog from "./UploadPDFDialog";
import UploadCSVDialog from "./UploadCSVDialog";
import { getCurrentUser, logout, UserResponse } from "@/lib/api";

interface Dataset {
  id: number;
  name: string;
  type: 'pdf' | 'csv';
}

export default function Header() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [datasets] = useState<Dataset[]>([
    { id: 1, name: "Financial Report Q4.pdf", type: "pdf" },
    { id: 2, name: "Customer Data.csv", type: "csv" },
  ]);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [user, setUser] = useState<UserResponse | null>(null);

  useEffect(() => {
    // Fetch current user info
    const fetchUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        // User not logged in or token expired
        setUser(null);
      }
    };
    fetchUser();
  }, []);

  const getDatasetIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'csv': return <Sheet className="h-4 w-4" />;
      default: return null;
    }
  };

  const handleLogout = async () => {
    logout();
    setUser(null);
    navigate('/auth');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <header className="h-16 bg-background border-b border-border flex items-center px-4 sm:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">DL</span>
            </div>
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">DataLens</h1>
          </div>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2 ml-4 sm:ml-8">
          <Button 
            variant="ghost" 
            className="gap-2 text-sm sm:text-base px-2 sm:px-4" 
            onClick={() => navigate('/my-datasets')}
          >
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">My Datasets</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 text-sm sm:text-base px-2 sm:px-4">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add New Dataset</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-background z-50">
              <DropdownMenuLabel>Add New Dataset</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FileText className="h-4 w-4 mr-2" />
                  Add New File
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-background">
                  <DropdownMenuItem onClick={() => setCsvDialogOpen(true)}>
                    <Sheet className="h-4 w-4 mr-2" />
                    Add CSV File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPdfDialogOpen(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Add PDF File
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="ghost" 
            className="gap-2 text-sm sm:text-base px-2 sm:px-4" 
            onClick={() => navigate('/my-dashboard')}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden lg:inline">My Dashboard</span>
          </Button>

          <Button 
            variant="ghost" 
            className="gap-2 text-sm sm:text-base px-2 sm:px-4" 
            onClick={() => navigate('/help')}
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden lg:inline">Help</span>
          </Button>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-sm sm:text-base px-2 sm:px-4 h-9">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{user.full_name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" className="gap-2 text-sm sm:text-base px-2 sm:px-4" onClick={() => navigate('/auth')}>
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Login</span>
            </Button>
          )}
        </div>
      </header>

      <UploadPDFDialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen} />
      <UploadCSVDialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen} />
    </>
  );
}

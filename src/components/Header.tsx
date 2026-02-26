import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Database, LayoutDashboard, HelpCircle, LogOut, Sun, Moon, ChevronDown, User, MessageSquare } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getCurrentUser, logout, UserResponse } from "@/lib/api";

export default function Header() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<UserResponse | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log("[Header] Fetching current user...");
        const userData = await getCurrentUser();
        setUser(userData);
        console.log("[Header] User loaded:", userData.full_name);
      } catch (error) {
        console.log("[Header] User not logged in or token expired");
        setUser(null);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    console.log("[Header] Logging out user");
    logout();
    setUser(null);
    navigate("/auth");
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <header className="h-16 bg-background border-b border-border flex items-center px-4 sm:px-6 sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
          <Database className="h-4 w-4 text-primary-foreground" />
        </div>
        <h1 className="text-lg sm:text-xl font-semibold text-foreground">SPARSLens</h1>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-1 sm:gap-2 ml-4 sm:ml-8">
        <Button
          variant="ghost"
          className="gap-2 text-sm sm:text-base px-2 sm:px-4"
          onClick={() => {
            console.log("[Header] Navigate to /chat");
            navigate("/chat");
          }}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Chat with Database</span>
        </Button>

        <Button
          variant="ghost"
          className="gap-2 text-sm sm:text-base px-2 sm:px-4"
          onClick={() => {
            console.log("[Header] Navigate to /my-dashboard");
            navigate("/my-dashboard");
          }}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden sm:inline">My Dashboard</span>
        </Button>

        <Button
          variant="ghost"
          className="gap-2 text-sm sm:text-base px-2 sm:px-4"
          onClick={() => navigate("/help")}
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden lg:inline">Help</span>
        </Button>
      </nav>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 text-sm sm:text-base px-2 sm:px-4 h-9">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">{getInitials(user.full_name)}</AvatarFallback>
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
          <Button
            variant="ghost"
            className="gap-2 text-sm sm:text-base px-2 sm:px-4"
            onClick={() => navigate("/auth")}
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Login</span>
          </Button>
        )}
      </div>
    </header>
  );
}

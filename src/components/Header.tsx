import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, HelpCircle, LogOut, Sun, Moon, ChevronDown, User, MessageSquare, BarChart2, Cpu, Receipt } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  getCurrentUser,
  logout,
  UserResponse,
  getModelCatalog,
  updateModelPreference,
  ModelCatalogEntry,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const USER_CACHE_KEY = "spars_user_cache";

function getCachedUser(): UserResponse | null {
  try {
    const raw = sessionStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as UserResponse) : null;
  } catch {
    return null;
  }
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const pathname = location.pathname;

  // Initialise from cache so nav buttons never flash-disappear between pages
  const [user, setUser] = useState<UserResponse | null>(getCachedUser);

  // OpenRouter model picker — only rendered when the admin has enabled it
  // server-side (/api/models/catalog reports openrouter_enabled: true).
  // Stays hidden entirely otherwise, so the header is unchanged by default.
  const [modelCatalogEnabled, setModelCatalogEnabled] = useState(false);
  const [models, setModels] = useState<ModelCatalogEntry[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [savingModel, setSavingModel] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log("[Header] Fetching current user...");
        const userData = await getCurrentUser();
        sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(userData));
        setUser(userData);
        setSelectedModel(userData.preferred_model || null);
        console.log("[Header] User loaded:", userData.full_name);
      } catch (error) {
        console.log("[Header] User not logged in or token expired");
        sessionStorage.removeItem(USER_CACHE_KEY);
        setUser(null);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchCatalog = async () => {
      try {
        const catalog = await getModelCatalog();
        setModelCatalogEnabled(catalog.openrouter_enabled);
        setModels(catalog.models);
      } catch (error) {
        console.log("[Header] Model catalog unavailable:", error);
        setModelCatalogEnabled(false);
      }
    };
    fetchCatalog();
  }, [user]);

  const modelsByProvider = useMemo(() => {
    const grouped = new Map<string, ModelCatalogEntry[]>();
    for (const m of models) {
      const list = grouped.get(m.provider) || [];
      list.push(m);
      grouped.set(m.provider, list);
    }
    return grouped;
  }, [models]);

  const handleModelChange = async (modelId: string) => {
    const previous = selectedModel;
    setSelectedModel(modelId);
    setSavingModel(true);
    try {
      await updateModelPreference("openrouter", modelId);
      console.log("[Header] Model preference updated:", modelId);
    } catch (error) {
      console.log("[Header] Failed to update model preference:", error);
      setSelectedModel(previous);
      toast({
        title: "Couldn't change model",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingModel(false);
    }
  };

  const handleLogout = () => {
    console.log("[Header] Logging out user");
    logout();
    sessionStorage.removeItem(USER_CACHE_KEY);
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "executive":
        return { label: "Executive", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" };
      case "sales":
        return { label: "Sales", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" };
      case "operations":
        return { label: "Operations", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" };
      default:
        return { label: role, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" };
    }
  };

  return (
    <header className="h-16 flex items-center overflow-visible px-4 sm:px-6 bg-background border-b border-border sticky top-0 z-50">
      {/* Logo - larger than header so it’s prominent; overflows with overflow-visible */}
      <button
        type="button"
        onClick={() => navigate("/chat")}
        className="flex items-center rounded-md hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shrink-0 -my-1"
        aria-label="SPARS lens home"
      >
        <img src="/9.png" alt="SPARS lens" className="h-[168px] w-auto object-contain block" />
        <span className="sr-only">SPARS lens</span>
      </button>

      {/* Nav */}
      <nav className="flex items-center gap-1 sm:gap-2 ml-4 sm:ml-8">
        <Button
          variant="ghost"
          className={`gap-2 text-sm sm:text-base px-2 sm:px-4 ${pathname === "/chat" ? "text-primary" : ""}`}
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
          className={`gap-2 text-sm sm:text-base px-2 sm:px-4 ${pathname === "/my-dashboard" ? "text-primary" : ""}`}
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
          className={`gap-2 text-sm sm:text-base px-2 sm:px-4 ${pathname === "/help" ? "text-primary" : ""}`}
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

        {modelCatalogEnabled && models.length > 0 && (
          <Select value={selectedModel ?? undefined} onValueChange={handleModelChange} disabled={savingModel}>
            <SelectTrigger className="h-9 w-[180px] text-xs gap-1.5 hidden md:flex">
              <Cpu className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <SelectValue placeholder="Choose a model" />
            </SelectTrigger>
            <SelectContent align="end">
              {Array.from(modelsByProvider.entries()).map(([provider, list]) => (
                <SelectGroup key={provider}>
                  <SelectLabel>{provider}</SelectLabel>
                  {list.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        <span>{m.name}</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">free</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        )}

        {user && user.role && (
          <span className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadge(user.role).color}`}>
            {getRoleBadge(user.role).label}
          </span>
        )}

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
                  {user.role && (
                    <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium mt-0.5 ${getRoleBadge(user.role).color}`}>
                      {getRoleBadge(user.role).label}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/usage")} className="cursor-pointer">
                <Receipt className="h-4 w-4 mr-2" />
                Usage &amp; Cost
              </DropdownMenuItem>
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
            className={`gap-2 text-sm sm:text-base px-2 sm:px-4 ${pathname === "/auth" ? "text-primary" : ""}`}
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

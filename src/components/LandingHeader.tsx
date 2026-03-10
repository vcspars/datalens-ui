import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getAuthToken } from "@/lib/api";

export default function LandingHeader() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthenticated = !!getAuthToken();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-visible">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 h-16 overflow-visible lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1 items-center">
          <Link to="/" className="-m-1.5 p-1.5 flex items-center shrink-0 -my-1" aria-label="SPARS lens home">
            <img src="/9.png" alt="SPARS lens" className="h-[168px] w-auto object-contain block" />
          </Link>
        </div>
        
        {/* Desktop Navigation intentionally removed for public homepage */}

        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          
          {isAuthenticated ? (
            <Button onClick={() => navigate("/my-datasets")} variant="default">
              Dashboard
            </Button>
          ) : (
            <>
              <Button onClick={() => navigate("/auth")} variant="ghost">
                Sign in
              </Button>
              <Button onClick={() => navigate("/auth")} variant="default">
                Get started
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu */}
        <div className="flex lg:hidden items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-4">
                <Link to="/" className="-m-1.5 p-1.5 flex items-center" aria-label="SPARS lens home" onClick={() => setMobileMenuOpen(false)}>
                  <img src="/9.png" alt="SPARS lens" className="h-[168px] w-auto object-contain" />
                </Link>
                
                <div className="flex flex-col gap-2 mt-4">
                  {/* Mobile navigation links intentionally removed */}
                </div>

                <div className="flex flex-col gap-2 mt-4 pt-4 border-t">
                  {isAuthenticated ? (
                    <Button onClick={() => { navigate("/my-datasets"); setMobileMenuOpen(false); }} variant="default" className="w-full">
                      Dashboard
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }} variant="outline" className="w-full">
                        Sign in
                      </Button>
                      <Button onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }} variant="default" className="w-full">
                        Get started
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

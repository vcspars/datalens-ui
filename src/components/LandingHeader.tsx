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

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Pricing", href: "/pricing" },
    { name: "Blog", href: "/blog" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link to="/" className="-m-1.5 p-1.5 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">DW</span>
            </div>
            <span className="text-xl font-bold">Data Whisperer</span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:gap-x-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </div>

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
                <Link to="/" className="-m-1.5 p-1.5 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-lg">DW</span>
                  </div>
                  <span className="text-xl font-bold">Data Whisperer</span>
                </Link>
                
                <div className="flex flex-col gap-2 mt-4">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-base font-semibold leading-6 text-foreground hover:text-primary transition-colors py-2"
                    >
                      {item.name}
                    </Link>
                  ))}
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

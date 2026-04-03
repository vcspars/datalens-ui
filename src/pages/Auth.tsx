import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { login, signup } from "@/lib/api";

const ROLE_OPTIONS = [
  { value: "executive" as const, label: "Executive / Management", description: "Full access to all modules" },
  { value: "sales" as const, label: "Sales Team", description: "Sales, customers, inventory, pricing, backorders" },
  { value: "operations" as const, label: "Operations / Warehouse", description: "Inventory monitoring & backorders only" },
];

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"executive" | "sales" | "operations">("executive");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("login-email") as string;
    const password = formData.get("login-password") as string;

    try {
      await login({ email, password });
      toast.success("Logged in successfully!");
      console.log("[Auth] Login successful, redirecting to /chat");
      navigate('/chat');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const full_name = formData.get("signup-name") as string;
    const email = formData.get("signup-email") as string;
    const password = formData.get("signup-password") as string;
    const confirm_password = formData.get("signup-confirm") as string;

    if (password.length < 8) {
      toast.error("Password can't be shorter than 8 characters.");
      setIsLoading(false);
      return;
    }

    if (password !== confirm_password) {
      toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      await signup({ email, password, full_name, confirm_password, role: selectedRole });
      toast.success("Account created successfully!");
      console.log("[Auth] Signup successful, redirecting to /chat");
      navigate('/chat');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-background flex items-start justify-center p-3 pt-4 sm:p-4 sm:pt-8 pb-8 overflow-y-auto">
      <div className="w-full max-w-md min-w-0">
        <div className="text-center mb-3 sm:mb-4 flex flex-col items-center gap-0 leading-none">
          <img
            src="/9.png"
            alt="SPARS lens"
            className="h-[140px] sm:h-[200px] md:h-[260px] lg:h-[288px] w-auto max-w-full object-contain object-bottom block -mb-10 sm:-mb-16 md:-mb-20"
          />
          <p className="text-muted-foreground text-xs sm:text-sm leading-tight m-0 px-1">
            Analyze your data with AI-powered insights
          </p>
        </div>

        {/* Sign Up tab hidden for now — restore the <Tabs> block below to re-enable */}
        <Tabs defaultValue="login" className="w-full -mt-1 sm:-mt-2">
          <TabsList className="flex w-auto mx-auto bg-transparent shadow-none">
            <TabsTrigger value="login" className="px-20">Login</TabsTrigger>
          </TabsList>
        </Tabs>
        <Card className="overflow-hidden w-full">
          <CardHeader className="px-3 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">Welcome back</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-4 sm:px-6 sm:pb-6">
            <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  name="login-email"
                  type="email"
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    name="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    aria-label={showLoginPassword ? "Hide password" : "Show password"}
                  >
                    {showLoginPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/*
        =====================================================================
        SIGN UP TAB — commented out, restore to re-enable registration
        =====================================================================
        <Tabs defaultValue="login" className="w-full -mt-1 sm:-mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            ... login card ...
          </TabsContent>
          <TabsContent value="signup">
            <Card className="overflow-hidden">
              <CardHeader ...>Create an account</CardHeader>
              <CardContent>
                <form onSubmit={handleSignup}>
                  Full Name / Email / Password / Confirm Password / Role selector / Sign Up button
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        =====================================================================
        */}

        <p className="text-center text-xs sm:text-sm text-muted-foreground mt-4 sm:mt-6">
          Powered by <span className="text-primary font-medium">SPARS</span>
        </p>
      </div>
    </div>
  );
}

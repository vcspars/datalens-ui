import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import { 
  FileText, 
  Sheet, 
  BarChart3, 
  Sparkles, 
  Zap, 
  Shield, 
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Users,
  Globe
} from "lucide-react";
import { getAuthToken } from "@/lib/api";

export default function Homepage() {
  const navigate = useNavigate();
  const isAuthenticated = !!getAuthToken();

  const features = [
    {
      icon: FileText,
      title: "PDF Analysis",
      description: "Upload and analyze PDF documents with AI-powered text extraction, summarization, and intelligent Q&A.",
    },
    {
      icon: Sheet,
      title: "CSV/Excel Processing",
      description: "Process and analyze spreadsheet data with advanced calculations, filtering, and data manipulation tools.",
    },
    {
      icon: BarChart3,
      title: "Data Visualization",
      description: "Create beautiful charts and graphs to visualize your data insights and trends.",
    },
    {
      icon: Sparkles,
      title: "AI-Powered Insights",
      description: "Generate summaries, questions, and reports automatically using advanced AI technology.",
    },
    {
      icon: Zap,
      title: "Fast Processing",
      description: "Lightning-fast data processing and analysis with optimized performance for large datasets.",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data is encrypted and stored securely. We never share your information with third parties.",
    },
  ];

  const stats = [
    { value: "500M+", label: "Documents Processed" },
    { value: "25M+", label: "Monthly Operations" },
    { value: "300k+", label: "Active Users" },
  ];

  const useCases = [
    {
      title: "Financial Analysis",
      description: "Analyze financial reports, invoices, and spreadsheets with AI-powered insights.",
      icon: TrendingUp,
    },
    {
      title: "Data Research",
      description: "Extract insights from research papers, documents, and datasets.",
      icon: FileText,
    },
    {
      title: "Business Intelligence",
      description: "Transform raw data into actionable business insights and reports.",
      icon: BarChart3,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              The new standard for{" "}
              <span className="text-primary">complex data analysis</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              Data Whisperer delivers intelligent document processing and data analysis, 
              powering complete automation for your business workflows.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {isAuthenticated ? (
                <Button size="lg" onClick={() => navigate("/my-datasets")} className="text-base">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button size="lg" onClick={() => navigate("/auth")} className="text-base">
                    Get started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate("/pricing")} className="text-base">
                    View Pricing
                  </Button>
                </>
              )}
            </div>
            <div className="mt-16 flex items-center justify-center gap-x-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Free plan available</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Setup in minutes</span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Trusted by teams worldwide
              </h2>
            </div>
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center gap-2">
                  <div className="text-4xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 sm:py-20 bg-muted/30">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Everything you need to analyze your data
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                From high-accuracy parsing to fully automated workflows — Data Whisperer gives you 
                modular components to build data analysis tools tailored to your needs.
              </p>
            </div>
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="mb-4 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Unlock data automation across industries
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                From finance to healthcare to manufacturing — Data Whisperer adapts seamlessly 
                to dozens of industry-specific domains.
              </p>
            </div>
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
              {useCases.map((useCase) => {
                const Icon = useCase.icon;
                return (
                  <Card key={useCase.title} className="border-2">
                    <CardHeader>
                      <div className="mb-4 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>{useCase.title}</CardTitle>
                      <CardDescription>{useCase.description}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 sm:py-20 bg-primary/5">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Start building your first data analysis workflow today
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Data Whisperer gets you from raw data to real automation — fast.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                {isAuthenticated ? (
                  <Button size="lg" onClick={() => navigate("/my-datasets")} className="text-base">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="lg" onClick={() => navigate("/auth")} className="text-base">
                    Get started for free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                <Button size="lg" variant="outline" onClick={() => navigate("/contact")} className="text-base">
                  Contact sales
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

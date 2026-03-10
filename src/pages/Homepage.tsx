import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import { 
  Database,
  BarChart3,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { getAuthToken } from "@/lib/api";

export default function Homepage() {
  const navigate = useNavigate();
  const isAuthenticated = !!getAuthToken();

  const features = [
    {
      icon: Database,
      title: "Chat with Your Database",
      description: "Ask questions in plain English and get accurate answers, tables, and SQL generated from your database.",
    },
    {
      icon: Sparkles,
      title: "AI SQL Assistance",
      description: "Generate, inspect, and reuse SQL confidently with AI-assisted reasoning and context from your schema.",
    },
    {
      icon: BarChart3,
      title: "Data Visualization",
      description: "Turn query results into charts and dashboards for quick understanding and sharing.",
    },
    {
      icon: TrendingUp,
      title: "Operational Insights",
      description: "Identify trends, anomalies, and key KPIs from your live database with actionable summaries.",
    },
    {
      icon: Database,
      title: "Saved Views & Dashboards",
      description: "Save useful tables, charts, and reports to your dashboard for reuse and team workflows.",
    },
    {
      icon: Sparkles,
      title: "Reports & Summaries",
      description: "Generate clear summaries from query results to share with stakeholders quickly.",
    },
  ];

  const stats = [
    { value: "Faster", label: "Decision-ready insights" },
    { value: "Audit-ready", label: "SQL you can review & trust" },
    { value: "Secure", label: "Designed for enterprise governance" },
  ];

  const useCases = [
    {
      title: "Analytics & BI",
      description: "Explore tables, validate metrics, and quickly answer business questions with generated SQL.",
      icon: TrendingUp,
    },
    {
      title: "Operations",
      description: "Investigate anomalies, monitor KPIs, and turn raw data into daily decisions.",
      icon: Database,
    },
    {
      title: "Reporting",
      description: "Generate shareable tables, charts, and summaries from your database in minutes.",
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
              SPARS Lens delivers database intelligence — chat, SQL, dashboards, and insights in one place.
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
                </>
              )}
            </div>
            <div className="mt-16 flex items-center justify-center gap-x-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Executive-ready dashboards</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Secure database connections</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Reviewable SQL outputs</span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Built for leadership visibility
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Make confident decisions with clear, traceable answers from your database — without waiting on manual reporting cycles.
              </p>
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
                Built for database workflows — from question to SQL to charts and dashboards.
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

            {/* Simple flow visual (no extra deps) */}
            <div className="mx-auto mt-10 max-w-4xl">
              <div className="rounded-xl border bg-background/60 p-5 sm:p-6 overflow-hidden">
                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
                  {([
                    { title: "Database", subtitle: "Your tables & schema" },
                    { title: "SPARS Lens", subtitle: "AI understanding" },
                    { title: "SQL + Results", subtitle: "Queries & tables" },
                    { title: "Dashboards", subtitle: "Charts & reports" },
                  ] as const).map((node, idx, arr) => (
                    <div key={node.title} className="flex items-center w-full sm:w-auto sm:max-w-full">
                      <div className="flex-1 sm:flex-none rounded-lg border bg-muted/30 px-4 py-3 text-center w-full sm:w-auto sm:min-w-[160px] max-w-full">
                        <div className="font-semibold text-foreground">{node.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{node.subtitle}</div>
                      </div>
                      {idx < arr.length - 1 && (
                        <div className="hidden sm:flex items-center px-3 text-muted-foreground select-none" aria-hidden>
                          →
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center text-xs text-muted-foreground">
                  Ask a question → get SQL → validate results → save and visualize.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Built for database teams
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Empower analysts and operators to explore data, validate SQL, and ship insights faster.
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
                Start asking better questions of your database today
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                SPARS Lens helps you go from question to SQL to dashboard — fast.
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
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

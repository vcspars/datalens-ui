import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import { Check, ArrowRight } from "lucide-react";
import { getAuthToken } from "@/lib/api";

export default function Pricing() {
  const navigate = useNavigate();
  const isAuthenticated = !!getAuthToken();

  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for getting started",
      features: [
        "10,000 credits per month (~1000 pages)",
        "PDF document parsing",
        "CSV/Excel analysis",
        "Basic data visualization",
        "AI-powered summaries",
        "Community support",
      ],
      cta: "Get started",
      popular: false,
    },
    {
      name: "Pro",
      price: "$29",
      description: "For growing teams",
      features: [
        "100,000 credits per month (~10,000 pages)",
        "Everything in Free",
        "Advanced AI analysis",
        "Custom report generation",
        "Priority support",
        "API access",
        "Advanced data transformations",
      ],
      cta: "Start free trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations",
      features: [
        "Unlimited credits",
        "Everything in Pro",
        "Dedicated support",
        "Custom integrations",
        "SLA guarantee",
        "On-premise deployment",
        "Advanced security",
        "Custom training",
      ],
      cta: "Contact sales",
      popular: false,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      
      <main className="flex-1">
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Simple, transparent pricing
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Choose the plan that's right for you. All plans include our core features.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={`relative flex flex-col ${
                    plan.popular ? "border-primary border-2 lg:z-10 lg:scale-105" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="mt-4 flex items-baseline gap-x-2">
                      <span className="text-4xl font-bold tracking-tight text-foreground">
                        {plan.price}
                      </span>
                      {plan.price !== "Custom" && (
                        <span className="text-sm font-semibold leading-6 text-muted-foreground">
                          /month
                        </span>
                      )}
                    </div>
                    <CardDescription className="mt-4">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul role="list" className="space-y-3 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-x-3">
                          <Check className="h-6 w-5 flex-none text-primary" aria-hidden="true" />
                          <span className="text-sm leading-6 text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`mt-8 w-full ${
                        plan.popular ? "bg-primary hover:bg-primary/90" : ""
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => {
                        if (plan.name === "Enterprise") {
                          navigate("/contact");
                        } else if (isAuthenticated) {
                          navigate("/my-datasets");
                        } else {
                          navigate("/auth");
                        }
                      }}
                    >
                      {plan.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-16 text-center">
              <p className="text-sm text-muted-foreground">
                All plans include a 14-day free trial. No credit card required.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 sm:py-24 bg-muted/30">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-3xl font-bold tracking-tight text-foreground text-center sm:text-4xl">
                Frequently asked questions
              </h2>
              <dl className="mt-16 space-y-8">
                {[
                  {
                    question: "What happens if I exceed my credit limit?",
                    answer:
                      "If you exceed your monthly credit limit, you can upgrade to a higher plan or purchase additional credits. Unused credits don't roll over to the next month.",
                  },
                  {
                    question: "Can I change plans later?",
                    answer:
                      "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges.",
                  },
                  {
                    question: "Do you offer refunds?",
                    answer:
                      "We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, contact us for a full refund.",
                  },
                  {
                    question: "Is my data secure?",
                    answer:
                      "Yes, we use industry-standard encryption and security practices. Your data is encrypted in transit and at rest, and we never share your information with third parties.",
                  },
                ].map((faq) => (
                  <div key={faq.question}>
                    <dt className="text-base font-semibold leading-7 text-foreground">
                      {faq.question}
                    </dt>
                    <dd className="mt-2 text-base leading-7 text-muted-foreground">{faq.answer}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

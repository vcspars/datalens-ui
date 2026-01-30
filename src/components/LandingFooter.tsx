import { Link } from "react-router-dom";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { name: "Features", href: "/#features" },
      { name: "Pricing", href: "/pricing" },
      { name: "Documentation", href: "/help" },
    ],
    Company: [
      { name: "About", href: "/#about" },
      { name: "Blog", href: "/blog" },
      { name: "Careers", href: "/#careers" },
    ],
    Legal: [
      { name: "Privacy", href: "/privacy" },
      { name: "Terms", href: "/terms" },
      { name: "Security", href: "/#security" },
    ],
    Resources: [
      { name: "Help Center", href: "/help" },
      { name: "Contact", href: "/contact" },
      { name: "API Docs", href: "/#api" },
    ],
  };

  const socialLinks = [
    { name: "Twitter", icon: Twitter, href: "#" },
    { name: "GitHub", icon: Github, href: "#" },
    { name: "LinkedIn", icon: Linkedin, href: "#" },
    { name: "Email", icon: Mail, href: "mailto:contact@datawhisperer.com" },
  ];

  return (
    <footer className="bg-muted/50 border-t">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">DW</span>
              </div>
              <span className="text-2xl font-bold">Data Whisperer</span>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Transform your documents and data into intelligent insights with AI-powered analysis and automation.
            </p>
            <div className="flex space-x-6">
              {socialLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={item.name}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-foreground">Product</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {footerLinks.Product.map((item) => (
                    <li key={item.name}>
                      <Link to={item.href} className="text-sm leading-6 text-muted-foreground hover:text-foreground transition-colors">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-foreground">Company</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {footerLinks.Company.map((item) => (
                    <li key={item.name}>
                      <Link to={item.href} className="text-sm leading-6 text-muted-foreground hover:text-foreground transition-colors">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-foreground">Legal</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {footerLinks.Legal.map((item) => (
                    <li key={item.name}>
                      <Link to={item.href} className="text-sm leading-6 text-muted-foreground hover:text-foreground transition-colors">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-foreground">Resources</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {footerLinks.Resources.map((item) => (
                    <li key={item.name}>
                      <Link to={item.href} className="text-sm leading-6 text-muted-foreground hover:text-foreground transition-colors">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-border pt-8 sm:mt-20 lg:mt-24">
          <p className="text-xs leading-5 text-muted-foreground">
            &copy; {currentYear} Data Whisperer. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

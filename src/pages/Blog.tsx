import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import { Calendar, Clock, ArrowRight } from "lucide-react";

export default function Blog() {
  const blogPosts = [
    {
      id: 1,
      title: "Getting Started with Data Whisperer",
      description: "Learn how to upload your first document and start analyzing data with AI-powered insights.",
      date: "January 15, 2026",
      readTime: "5 min read",
      category: "Getting Started",
      image: "📊",
    },
    {
      id: 2,
      title: "Advanced CSV Analysis Techniques",
      description: "Discover powerful techniques for analyzing large datasets and extracting meaningful insights.",
      date: "January 10, 2026",
      readTime: "8 min read",
      category: "Tutorial",
      image: "📈",
    },
    {
      id: 3,
      title: "AI-Powered Document Processing",
      description: "Explore how AI is revolutionizing document analysis and data extraction workflows.",
      date: "January 5, 2026",
      readTime: "6 min read",
      category: "AI & ML",
      image: "🤖",
    },
    {
      id: 4,
      title: "Best Practices for Data Security",
      description: "Learn how to keep your data secure and private when using cloud-based analysis tools.",
      date: "December 28, 2025",
      readTime: "7 min read",
      category: "Security",
      image: "🔒",
    },
    {
      id: 5,
      title: "Automating Business Workflows",
      description: "See how companies are using Data Whisperer to automate their document processing workflows.",
      date: "December 20, 2025",
      readTime: "10 min read",
      category: "Case Study",
      image: "⚡",
    },
    {
      id: 6,
      title: "Understanding AI-Generated Reports",
      description: "A deep dive into how our AI generates comprehensive reports from your documents and data.",
      date: "December 15, 2025",
      readTime: "9 min read",
      category: "Features",
      image: "📝",
    },
  ];

  const categories = ["All", "Getting Started", "Tutorial", "AI & ML", "Security", "Case Study", "Features"];

  return (
    <div className="flex min-h-screen flex-col">
      <LandingHeader />
      
      <main className="flex-1">
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Blog & Resources
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Learn from our team and community about data analysis, AI, and best practices.
              </p>
            </div>

            {/* Category Filter */}
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={category === "All" ? "default" : "outline"}
                  className="rounded-full"
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* Blog Posts Grid */}
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
              {blogPosts.map((post) => (
                <Card key={post.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="text-4xl mb-4">{post.image}</div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {post.readTime}
                      </span>
                    </div>
                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-primary/10 text-primary mb-2">
                      {post.category}
                    </span>
                    <CardTitle className="text-xl">{post.title}</CardTitle>
                    <CardDescription className="mt-2">{post.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <Button variant="link" className="p-0">
                      Read more
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Newsletter Signup */}
            <div className="mt-16">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Stay updated</CardTitle>
                  <CardDescription>
                    Subscribe to our newsletter to get the latest articles and updates.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="flex-1 px-4 py-2 rounded-md border border-input bg-background"
                    />
                    <Button>Subscribe</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

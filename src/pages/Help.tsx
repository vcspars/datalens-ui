import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Database, FileText, Sheet, MessageSquare, BarChart3, LayoutDashboard } from "lucide-react";

export default function Help() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Help Center</h1>
          <p className="text-muted-foreground">
            Learn how to make the most of SPARSlens
          </p>
        </div>

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Quick guide to using SPARSlens</CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p>
                SPARSlens helps you analyze and visualize your data through natural conversation.
                Connect your data sources (PDFs, CSV files, or databases) and start asking questions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex gap-3">
                  <Database className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Database Connection</h4>
                    <p className="text-sm text-muted-foreground">
                      Connect to your databases and query them using natural language
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <FileText className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">PDF Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      Upload PDFs and ask questions about their content
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Sheet className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">CSV/Excel Processing</h4>
                    <p className="text-sm text-muted-foreground">
                      Import spreadsheets and perform data analysis
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MessageSquare className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">AI Chat Assistant</h4>
                    <p className="text-sm text-muted-foreground">
                      Ask questions in plain English and get instant answers
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <BarChart3 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Data Visualization</h4>
                    <p className="text-sm text-muted-foreground">
                      Generate charts and graphs automatically from your queries
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <LayoutDashboard className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold mb-1">Personal Dashboard</h4>
                    <p className="text-sm text-muted-foreground">
                      Save visualizations and generate comprehensive reports
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How do I connect a database?</AccordionTrigger>
                  <AccordionContent>
                    Click on "My Datasets" in the header, then select "Connect New Dataset".
                    Choose "Database" and enter your connection details. SPARSlens supports
                    PostgreSQL, MySQL, and SQLite databases.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>What file formats are supported?</AccordionTrigger>
                  <AccordionContent>
                    SPARSlens supports PDF files for document analysis, and CSV/Excel files
                    for structured data analysis. Maximum file size is 50MB.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>How do I save visualizations?</AccordionTrigger>
                  <AccordionContent>
                    When a chart or table is generated, you'll see a save button. Click it
                    to add the visualization to your dashboard. You can access all saved
                    items from "My Dashboard" in the header.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>Can I generate reports?</AccordionTrigger>
                  <AccordionContent>
                    Yes! Go to "My Dashboard", select the items you want to include,
                    and click "Generate Report". You can download the report as a PDF.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger>How does voice input work?</AccordionTrigger>
                  <AccordionContent>
                    Click the microphone icon in the chat interface to start voice recording.
                    Speak your question, and SPARSlens will transcribe and process it automatically.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import { BookOpen, ChevronRight } from "lucide-react";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "getting-started", label: "Getting Started" },
  { id: "pages", label: "Pages" },
  { id: "chat-with-data", label: "Chat with Data" },
  { id: "my-dashboard", label: "My Dashboard" },
  { id: "components", label: "Components" },
  { id: "header-navigation", label: "Header & Navigation" },
  { id: "tables-charts", label: "Tables & Charts" },
  { id: "key-features", label: "Key Features" },
  { id: "best-practices", label: "Best Practices" },
  { id: "faq", label: "FAQ" },
] as const;

function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="text-2xl font-bold text-foreground mt-8 mb-3 scroll-mt-24 first:mt-0"
    >
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-lg font-semibold text-foreground mt-5 mb-2">
      {children}
    </h3>
  );
}

/** Wrap occurrences of query in text with <mark> for highlight. */
function highlightContent(text: string, query: string): React.ReactNode {
  const q = query.trim().toLowerCase();
  if (!q || !text) return text;
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const pos = remaining.toLowerCase().indexOf(q);
    if (pos === -1) {
      parts.push(remaining);
      break;
    }
    parts.push(remaining.slice(0, pos));
    parts.push(
      <mark key={key++} className="bg-primary/25 text-primary rounded px-0.5">
        {remaining.slice(pos, pos + q.length)}
      </mark>
    );
    remaining = remaining.slice(pos + q.length);
  }
  return <>{parts}</>;
}

export default function Help() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);
  const [search, setSearch] = useState("");

  const filteredSections = useMemo(() => {
    if (!search.trim()) return SECTIONS;
    const q = search.toLowerCase().trim();
    return SECTIONS.filter((s) => s.label.toLowerCase().includes(q));
  }, [search]);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean
    ) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = e.target.id;
          if (id) setActiveId(id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setActiveId(id);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Header />

      <div className="flex flex-1 min-h-0 w-full max-w-7xl mx-auto px-6">
        {/* Left: independent-scroll sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 border-r border-border bg-background/95 overflow-y-auto">
          <div className="py-6 pl-0 pr-3">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">User Manual</span>
            </div>
            <input
              type="search"
              placeholder="Search manual..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-4"
            />
            <nav className="space-y-0.5">
              {filteredSections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-md transition-colors ${
                    activeId === s.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <ChevronRight
                    className={`h-4 w-4 flex-shrink-0 ${
                      activeId === s.id ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Right: doc content */}
        <main className="flex-1 min-w-0 overflow-y-auto py-6 px-6 lg:px-10 pb-16" id="help-doc-content">
          <div className="prose max-w-none text-foreground prose-p:text-sm prose-li:text-sm prose-p:leading-relaxed prose-li:leading-relaxed">
            <SectionHeading id="overview">Overview</SectionHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "SPARSlens is a business intelligence tool that lets you explore and visualize your organization's data through simple questions in plain English. It connects directly to your database and uses AI to interpret your questions, run the right analysis, and return answers as tables and charts. No formulas, no query language, and no technical setup on your side—just ask what you need to know.",
                search
              )}
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              {highlightContent(
                "The tool is designed for executives, managers, and business users who need quick answers and presentable visualizations without technical or analytical expertise. You can save results to a personal dashboard and combine them into professional reports for sharing with leadership or clients.",
                search
              )}
            </p>
            <SubHeading>Who is it for?</SubHeading>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1.5">
              <li>{highlightContent("Top management: high-level views, KPIs, trends, and executive summaries.", search)}</li>
              <li>{highlightContent("Department leads: performance and operational metrics for planning and review.", search)}</li>
              <li>{highlightContent("Clients and stakeholders: clear reports and dashboards you can export and share.", search)}</li>
              <li>{highlightContent("Anyone who needs to answer business questions using data without writing code or SQL.", search)}</li>
            </ul>

            <SectionHeading id="getting-started">Getting Started</SectionHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "To use SPARSlens, your organization must have a database connected. Connection is usually handled by an administrator or IT. Once the database is set up, you sign in, open the Chat page, and start asking questions in plain English.",
                search
              )}
            </p>
            <SubHeading>Logging in</SubHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "Sign in with your email and password. If you do not have an account or access, contact your administrator. After login, the header at the top shows links to Chat with Database (main workspace), My Dashboard (saved items and reports), and Help (this manual). Use these to move between areas.",
                search
              )}
            </p>
            <SubHeading>Connecting a database</SubHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "Database connection is typically done by an administrator. Supported databases include PostgreSQL, MySQL, and SQLite. The connection stores the credentials securely; once connected, all authorized users can ask questions and view visualizations based on that data without configuring anything themselves.",
                search
              )}
            </p>

            <SectionHeading id="pages">Pages</SectionHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "SPARSlens has two main areas: Chat with Data (where you ask questions and see results as tables and charts) and My Dashboard (where you save and organize tables, charts, and generated reports). Both are available from the main header so you can switch quickly between asking new questions and reviewing saved content.",
                search
              )}
            </p>

            <SectionHeading id="chat-with-data">Chat with Data</SectionHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "Chat with Data is the main workspace. You type or speak a question in normal language; the system interprets it, runs the right analysis against your database, and shows a reply with a table and/or chart when the answer involves data. You can refine with follow-up questions, convert tables to charts, and save any result to My Dashboard.",
                search
              )}
            </p>
            <SubHeading>What you can do</SubHeading>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1.5">
              <li>{highlightContent("Ask questions such as “What were total sales last month?” or “Show me top 10 products by revenue.” The system returns a table and often suggests or shows a chart.", search)}</li>
              <li>{highlightContent("See answers as tables and charts directly in the chat. Tables can be scrolled; charts can be expanded or saved.", search)}</li>
              <li>{highlightContent("Convert a table from the answer into a chart: use “Convert to Graph” to choose chart type (bar, line, pie, area, scatter) and which columns to use for the axes. All columns are available for X and Y.", search)}</li>
              <li>{highlightContent("Use the microphone to ask by voice; your words are transcribed and run as a question automatically.", search)}</li>
              <li>{highlightContent("Save a table or chart to My Dashboard for later use, reporting, or export.", search)}</li>
            </ul>
            <SubHeading>Tips for better answers</SubHeading>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1.5">
              <li>{highlightContent("Be specific: include time ranges, filters, or dimensions (e.g. “by region”, “by product”, “last quarter”).", search)}</li>
              <li>{highlightContent("One main question per message usually gives the clearest result. You can always ask a follow-up to drill down.", search)}</li>
              <li>{highlightContent("If the result is a table, use “Convert to Graph” to visualize it; then save or export the chart if needed.", search)}</li>
            </ul>

            <SectionHeading id="my-dashboard">My Dashboard</SectionHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "My Dashboard is your personal collection of saved tables and charts, plus reports you generate from them. It helps you keep key visualizations in one place, filter by type and date, and share insights via export or generated reports.",
                search
              )}
            </p>
            <SubHeading>Saved items</SubHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "Tables and charts you save from Chat appear here as cards. Each card shows a preview, the item name, type (table or graph), and optional chart type and date. Use the action icons on each card:",
                search
              )}
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1.5">
              <li>{highlightContent("Enlarge (maximize) icon: opens a larger popup so you can view the full table or chart clearly.", search)}</li>
              <li>{highlightContent("Info icon: shows which question or context the item came from (prompt and response snippet).", search)}</li>
              <li>{highlightContent("Export icon: for tables, choose CSV or Excel; for charts, choose PNG, SVG, or JPG. The file downloads immediately.", search)}</li>
              <li>{highlightContent("You can filter the list by type (table/graph), chart type, and date range (e.g. last 24 hours, 7 days, 30 days).", search)}</li>
            </ul>
            <SubHeading>Reports</SubHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "Select one or more saved items and click “Generate Report”. Enter a report name and any instructions (e.g. focus on trends, include executive summary). The system generates a written analysis and combines your chosen tables and charts into a single report. You can then download the report as a PDF to share with management or clients.",
                search
              )}
            </p>

            <SectionHeading id="components">Components</SectionHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "The following sections describe the main parts of the interface you will use every day: the header and navigation, and how tables and charts work in the chat and on the dashboard.",
                search
              )}
            </p>

            <SectionHeading id="header-navigation">Header & Navigation</SectionHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "The header at the top of every page contains the main navigation and account controls. The current page (Chat, My Dashboard, or Help) is highlighted in the theme blue so you always know where you are.",
                search
              )}
            </p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1.5">
              <li><strong>Chat with Database</strong>: {highlightContent("Opens the main Chat with Data page where you ask questions and see tables and charts.", search)}</li>
              <li><strong>My Dashboard</strong>: {highlightContent("Opens your saved items (tables and charts) and reports. You can filter, export, and generate reports from here.", search)}</li>
              <li><strong>Help</strong>: {highlightContent("Opens this user manual with the sidebar and search.", search)}</li>
              <li>{highlightContent("Theme (sun/moon) and account (avatar with name) options are on the right side of the header.", search)}</li>
            </ul>

            <SectionHeading id="tables-charts">Tables & Charts</SectionHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "When the system answers with data, it can show a table and/or a chart. Tables list rows and columns; charts visualize the same data. You can change the chart type (bar, line, pie, area, scatter) and choose which columns to use for the X and Y axes—all columns are available for both. In the Graphs tab you get a multi-column legend for pie charts and clear axis labels. Saving adds the current table or chart to My Dashboard; export lets you download the table as CSV or Excel, or the chart as PNG, SVG, or JPG for presentations or reports.",
                search
              )}
            </p>

            <SectionHeading id="key-features">Key Features</SectionHeading>
            <SubHeading>Ask in plain English</SubHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "No need to write queries or formulas. Ask as you would in a meeting: “How many orders last quarter?”, “Compare revenue by region,” “Top 10 customers by sales.” The system translates your question into the right analysis and returns a table and often a chart.",
                search
              )}
            </p>
            <SubHeading>Automatic visualizations</SubHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "Results can appear as tables and charts. You can switch chart types and choose which columns go on each axis. Pie charts show a clear legend (e.g. 12 items per column) so labels do not overlap. Export and enlarge views use the same layout for consistency.",
                search
              )}
            </p>
            <SubHeading>Save and share</SubHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "Save important tables and charts to My Dashboard. Export them as CSV, Excel, or images (PNG, SVG, JPG), or include them in AI-generated reports and download as PDF for management and clients.",
                search
              )}
            </p>

            <SectionHeading id="best-practices">Best Practices</SectionHeading>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1.5">
              <li>{highlightContent("Phrase questions clearly and include time ranges or filters when relevant (e.g. “last month”, “by region”).", search)}</li>
              <li>{highlightContent("Save key tables and charts so you can reuse them and build reports without re-asking the same questions.", search)}</li>
              <li>{highlightContent("Use the export options to bring data and charts into presentations, emails, or other documents.", search)}</li>
              <li>{highlightContent("Use filters on My Dashboard to find saved items quickly by type (table/graph), chart type, and date.", search)}</li>
              <li>{highlightContent("Use the search in this Help manual to jump to sections and see matching text highlighted in the doc.", search)}</li>
            </ul>

            <SectionHeading id="faq">FAQ</SectionHeading>
            <SubHeading>How do I connect a database?</SubHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "Database setup is usually done by an administrator. They use the connection settings to link your organization’s database (PostgreSQL, MySQL, or SQLite). Once connected, you can start asking questions from the Chat page; no extra configuration is required on your side.",
                search
              )}
            </p>
            <SubHeading>How do I save a table or chart?</SubHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "When a table or chart appears in the chat, use the save option (e.g. “Save to Dashboard” or the save icon) to add it to My Dashboard. You can give it a name. Open My Dashboard from the header to see all saved items.",
                search
              )}
            </p>
            <SubHeading>How do I export data or a chart?</SubHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "In My Dashboard, each saved item has an export icon. Click it: for tables you can export as CSV or Excel; for charts you can export as PNG, SVG, or JPG. The file downloads immediately. Use these in reports or presentations.",
                search
              )}
            </p>
            <SubHeading>Can I generate a report?</SubHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "Yes. In My Dashboard, select the saved items you want to include and click “Generate Report”. Enter a report name and optional instructions. The system creates an analysis and combines those tables and charts; you can then download the report as a PDF.",
                search
              )}
            </p>
            <SubHeading>How does voice input work?</SubHeading>
            <p className="text-muted-foreground leading-relaxed">
              {highlightContent(
                "Click the microphone icon in the chat, speak your question clearly, and the system will transcribe it and run it as a question. Useful when you prefer speaking instead of typing.",
                search
              )}
                    </p>
                  </div>
        </main>
      </div>
    </div>
  );
}

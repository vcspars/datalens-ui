/**
 * MarkdownMessage
 * Renders markdown using react-markdown + remark-gfm.
 * Requires @tailwindcss/typography registered in tailwind.config.ts for prose-* classes to work.
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export default function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        // Keep text colours on-theme instead of prose defaults
        "prose-headings:text-foreground",
        "prose-p:text-foreground",
        "prose-strong:text-foreground",
        "prose-li:text-foreground",
        "prose-td:text-foreground prose-th:text-foreground",
        // Table chrome
        "prose-th:bg-muted prose-th:border prose-th:border-border prose-th:px-2 prose-th:py-1.5",
        "prose-td:border prose-td:border-border prose-td:px-2 prose-td:py-1.5",
        "prose-tr:even:bg-muted/30",
        // Extra padding on first / last columns so content doesn't hug the outer border
        "[&_table_th:first-child]:pl-3 [&_table_th:last-child]:pr-3",
        "[&_table_td:first-child]:pl-3 [&_table_td:last-child]:pr-3",
        // Inline code
        "prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

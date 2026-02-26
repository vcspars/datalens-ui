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
        "prose-th:bg-muted prose-th:border prose-th:border-border",
        "prose-td:border prose-td:border-border",
        "prose-tr:even:bg-muted/30",
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

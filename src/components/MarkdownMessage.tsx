/**
 * MarkdownMessage
 * Renders markdown using react-markdown + remark-gfm.
 * Requires @tailwindcss/typography registered in tailwind.config.ts for prose-* classes to work.
 *
 * Table cells containing *measure* values are automatically formatted:
 *   - Decimal numbers  → comma-separated, max 2 dp  (1,234,567.89)
 *   - $ prefixed        → comma-separated  ($1,234,567)
 *   - % suffixed        → preserved  (45.5%)
 *   - Already commaed   → normalised  (1,234,567)
 *   - Plain integers    → LEFT ALONE (could be IDs like Sales Invoice No)
 *
 * This formatting is display-only and does NOT affect the raw table_data
 * used by the graph/export features.
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

/** Extract the plain text from a React-markdown cell's children. */
function cellText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(cellText).join("");
  if (children && typeof children === "object" && "props" in (children as object)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return cellText((children as any).props?.children ?? "");
  }
  return String(children ?? "");
}

/**
 * Format a cell value ONLY when there is clear evidence it is a measure
 * (dollar amount, percentage, decimal, or already comma-formatted).
 *
 * Plain integers (e.g. invoice numbers, IDs, keys) are left untouched so
 * that "SalesInvoiceNo = 123456" is never turned into "123,456".
 *
 * Returns null when the value should not be reformatted.
 */
function formatNumericCell(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Match: optional $ prefix → digits/commas with optional decimal → optional % suffix
  const match = trimmed.match(/^(\$\s*)?(-?[\d,]+(?:\.\d+)?)(\s*%)?$/);
  if (!match) return null;

  const prefix = match[1] ?? "";
  const numPart = match[2];
  const suffix = match[3] ?? "";

  const hasDecimal = numPart.includes(".");
  const hasCommas = numPart.includes(",");
  const hasCurrency = prefix.length > 0;
  const hasPercent = suffix.length > 0;

  // Only format when there is an explicit signal that this is a measure,
  // NOT an ID / reference number.
  if (!hasDecimal && !hasCommas && !hasCurrency && !hasPercent) {
    return null; // plain integer – leave as-is
  }

  const numStr = numPart.replace(/,/g, "");
  const num = Number(numStr);
  if (isNaN(num)) return null;

  const isInteger = Number.isInteger(num);
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: isInteger ? 0 : 2,
  });

  return `${prefix}${formatted}${suffix}`;
}

const tableComponents: Components = {
  td({ children, ...props }) {
    const raw = cellText(children);
    const formatted = formatNumericCell(raw);
    return <td {...props}>{formatted !== null ? formatted : children}</td>;
  },
};

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
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={tableComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

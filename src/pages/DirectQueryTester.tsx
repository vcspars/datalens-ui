import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  runDirectQuery,
  type DirectQueryRequest,
  type DirectQueryResponse,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  ClipboardCheck,
  Download,
  FlaskConical,
  Loader2,
  Terminal,
  Clock,
  Database,
  Info,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

const SESSION_KEY = "dq_tester_auth";
const CORRECT_PASSWORD = "sdf@#FDF23fd";

const ROLES = [
  {
    value: "executive" as const,
    label: "Executive / Management",
    description: "Full schema access — finance, sales, operations",
  },
  {
    value: "sales" as const,
    label: "Sales Team",
    description: "Sales, customers, inventory, pricing, backorders",
  },
  {
    value: "operations" as const,
    label: "Operations / Warehouse",
    description: "Inventory monitoring & backorders only",
  },
];

const PAGE_SIZE = 100;

function buildPaginationPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

export default function DirectQueryTester() {
  // ── Password gate ──
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "1"
  );
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (unlocked) sessionStorage.setItem(SESSION_KEY, "1");
  }, [unlocked]);

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (pwInput === CORRECT_PASSWORD) {
      setUnlocked(true);
      setPwError(false);
    } else {
      setPwError(true);
      setPwInput("");
    }
  }

  // ── Main state ──
  const [question, setQuestion] = useState("");
  const [role, setRole] = useState<DirectQueryRequest["role"]>("executive");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DirectQueryResponse | null>(null);
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const totalPages = result
    ? Math.ceil(result.rows.length / PAGE_SIZE)
    : 0;

  const visibleRows = result
    ? result.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    setPage(1);
    try {
      const res = await runDirectQuery({ question: question.trim(), role });
      setResult(res);
      setTimeout(
        () => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        80
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setResult({
        question: question.trim(),
        generated_sql: "",
        columns: [],
        rows: [],
        row_count: 0,
        elapsed_ms: 0,
        error: message,
      });
    } finally {
      setLoading(false);
    }
  }

  function handleCopySql() {
    if (!result?.generated_sql) return;
    navigator.clipboard.writeText(result.generated_sql).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownloadExcel() {
    if (!result || result.rows.length === 0) return;
    const ws = XLSX.utils.aoa_to_sheet([result.columns, ...result.rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Query Results");
    const safeQuestion = result.question.slice(0, 40).replace(/[^a-z0-9]/gi, "_");
    XLSX.writeFile(wb, `direct_query_${safeQuestion}.xlsx`);
  }

  const hasError = !!result?.error;
  const hasData = result && !hasError && result.rows.length > 0;

  // ── Password gate screen ──
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
            {/* Top accent */}
            <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

            <div className="p-8 space-y-6">
              {/* Icon + title */}
              <div className="text-center space-y-3">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Developer Access Required
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Direct SQL Query Tester · SPARSLens
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pw" className="text-sm font-medium">
                    Access Password
                  </Label>
                  <div className="relative">
                    <input
                      id="pw"
                      type={showPw ? "text" : "password"}
                      value={pwInput}
                      onChange={(e) => { setPwInput(e.target.value); setPwError(false); }}
                      placeholder="Enter password"
                      autoFocus
                      className={`w-full h-10 rounded-md border px-3 pr-10 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-colors
                        ${pwError
                          ? "border-red-400 dark:border-red-600 focus:ring-1 focus:ring-red-400"
                          : "border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {pwError && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      Incorrect password. Please try again.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={!pwInput}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Unlock
                </Button>
              </form>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
            This tool is for internal development and QA use only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── Header Bar ── */}
      <header className="border-b bg-white dark:bg-gray-900 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 text-white">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
              Direct SQL Query Tester
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              SPARS Lens · Prompt &amp; Schema Validation Tool
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5">
            <Database className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
              StarScemaSPARS
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* ── Notice Banner ── */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30 p-5">
          <div className="flex gap-3">
            <div className="mt-0.5 shrink-0">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-2.5 text-sm">
              <p className="font-semibold text-amber-800 dark:text-amber-300 text-base">
                Developer / QA Tool — Read Before Using
              </p>
              <ul className="space-y-1.5 text-amber-700 dark:text-amber-400">
                <li className="flex gap-2">
                  <span className="mt-0.5 text-amber-500">▸</span>
                  <span>
                    This endpoint <strong>only generates SQL</strong> from your question using the
                    role's schema prompt, then runs it directly against the database — no LangChain
                    agent, no AI analysis, no context memory.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 text-amber-500">▸</span>
                  <span>
                    Each query is <strong>stateless</strong> — follow-up questions do not remember
                    previous ones.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 text-amber-500">▸</span>
                  <span>
                    <strong>Do not use this for AI-driven analysis or insights.</strong> The output
                    is raw database rows — nothing more.
                  </span>
                </li>
              </ul>
              <div className="mt-1 pt-2.5 border-t border-amber-200 dark:border-amber-800/50">
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  Purpose &amp; intended use:
                </p>
                <p className="text-amber-700 dark:text-amber-400 mt-1">
                  Use this tool with <strong>complex data-retrieval questions</strong> to validate
                  and stress-test the SQL generation prompts and schema definitions used by
                  SPARSLens. The goal is to make our prompts <em>robust and accurate</em> — if a
                  question produces a wrong or failing query, that's a signal to improve the prompt.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Query Form ── */}
        <div className="rounded-xl border bg-white dark:bg-gray-900 shadow-sm p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="question" className="text-sm font-medium">
                Your Question
              </Label>
              <Textarea
                id="question"
                placeholder="e.g. What are the top 10 customers by total revenue in the last 6 months, grouped by region?"
                className="min-h-[110px] resize-none font-medium text-sm leading-relaxed"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Ask complex, data-retrieval-focused questions to thoroughly test SQL generation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="space-y-2 w-full sm:w-72">
                <Label htmlFor="role" className="text-sm font-medium">
                  Role / Schema Context
                </Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as DirectQueryRequest["role"])}
                  disabled={loading}
                >
                  <SelectTrigger id="role" className="h-10">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <div>
                          <p className="font-medium">{r.label}</p>
                          <p className="text-xs text-gray-500">{r.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={loading || !question.trim()}
                className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating &amp; Running…
                  </>
                ) : (
                  <>
                    <Terminal className="w-4 h-4" />
                    Run Query
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* ── Results ── */}
        {result && (
          <div ref={resultsRef} className="space-y-5">
            {/* Status row */}
            <div className="flex flex-wrap items-center gap-3">
              {hasError ? (
                <Badge variant="destructive" className="gap-1.5 text-sm px-3 py-1">
                  <AlertTriangle className="w-4 h-4" />
                  Query Failed
                </Badge>
              ) : (
                <Badge className="gap-1.5 text-sm px-3 py-1 bg-emerald-600 hover:bg-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Success
                </Badge>
              )}
              {result.elapsed_ms > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  {result.elapsed_ms.toLocaleString()} ms
                </span>
              )}
              {!hasError && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <Database className="w-4 h-4" />
                  {result.row_count.toLocaleString()} row{result.row_count !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* SQL Panel — always shown (even on error, if SQL was generated) */}
            {(result.generated_sql || hasError) && (
              <div className="rounded-xl border bg-gray-900 dark:bg-gray-950 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700/60">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Generated SQL
                    </span>
                    {hasError && result.generated_sql && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Caused the error below
                      </Badge>
                    )}
                  </div>
                  {result.generated_sql && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-gray-700 h-7 gap-1.5 text-xs"
                      onClick={handleCopySql}
                    >
                      {copied ? (
                        <>
                          <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <ClipboardCopy className="w-3.5 h-3.5" />
                          Copy SQL
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <pre className="p-4 text-sm text-green-300 dark:text-green-400 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                  {result.generated_sql || <span className="text-gray-500 italic">No SQL was generated.</span>}
                </pre>
              </div>
            )}

            {/* Error Panel */}
            {hasError && (
              <div className="rounded-xl border border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 p-5">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1 min-w-0">
                    <p className="font-semibold text-red-700 dark:text-red-400">
                      Error executing query
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400 break-words font-mono leading-relaxed">
                      {result.error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Data Table */}
            {hasData && (
              <div className="rounded-xl border bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Results
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {result.row_count.toLocaleString()} rows · {result.columns.length} columns
                    </Badge>
                    {totalPages > 1 && (
                      <Badge variant="outline" className="text-xs text-gray-500">
                        Page {page} of {totalPages}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadExcel}
                    className="gap-1.5 text-xs h-8"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Excel
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-800/30">
                        {result.columns.map((col) => (
                          <TableHead
                            key={col}
                            className="text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
                          >
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleRows.map((row, ri) => (
                        <TableRow
                          key={ri}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                        >
                          {(row as unknown[]).map((cell, ci) => (
                            <TableCell
                              key={ci}
                              className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap max-w-[300px] truncate"
                              title={cell == null ? "" : String(cell)}
                            >
                              {cell == null ? (
                                <span className="text-gray-400 italic text-xs">NULL</span>
                              ) : (
                                String(cell)
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="border-t px-5 py-3 flex items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800/30">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Showing rows {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–
                      {Math.min(page * PAGE_SIZE, result.rows.length).toLocaleString()} of{" "}
                      {result.rows.length.toLocaleString()}
                    </p>
                    <Pagination className="w-auto mx-0">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (page > 1) setPage(page - 1);
                            }}
                            className={page <= 1 ? "pointer-events-none opacity-40" : ""}
                          />
                        </PaginationItem>
                        {buildPaginationPages(page, totalPages).map((p, i) =>
                          p === "…" ? (
                            <PaginationItem key={`ell-${i}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          ) : (
                            <PaginationItem key={p}>
                              <PaginationLink
                                href="#"
                                isActive={p === page}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPage(p as number);
                                }}
                              >
                                {p}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        )}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (page < totalPages) setPage(page + 1);
                            }}
                            className={page >= totalPages ? "pointer-events-none opacity-40" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            )}

            {/* Empty result */}
            {result && !hasError && result.rows.length === 0 && (
              <div className="rounded-xl border bg-white dark:bg-gray-900 p-10 text-center">
                <Database className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Query executed successfully — no rows returned.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

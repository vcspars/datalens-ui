import { Fragment, useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ChevronDown, ChevronRight, DollarSign, Hash, Receipt } from "lucide-react";
import {
  getUsageQueries,
  getUsageStepsForQuery,
  type UsageQueryItem,
  type UsageStepItem,
} from "@/lib/api";

const PAGE_SIZE = 25;

function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.0001) return `$${cost.toFixed(8)}`;
  return `$${cost.toFixed(6)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function StepsBreakdown({ userMessageId }: { userMessageId: string }) {
  const [steps, setSteps] = useState<UsageStepItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getUsageStepsForQuery(userMessageId);
        if (!cancelled) setSteps(res.steps);
      } catch (e) {
        console.log("[UsageCosts] Failed to load steps:", e);
        if (!cancelled) setSteps([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userMessageId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3 px-4">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading step breakdown...
      </div>
    );
  }

  if (!steps || steps.length === 0) {
    return <div className="text-sm text-muted-foreground py-3 px-4">No per-step usage recorded for this query.</div>;
  }

  return (
    <div className="px-4 pb-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Step</TableHead>
            <TableHead>Provider / Model</TableHead>
            <TableHead className="text-right">Prompt tokens</TableHead>
            <TableHead className="text-right">Completion tokens</TableHead>
            <TableHead className="text-right">Total tokens</TableHead>
            <TableHead className="text-right">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {steps.map((s, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{s.step}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {s.provider} / {s.model}
              </TableCell>
              <TableCell className="text-right">{s.prompt_tokens.toLocaleString()}</TableCell>
              <TableCell className="text-right">{s.completion_tokens.toLocaleString()}</TableCell>
              <TableCell className="text-right">{s.total_tokens.toLocaleString()}</TableCell>
              <TableCell className="text-right">{formatCost(s.cost_usd)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function UsageCosts() {
  const [items, setItems] = useState<UsageQueryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadData = useCallback(async (newOffset: number) => {
    setLoading(true);
    try {
      const res = await getUsageQueries(PAGE_SIZE, newOffset);
      setItems(res.items);
      setTotal(res.total);
      setOffset(newOffset);
    } catch (e) {
      console.log("[UsageCosts] Failed to load usage queries:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(0);
  }, [loadData]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalCost = items.reduce((sum, i) => sum + i.total_cost_usd, 0);
  const totalTokens = items.reduce((sum, i) => sum + i.total_tokens, 0);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Header />

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Receipt className="h-7 w-7" />
                Usage &amp; Cost
              </h1>
              <p className="text-muted-foreground mt-1">
                Token and dollar cost for every question you've asked, broken down per LLM step.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => loadData(offset)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Hash className="h-4 w-4" /> Queries (this page)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{items.length}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Hash className="h-4 w-4" /> Tokens (this page)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{totalTokens.toLocaleString()}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" /> Cost (this page)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{formatCost(totalCost)}</CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-16">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading usage...
                </div>
              ) : items.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">
                  No LLM usage recorded yet. Ask a question in Chat with Database to see cost data here.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Question</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <Fragment key={item.user_message_id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleExpanded(item.user_message_id)}
                        >
                          <TableCell>
                            {expanded.has(item.user_message_id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="max-w-md truncate" title={item.question}>
                            {item.question || <span className="text-muted-foreground italic">(question unavailable)</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(item.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.total_tokens.toLocaleString()}
                            <Badge variant="secondary" className="ml-2 text-[10px] font-normal">
                              {item.step_count} step{item.step_count === 1 ? "" : "s"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCost(item.total_cost_usd)}</TableCell>
                        </TableRow>
                        {expanded.has(item.user_message_id) && (
                          <TableRow>
                            <TableCell colSpan={5} className="p-0 bg-muted/20">
                              <StepsBreakdown userMessageId={item.user_message_id} />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0 || loading}
                onClick={() => loadData(Math.max(0, offset - PAGE_SIZE))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + PAGE_SIZE >= total || loading}
                onClick={() => loadData(offset + PAGE_SIZE)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

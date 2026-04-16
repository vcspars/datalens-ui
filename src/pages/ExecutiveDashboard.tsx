import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldOff,
  BarChart2,
  Filter,
  Star,
  AlertTriangle,
  X,
  Wrench,
} from "lucide-react";
import { getCurrentUser, UserResponse } from "@/lib/api";
import Header from "@/components/Header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// ─── App primary colour (matches hsl(207 69% 46%) in index.css) ───────────────
const PRIMARY      = "#2480BE";
const PRIMARY_DARK = "#1a6496";
const PRIMARY_PALE = "#9CC6E3";

// ─── Static reference data ────────────────────────────────────────────────────
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2017 }, (_, i) => String(2018 + i));

const MONTHS = [
  { value: "1",  label: "January"   },
  { value: "2",  label: "February"  },
  { value: "3",  label: "March"     },
  { value: "4",  label: "April"     },
  { value: "5",  label: "May"       },
  { value: "6",  label: "June"      },
  { value: "7",  label: "July"      },
  { value: "8",  label: "August"    },
  { value: "9",  label: "September" },
  { value: "10", label: "October"   },
  { value: "11", label: "November"  },
  { value: "12", label: "December"  },
];

const QUARTERS = [
  { value: "Q1", label: "Q1  (Jan – Mar)" },
  { value: "Q2", label: "Q2  (Apr – Jun)" },
  { value: "Q3", label: "Q3  (Jul – Sep)" },
  { value: "Q4", label: "Q4  (Oct – Dec)" },
];

// ─── Dummy chart data ─────────────────────────────────────────────────────────
const REVENUE_BY_YEAR = [
  { year: "2018",    revenue: 29.70 },
  { year: "2019",    revenue: 30.12 },
  { year: "2020",    revenue: 27.84 },
  { year: "2021",    revenue: 28.53 },
  { year: "2022",    revenue: 26.97 },
  { year: "2023",    revenue: 26.41 },
  { year: "2024",    revenue: 27.18 },
  { year: "2025",    revenue: 27.63 },
  { year: "2026 YTD", revenue: 4.88 },
];

const TOP_ACCOUNTS = [
  { account: "Quince",      rev2026: 582400, rev2025: 401200 },
  { account: "Wayfair",     rev2026: 498700, rev2025: 520100 },
  { account: "Rugs Direct", rev2026: 361500, rev2025: 298400 },
  { account: "Fred Meyer",  rev2026: 312800, rev2025: 275600 },
  { account: "Overstock",   rev2026: 287300, rev2025: 310900 },
  { account: "W.Sonoma",    rev2026: 261400, rev2025: 241800 },
  { account: "HG Buying",   rev2026: 198500, rev2025: 183200 },
  { account: "Lulu & GA",   rev2026: 142600, rev2025: 128900 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMonthLabel(m: string) {
  return MONTHS.find((x) => x.value === m)?.label ?? "";
}

function buildSubtitle(year: string, month: string, quarter: string) {
  const ml = getMonthLabel(month);
  if (month)   return { period: `${ml} ${year} Monthly Report`,  range: `Jan – ${ml.slice(0, 3)} ${year}  +  Full Year ${+year - 1}` };
  if (quarter) return { period: `${quarter} ${year} Quarterly Report`, range: `${quarter} ${year}  +  Full Year ${+year - 1}` };
  return          { period: `${year} Annual Report`,             range: `Full Year ${year}` };
}

function fmtDollars(v: number) {
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtAxis(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

// ─── Custom tooltips ──────────────────────────────────────────────────────────
const RevenueTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg shadow-md px-4 py-3">
      <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-foreground">
        ${payload[0].value.toFixed(2)}M
      </p>
    </div>
  );
};

const AccountsTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg shadow-md px-4 py-3 min-w-[210px]">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-6 text-sm mt-1">
          <span style={{ color: p.fill }} className="font-medium">{p.name}</span>
          <span className="font-bold text-foreground">{fmtDollars(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI card — stacked "card over card" design ───────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  trend: string;
  trendType: "up" | "down" | "neutral" | "warning";
  prevLabel: string;   // shown on the back (dark) card
  prevValue: string;
}

function KpiCard({ label, value, trend, trendType, prevLabel, prevValue }: KpiCardProps) {
  const trendColor =
    trendType === "up"      ? "text-emerald-500" :
    trendType === "down"    ? "text-red-400"     :
    trendType === "warning" ? "text-amber-500"   :
                              "text-white/60";
  const TrendIcon =
    trendType === "up"      ? TrendingUp   :
    trendType === "down"    ? TrendingDown :
    trendType === "warning" ? TrendingUp   :
                              Minus;

  return (
    /* Outer wrapper — adds space for the back card to peek out */
    <div className="relative pt-[8px] pr-[8px]">
      {/* ── Back card (dark, previous period) ── */}
      <div
        className="absolute bottom-0 right-0 w-full h-full rounded-lg flex flex-col justify-end p-4"
        style={{ backgroundColor: PRIMARY_DARK }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50 mb-1">
          {prevLabel}
        </p>
        <p className="text-xl font-bold text-white/80">{prevValue}</p>
      </div>

      {/* ── Front card (light, current period) ── */}
      <Card
        className="relative border-0 border-l-[3px] shadow-md hover:shadow-lg transition-shadow duration-200 bg-card"
        style={{ borderLeftColor: PRIMARY }}
      >
        <CardContent className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
            {label}
          </p>
          <p className="text-[1.85rem] font-bold leading-none text-foreground mb-2.5">
            {value}
          </p>
          <div className={`flex items-center gap-1.5 text-xs font-medium ${trendColor}`}
            style={trendType === "neutral" ? { color: "hsl(210 20% 50%)" } : {}}>
            <TrendIcon className="h-3.5 w-3.5 shrink-0" />
            <span>{trend}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Winners / Losers table ───────────────────────────────────────────────────
interface AccountRow {
  rank:    number;
  account: string;
  revenue: string;
  yoy:     string;
  isUp:    boolean;
}

interface WinnersLosersProps {
  title:    string;
  rows:     AccountRow[];
  isWinner: boolean;
}

function WinnersLosersTable({ title, rows, isWinner }: WinnersLosersProps) {
  return (
    <Card className="border border-border shadow-sm flex-1">
      <CardHeader className="px-5 pt-5 pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          {isWinner
            ? <TrendingUp className="h-4 w-4 text-emerald-500" />
            : <TrendingDown className="h-4 w-4 text-red-500" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: PRIMARY_DARK }}>
              <th className="text-left pl-5 pr-2 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/70 w-8">#</th>
              <th className="text-left px-2 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/70">Account</th>
              <th className="text-right px-2 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/70">Revenue</th>
              <th className="text-right pr-5 pl-2 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/70">YoY Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.rank}
                className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/40"}`}
              >
                <td className="pl-5 pr-2 py-3 font-bold text-muted-foreground text-xs">{row.rank}</td>
                <td className="px-2 py-3 font-medium text-foreground">{row.account}</td>
                <td className="px-2 py-3 text-right font-mono text-foreground text-xs">{row.revenue}</td>
                <td className="pr-5 pl-2 py-3 text-right">
                  <span
                    className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-xs font-bold
                      ${row.isUp
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-600"}`}
                  >
                    {row.yoy}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ─── Key Insights ─────────────────────────────────────────────────────────────
interface InsightCardProps { title: string; body: string }

function InsightCard({ title, body }: InsightCardProps) {
  return (
    <div
      className="rounded-lg border border-border bg-card p-5 border-l-[3px] hover:shadow-sm transition-shadow"
      style={{ borderLeftColor: PRIMARY }}
    >
      <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: PRIMARY }}>
        {title}
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

// ─── Section heading — larger, dark-blue, grey underline ─────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold tracking-tight" style={{ color: PRIMARY_DARK }}>
        {children}
      </h2>
      <hr className="mt-2.5 border-t border-gray-200" />
    </div>
  );
}

// ─── Status badge helper ──────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  STAR:      "bg-emerald-100 text-emerald-800 border border-emerald-200",
  GROWING:   "bg-emerald-50  text-emerald-700 border border-emerald-200",
  DECLINING: "bg-red-100     text-red-700     border border-red-200",
  WATCH:     "bg-amber-100   text-amber-700   border border-amber-200",
  CRITICAL:  "bg-red-200     text-red-800     border border-red-300",
  NEW:       "bg-blue-100    text-blue-700    border border-blue-200",
  STABLE:    "bg-slate-100   text-slate-600   border border-slate-200",
  FLAT:      "bg-gray-100    text-gray-500    border border-gray-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLE[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

// ─── Full accounts table data ─────────────────────────────────────────────────
interface FullAccountRow {
  rank:   number;
  account: string;
  isStar:  boolean;
  rev26:   string;
  rev25:   string;
  yoyDol:  string;
  yoyPct:  string;
  yoyUp:   boolean | "new" | "flat";
  units26: number;
  status:  string;
  action:  string;
}

const ALL_ACCOUNTS: FullAccountRow[] = [
  { rank:  1, account: "Quince",            isStar: true,  rev26: "$576,389", rev25: "$35,115",  yoyDol: "+$541,274", yoyPct: "+1,541%", yoyUp: true,  units26: 2566, status: "STAR",      action: "Daily attention — protect stock" },
  { rank:  2, account: "Wayfair",           isStar: false, rev26: "$485,262", rev25: "$395,568", yoyDol: "+$89,694",  yoyPct: "+23%",    yoyUp: true,  units26: 3474, status: "GROWING",   action: "Weekly check-in" },
  { rank:  3, account: "Rugs Direct",       isStar: false, rev26: "$163,366", rev25: "$125,218", yoyDol: "+$38,148",  yoyPct: "+30%",    yoyUp: true,  units26: 723,  status: "GROWING",   action: "Weekly check-in" },
  { rank:  4, account: "Fred Meyer",        isStar: false, rev26: "$152,079", rev25: "$18,651",  yoyDol: "+$133,428", yoyPct: "+715%",   yoyUp: true,  units26: 2376, status: "STAR",      action: "Weekly check-in" },
  { rank:  5, account: "Overstock",         isStar: false, rev26: "$141,411", rev25: "$97,005",  yoyDol: "+$44,406",  yoyPct: "+46%",    yoyUp: true,  units26: 819,  status: "GROWING",   action: "Weekly check-in" },
  { rank:  6, account: "Williams Sonoma",   isStar: false, rev26: "$123,827", rev25: "$215,023", yoyDol: "-$91,196",  yoyPct: "-42%",    yoyUp: false, units26: 1033, status: "DECLINING", action: "URGENT — Recovery call" },
  { rank:  7, account: "HG Buying",         isStar: false, rev26: "$121,530", rev25: "$33,840",  yoyDol: "+$87,690",  yoyPct: "+259%",   yoyUp: true,  units26: 1884, status: "GROWING",   action: "Weekly check-in" },
  { rank:  8, account: "Lulu & Georgia",    isStar: false, rev26: "$37,998",  rev25: "$48,955",  yoyDol: "-$10,957",  yoyPct: "-22%",    yoyUp: false, units26: 126,  status: "DECLINING", action: "Recovery call needed" },
  { rank:  9, account: "Ramble Market",     isStar: false, rev26: "$34,257",  rev25: "$0",       yoyDol: "+$34,257",  yoyPct: "NEW",     yoyUp: "new", units26: 51,   status: "NEW",       action: "Nurture relationship" },
  { rank: 10, account: "Target",            isStar: false, rev26: "$33,478",  rev25: "$83,101",  yoyDol: "-$49,623",  yoyPct: "-60%",    yoyUp: false, units26: 303,  status: "DECLINING", action: "URGENT — Recovery call" },
  { rank: 11, account: "TJ Maxx.com",       isStar: false, rev26: "$23,607",  rev25: "$0",       yoyDol: "+$23,607",  yoyPct: "NEW",     yoyUp: "new", units26: 121,  status: "NEW",       action: "Nurture relationship" },
  { rank: 12, account: "Bison Commerce",    isStar: false, rev26: "$23,525",  rev25: "$14,525",  yoyDol: "+$9,000",   yoyPct: "+82%",    yoyUp: true,  units26: 192,  status: "GROWING",   action: "Monthly check-in" },
  { rank: 13, account: "Walmart",           isStar: false, rev26: "$14,953",  rev25: "$18,445",  yoyDol: "-$3,492",   yoyPct: "-19%",    yoyUp: false, units26: 92,   status: "WATCH",     action: "Monthly check-in" },
  { rank: 14, account: "Marshalls.com",     isStar: false, rev26: "$14,175",  rev25: "$0",       yoyDol: "+$14,175",  yoyPct: "NEW",     yoyUp: "new", units26: 83,   status: "NEW",       action: "Nurture relationship" },
  { rank: 15, account: "One Kings Lane",    isStar: false, rev26: "$11,032",  rev25: "$11,216",  yoyDol: "+$186",     yoyPct: "FLAT",    yoyUp: "flat",units26: 56,   status: "STABLE",    action: "Monthly check-in" },
  { rank: 16, account: "Mackenzie Childs",  isStar: false, rev26: "$9,727",   rev25: "$39,593",  yoyDol: "-$29,066",  yoyPct: "-75%",    yoyUp: false, units26: 207,  status: "CRITICAL",  action: "URGENT — Executive call" },
];

// ─── Historical revenue by key account ───────────────────────────────────────
const HIST_YEARS = ["2018","2019","2020","2021","2022","2023","2024","2025"];
const HIST_DATA = [
  { year:"2018", Wayfair:5200, WilliamsSonoma:1900, Overstock:1250, RugsDirect:870,  Quince:0    },
  { year:"2019", Wayfair:5400, WilliamsSonoma:2180, Overstock:1450, RugsDirect:980,  Quince:0    },
  { year:"2020", Wayfair:4850, WilliamsSonoma:2020, Overstock:1820, RugsDirect:910,  Quince:0    },
  { year:"2021", Wayfair:5850, WilliamsSonoma:2460, Overstock:1680, RugsDirect:1060, Quince:0    },
  { year:"2022", Wayfair:5320, WilliamsSonoma:2280, Overstock:1310, RugsDirect:1190, Quince:0    },
  { year:"2023", Wayfair:4920, WilliamsSonoma:2100, Overstock:1120, RugsDirect:1110, Quince:0    },
  { year:"2024", Wayfair:5180, WilliamsSonoma:2160, Overstock:1010, RugsDirect:1080, Quince:48   },
  { year:"2025", Wayfair:5520, WilliamsSonoma:2080, Overstock:1060, RugsDirect:1270, Quince:3180 },
];

const LINE_COLORS = {
  Wayfair:        "#2480BE",
  WilliamsSonoma: "#f97316",
  Overstock:      "#a855f7",
  RugsDirect:     "#06b6d4",
  Quince:         "#10b981",
};

const LINE_LABELS: Record<string, string> = {
  Wayfair:        "Wayfair",
  WilliamsSonoma: "Williams Sonoma",
  Overstock:      "Overstock",
  RugsDirect:     "Rugs Direct",
  Quince:         "Quince",
};

// ─── Accounts tab content ─────────────────────────────────────────────────────
interface AccountsContentProps { appliedYear: string; appliedMonth: string }

function AccountsContent({ appliedYear, appliedMonth }: AccountsContentProps) {
  const ml   = getMonthLabel(appliedMonth);
  const prev = +appliedYear - 1;
  const periodStr = ml ? `${ml} ${appliedYear}` : appliedYear;
  const prevStr   = ml ? `${ml} ${prev}` : String(prev);

  const yoyPctStyle = (up: boolean | "new" | "flat") => {
    if (up === "new")  return "bg-blue-100 text-blue-700 border border-blue-200";
    if (up === "flat") return "bg-gray-100 text-gray-500 border border-gray-200";
    return up
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : "bg-red-100 text-red-700 border border-red-200";
  };

  const LineTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-border rounded-lg shadow-md px-4 py-3 min-w-[190px]">
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-4 text-xs mt-1">
            <span style={{ color: p.color }} className="font-medium">{LINE_LABELS[p.dataKey]}</span>
            <span className="font-bold text-foreground">${p.value.toLocaleString()}K</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-10">

      {/* ── Full accounts table ── */}
      <div>
        <SectionHeading>
          All Accounts — {periodStr} Performance
        </SectionHeading>
        <Card className="border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr style={{ backgroundColor: PRIMARY_DARK }}>
                  {["#","Account",`${periodStr} Revenue`,`${prevStr} Revenue`,"YOY Change $","YOY %",`${periodStr} Units`,"Status","Sales Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/75 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_ACCOUNTS.map((row, i) => (
                  <tr
                    key={row.rank}
                    className={`border-b border-border last:border-0 hover:bg-primary/[0.03] transition-colors ${i % 2 === 1 ? "bg-muted/30" : ""}`}
                  >
                    <td className="px-4 py-3 font-bold text-muted-foreground text-xs w-8">{row.rank}</td>
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        {row.account}
                        {row.isStar && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground font-medium">{row.rev26}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{row.rev25}</td>
                    <td className={`px-4 py-3 font-mono font-medium ${row.yoyUp === true ? "text-emerald-700" : row.yoyUp === false ? "text-red-600" : "text-blue-600"}`}>
                      {row.yoyDol}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold ${yoyPctStyle(row.yoyUp)}`}>
                        {row.yoyPct}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground font-mono text-xs">{row.units26.toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className={`px-4 py-3 text-xs whitespace-nowrap ${row.action.startsWith("URGENT") ? "font-semibold text-red-600" : "text-muted-foreground"}`}>
                      {row.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── Historical revenue line chart ── */}
      <div>
        <SectionHeading>Historical Revenue by Key Account (Full Year)</SectionHeading>
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-0 px-6 pt-5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Top 5 Accounts — Annual Revenue History
              <span className="ml-2 text-xs font-normal text-muted-foreground">($K)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-5 pt-4">
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={HIST_DATA} margin={{ top: 8, right: 24, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 93%)" vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: "hsl(210 20% 50%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${v.toLocaleString()}K`}
                  tick={{ fontSize: 11, fill: "hsl(210 20% 50%)" }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                />
                <Tooltip content={<LineTooltip />} />
                <Legend
                  iconType="square"
                  iconSize={10}
                  wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                  formatter={(key) => LINE_LABELS[key as string] ?? key}
                />
                {Object.keys(LINE_COLORS).map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={LINE_COLORS[key as keyof typeof LINE_COLORS]}
                    strokeWidth={key === "Quince" ? 2.5 : 1.8}
                    dot={{ r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

// ─── Forecast data ────────────────────────────────────────────────────────────
interface ForecastRow {
  account:    string;
  fy2025:     string;
  base2026:   string;
  upside2026: string;
  monthly:    string;
  priority:   "TOP PRIORITY" | "GROW" | "RECOVER" | "WATCH";
  driver:     string;
}

const FORECAST_ROWS: ForecastRow[] = [
  { account: "Quince",          fy2025: "$3,169,481", base2026: "$5,500,000", upside2026: "$7,000,000", monthly: "$576K", priority: "TOP PRIORITY", driver: "Peak season Jul–Nov = 58% of rev. Must stock now." },
  { account: "Wayfair",         fy2025: "$5,604,375", base2026: "$5,800,000", upside2026: "$6,200,000", monthly: "$485K", priority: "TOP PRIORITY", driver: "Solid growth momentum. Protect with inventory." },
  { account: "Rugs Direct",     fy2025: "$1,685,086", base2026: "$1,900,000", upside2026: "$2,200,000", monthly: "$163K", priority: "GROW",         driver: "Strong +30% Feb. Expand SKU offering." },
  { account: "Overstock",       fy2025: "$1,654,633", base2026: "$1,800,000", upside2026: "$2,100,000", monthly: "$141K", priority: "GROW",         driver: "+46% Feb. Continued momentum expected." },
  { account: "Williams Sonoma", fy2025: "$2,146,566", base2026: "$1,600,000", upside2026: "$2,000,000", monthly: "$124K", priority: "RECOVER",      driver: "Down 42% Feb. Root cause unknown. Sales call urgent." },
  { account: "HG Buying",       fy2025: "$1,062,691", base2026: "$1,400,000", upside2026: "$1,700,000", monthly: "$122K", priority: "GROW",         driver: "+259% Feb. Major new volume." },
  { account: "Target",          fy2025: "$820,976",   base2026: "$600,000",   upside2026: "$900,000",   monthly: "$33K",  priority: "RECOVER",      driver: "Down 60% Feb. Root cause unknown. Escalate." },
  { account: "Mackenzie Childs",fy2025: "$1,141,023", base2026: "$500,000",   upside2026: "$900,000",   monthly: "$10K",  priority: "RECOVER",      driver: "Down 75% Feb. Critical account in danger." },
  { account: "Lulu & Georgia",  fy2025: "$489,550",   base2026: "$400,000",   upside2026: "$550,000",   monthly: "$38K",  priority: "WATCH",        driver: "Down 22% Feb. Monitor closely." },
  { account: "Fred Meyer",      fy2025: "$349,233",   base2026: "$900,000",   upside2026: "$1,400,000", monthly: "$152K", priority: "GROW",         driver: "+715% Feb — new major volume. Track weekly." },
];

const PRIORITY_STYLE: Record<string, string> = {
  "TOP PRIORITY": "bg-red-600    text-white        border border-red-700",
  "GROW":         "bg-emerald-100 text-emerald-800 border border-emerald-200",
  "RECOVER":      "bg-red-100    text-red-700      border border-red-200",
  "WATCH":        "bg-amber-100  text-amber-700    border border-amber-200",
};

// Quince monthly trajectory  Jan25–Feb26
const QUINCE_MONTHLY = [
  { month: "Jan 25",  rev: 47,  isCurrentYear: false },
  { month: "Feb 25",  rev: 35,  isCurrentYear: false },
  { month: "Mar 25",  rev: 111, isCurrentYear: false },
  { month: "Apr 25",  rev: 210, isCurrentYear: false },
  { month: "May 25",  rev: 245, isCurrentYear: false },
  { month: "Jun 25",  rev: 309, isCurrentYear: false },
  { month: "Jul 25",  rev: 394, isCurrentYear: false },
  { month: "Aug 25",  rev: 356, isCurrentYear: false },
  { month: "Sep 25",  rev: 359, isCurrentYear: false },
  { month: "Oct 25",  rev: 385, isCurrentYear: false },
  { month: "Nov 25",  rev: 388, isCurrentYear: false },
  { month: "Dec 25",  rev: 337, isCurrentYear: false },
  { month: "Jan 26",  rev: 540, isCurrentYear: true  },
  { month: "Feb 26*", rev: 168, isCurrentYear: true  },
];

// Quince % of annual revenue by month (2025)
const QUINCE_SEASONAL = [
  { month: "Jan", pct: 1.5,  isPeak: false },
  { month: "Feb", pct: 1.1,  isPeak: false },
  { month: "Mar", pct: 3.5,  isPeak: false },
  { month: "Apr", pct: 6.6,  isPeak: false },
  { month: "May", pct: 7.7,  isPeak: false },
  { month: "Jun", pct: 9.7,  isPeak: false },
  { month: "Jul", pct: 12.4, isPeak: true  },
  { month: "Aug", pct: 11.2, isPeak: true  },
  { month: "Sep", pct: 11.3, isPeak: true  },
  { month: "Oct", pct: 12.1, isPeak: true  },
  { month: "Nov", pct: 12.2, isPeak: true  },
  { month: "Dec", pct: 10.6, isPeak: false },
];

// ─── Forecast content ─────────────────────────────────────────────────────────
interface ForecastContentProps { appliedYear: string; appliedMonth: string }

function ForecastContent({ appliedYear }: ForecastContentProps) {
  const forecastKpis: KpiCardProps[] = [
    {
      label:     `${appliedYear} Annualized Pace`,
      value:     "~$29M",
      trend:     "Based on Jan+Feb run rate",
      trendType: "up",
      prevLabel: `${+appliedYear - 1} Full Year`,
      prevValue: "$27.63M",
    },
    {
      label:     "Quince Annual Run Rate",
      value:     "$6.5M",
      trend:     "Based on Jan 2026 pace",
      trendType: "up",
      prevLabel: "Quince Full Year 2025",
      prevValue: "$3.17M",
    },
    {
      label:     "Peak Season Months",
      value:     "Jul – Nov",
      trend:     "58% of annual revenue",
      trendType: "neutral",
      prevLabel: "Peak Contribution",
      prevValue: "58%",
    },
    {
      label:     "Months Until Peak Season",
      value:     "3 Months",
      trend:     "Order inventory NOW",
      trendType: "warning",
      prevLabel: "Peak Starts",
      prevValue: "July",
    },
  ];

  const TrajectoryTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-border rounded-lg shadow-md px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-foreground">${payload[0].value.toLocaleString()}K</p>
      </div>
    );
  };

  const SeasonalTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-border rounded-lg shadow-md px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-foreground">{payload[0].value.toFixed(1)}% of annual revenue</p>
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-10">

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-6">
        {forecastKpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Account Forecasts table */}
      <div>
        <SectionHeading>Account Forecasts — {appliedYear} Full Year Projections</SectionHeading>
        <Card className="border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr style={{ backgroundColor: PRIMARY_DARK }}>
                  {["Account","2025 Full Year",`${appliedYear} Base Forecast`,`${appliedYear} Upside Case`,"Monthly Rate (Feb)","Priority","Key Risk / Driver"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/75 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FORECAST_ROWS.map((row, i) => (
                  <tr
                    key={row.account}
                    className={`border-b border-border last:border-0 hover:bg-primary/[0.03] transition-colors ${i % 2 === 1 ? "bg-muted/30" : ""}`}
                  >
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{row.account}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{row.fy2025}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">{row.base2026}</td>
                    <td className="px-4 py-3 font-mono font-bold" style={{ color: PRIMARY }}>{row.upside2026}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{row.monthly}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${PRIORITY_STYLE[row.priority]}`}>
                        {row.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{row.driver}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Quince Monthly Revenue Trajectory */}
      <div>
        <SectionHeading>Quince Monthly Revenue Trajectory</SectionHeading>
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-0 px-6 pt-5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Quince Revenue Per Month — 2025 to 2026
              <span className="ml-2 text-xs font-normal text-muted-foreground">($K)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-5 pt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={QUINCE_MONTHLY} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 93%)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "hsl(210 20% 50%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${v}K`}
                  tick={{ fontSize: 11, fill: "hsl(210 20% 50%)" }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip content={<TrajectoryTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="rev" radius={[3, 3, 0, 0]} maxBarSize={40}>
                  {QUINCE_MONTHLY.map((entry) => (
                    <Cell
                      key={entry.month}
                      fill={entry.isCurrentYear ? PRIMARY_DARK : PRIMARY_PALE}
                      fillOpacity={entry.isCurrentYear ? 1 : 0.55}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Seasonal Planning */}
      <div>
        <SectionHeading>Seasonal Planning — When Revenue Happens</SectionHeading>
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-0 px-6 pt-5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Quince Revenue % by Month (2025)
              <span className="ml-2 text-xs font-normal text-muted-foreground">— Peak Season is Jul–Nov</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={QUINCE_SEASONAL} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 93%)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "hsl(210 20% 50%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: "hsl(210 20% 50%)" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 15]}
                  width={40}
                />
                <Tooltip content={<SeasonalTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="pct" radius={[3, 3, 0, 0]} maxBarSize={40}>
                  {QUINCE_SEASONAL.map((entry) => (
                    <Cell
                      key={entry.month}
                      fill={entry.isPeak ? PRIMARY_DARK : PRIMARY_PALE}
                      fillOpacity={entry.isPeak ? 1 : 0.5}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5 px-2">
              <span className="text-amber-500 font-bold mt-0.5">⚠</span>
              <span>
                July through November = <strong>58% of annual revenue</strong>.
                Inventory must arrive by June to avoid stockouts during peak.
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

// ─── Collections & Sizes data ────────────────────────────────────────────────
const TOP_COLLECTIONS_BAR = [
  { name: "CHARS", rev: 142 },
  { name: "ASST0", rev: 122 },
  { name: "ARCHE", rev: 112 },
  { name: "ANATO", rev: 103 },
  { name: "KARAC", rev: 103 },
  { name: "ORCHA", rev:  98 },
  { name: "SIMBA", rev:  79 },
  { name: "OLIVE", rev:  68 },
  { name: "CONTO", rev:  64 },
  { name: "GEORG", rev:  55 },
  { name: "WOODL", rev:  50 },
  { name: "JAMES", rev:  51 },
];

interface CollectionRankRow {
  rank:    number;
  name:    string;
  rev26:   string;
  units26: number;
  yoyUnits:string;
  yoyUp:   boolean | "new";
}

const COLLECTION_RANKING: CollectionRankRow[] = [
  { rank:  1, name: "CHARS", rev26: "$141,973", units26:  676, yoyUnits: "+70%",  yoyUp: true  },
  { rank:  2, name: "ARCHE", rev26: "$112,492", units26:  730, yoyUnits: "+162%", yoyUp: true  },
  { rank:  3, name: "ASST0", rev26: "$121,530", units26: 1884, yoyUnits: "NEW",   yoyUp: "new" },
  { rank:  4, name: "ANATO", rev26: "$103,468", units26:  710, yoyUnits: "-16%",  yoyUp: false },
  { rank:  5, name: "KARAC", rev26: "$103,216", units26: 1758, yoyUnits: "+115%", yoyUp: true  },
  { rank:  6, name: "ORCHA", rev26: "$98,206",  units26:  480, yoyUnits: "-21%",  yoyUp: false },
  { rank:  7, name: "OLIVE", rev26: "$68,445",  units26:  234, yoyUnits: "+169%", yoyUp: true  },
  { rank:  8, name: "CONTO", rev26: "$64,336",  units26:  292, yoyUnits: "+97%",  yoyUp: true  },
  { rank:  9, name: "SIMBA", rev26: "$78,573",  units26:  302, yoyUnits: "+25%",  yoyUp: true  },
  { rank: 10, name: "GEORG", rev26: "$54,935",  units26:  717, yoyUnits: "NEW",   yoyUp: "new" },
  { rank: 11, name: "JAMES", rev26: "$51,334",  units26:  351, yoyUnits: "+49%",  yoyUp: true  },
];

const SIZE_SHARES = [
  { label: "8×10",          code: "(80A0)",          pct: 38 },
  { label: "5×8",           code: "(5080)",           pct: 22 },
  { label: "9×12",          code: "(90C0)",           pct: 19 },
  { label: "7.9×9.9",       code: "(7999/80R0)",      pct: 12 },
  { label: "2×3 / Accent",  code: "(2030/2776)",      pct:  5 },
  { label: "Other Sizes",   code: "",                 pct:  4 },
];

interface SkuRow {
  rank:    number;
  sku:     string;
  size:    string;
  price:   string;
  units25: number;
  rev25:   string;
}

const TOP_SKUS: SkuRow[] = [
  { rank: 1, sku: "CHARS CHR-1 Taupe",    size: "8×10",   price: "$299", units25: 443, rev25: "$132,457" },
  { rank: 2, sku: "SIMBA SIM-3 Copper",   size: "8×10",   price: "$475", units25: 165, rev25: "$78,375"  },
  { rank: 3, sku: "ARCHE ARC-1 Rust",     size: "8×10",   price: "$285", units25: 224, rev25: "$63,840"  },
  { rank: 4, sku: "SIMBA SIM-3 Copper",   size: "9×12",   price: "$625", units25:  72, rev25: "$45,000"  },
  { rank: 5, sku: "ANDES AND-8 Ivory",    size: "7.9×9.9",price: "$460", units25:  96, rev25: "$44,160"  },
  { rank: 6, sku: "CHARS CHR-1 Taupe",    size: "5×8",    price: "$145", units25: 284, rev25: "$43,727"  },
  { rank: 7, sku: "PASHA PSH-1 Lt Blue",  size: "9×12",   price: "$275", units25: 148, rev25: "$40,700"  },
  { rank: 8, sku: "ARCHE ARC-1 Rust",     size: "9×12",   price: "$375", units25: 108, rev25: "$40,500"  },
  { rank: 9, sku: "PASHA PSH-1 Lt Blue",  size: "6×10",   price: "$220", units25: 175, rev25: "$38,500"  },
];

const QUINCE_COLLECTION_BAR = [
  { name: "CHARS", rev: 480 },
  { name: "ARCHE", rev: 364 },
  { name: "SIMBA", rev: 265 },
  { name: "OLIVE", rev: 255 },
  { name: "JAMES", rev: 240 },
  { name: "CONTO", rev: 165 },
  { name: "PASHA", rev: 155 },
  { name: "ANDES", rev: 155 },
  { name: "WILLO", rev: 145 },
  { name: "COVE0", rev: 110 },
  { name: "BRIST", rev: 105 },
  { name: "MALLO", rev:  75 },
];

// ─── Collections & Sizes content ─────────────────────────────────────────────
interface CollectionsContentProps { appliedYear: string; appliedMonth: string }

function CollectionsContent({ appliedYear, appliedMonth }: CollectionsContentProps) {
  const ml   = getMonthLabel(appliedMonth);
  const periodStr = ml ? `${ml} ${appliedYear}` : appliedYear;

  const CollBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-border rounded-lg shadow-md px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-foreground">
          Feb 2026 Revenue ($K): {payload[0].value}
        </p>
      </div>
    );
  };

  const QuinceBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-border rounded-lg shadow-md px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-foreground">
          2025 Quince Revenue ($K): {payload[0].value}
        </p>
      </div>
    );
  };

  const yoyStyle = (up: boolean | "new") =>
    up === "new"  ? "bg-blue-100 text-blue-700 border border-blue-200" :
    up            ? "text-emerald-600 font-semibold" :
                    "text-red-500 font-semibold";

  return (
    <div className="p-6 lg:p-8 space-y-10">

      {/* ── Section 1: Top Collections ── */}
      <div>
        <SectionHeading>Top Collections — {periodStr}</SectionHeading>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Horizontal bar chart */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-0 px-6 pt-5">
              <CardTitle className="text-sm font-semibold text-foreground">
                Top 12 Collections by Revenue
                <span className="ml-2 text-xs font-normal text-muted-foreground">— {periodStr}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-5 pt-4">
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={TOP_COLLECTIONS_BAR}
                  layout="vertical"
                  margin={{ top: 2, right: 24, left: 8, bottom: 2 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 93%)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `$${v}K`}
                    tick={{ fontSize: 10, fill: "hsl(210 20% 50%)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={52}
                    tick={{ fontSize: 11, fill: "hsl(210 20% 40%)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CollBarTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Bar dataKey="rev" fill={PRIMARY_DARK} radius={[0, 3, 3, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Collection ranking table */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-0 px-6 pt-5">
              <CardTitle className="text-sm font-semibold text-foreground">Collection Ranking</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: PRIMARY_DARK }}>
                    <th className="pl-5 pr-2 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-white/75 w-8">#</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-white/75">Collection</th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-white/75">{periodStr} Revenue</th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-white/75">{periodStr} Units</th>
                    <th className="pr-5 pl-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-white/75">YoY Units</th>
                  </tr>
                </thead>
                <tbody>
                  {COLLECTION_RANKING.map((row, i) => (
                    <tr key={row.rank} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                      <td className="pl-5 pr-2 py-2.5 font-bold text-muted-foreground text-xs">{row.rank}</td>
                      <td className="px-3 py-2.5 font-semibold text-foreground tracking-wide">{row.name}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-foreground text-xs">{row.rev26}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-foreground text-xs">{row.units26.toLocaleString()}</td>
                      <td className="pr-5 pl-2 py-2.5 text-right">
                        {row.yoyUp === "new"
                          ? <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold ${yoyStyle("new")}`}>NEW</span>
                          : <span className={`text-xs ${yoyStyle(row.yoyUp)}`}>{row.yoyUnits}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Section 2: Best-Selling Sizes ── */}
      <div>
        <SectionHeading>Best-Selling Sizes (Based on Quince 2025 Data)</SectionHeading>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Size revenue share — custom progress bars */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2 px-6 pt-5">
              <CardTitle className="text-sm font-semibold text-foreground">Revenue Share by Size</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-5">
              {SIZE_SHARES.map((s) => (
                <div key={s.label}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm font-semibold text-foreground">
                      {s.label}{" "}
                      {s.code && <span className="text-xs font-normal text-muted-foreground ml-1">{s.code}</span>}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">{s.pct}% of revenue</span>
                  </div>
                  <div className="relative h-6 w-full rounded bg-muted overflow-hidden">
                    <div
                      className="h-full rounded flex items-center justify-start pl-2 transition-all"
                      style={{ width: `${s.pct}%`, backgroundColor: s.pct >= 20 ? PRIMARY_DARK : PRIMARY_PALE }}
                    >
                      {s.pct >= 10 && (
                        <span className="text-[11px] font-bold text-white">{s.pct}%</span>
                      )}
                    </div>
                    {s.pct < 10 && (
                      <span className="absolute left-[calc(var(--w)+6px)] top-1/2 -translate-y-1/2 text-[11px] font-bold text-foreground"
                        style={{ "--w": `${s.pct}%` } as React.CSSProperties}>
                        {s.pct}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top SKUs table */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-0 px-6 pt-5">
              <CardTitle className="text-sm font-semibold text-foreground">Top SKUs by Revenue
                <span className="ml-2 text-xs font-normal text-muted-foreground">(Quince 2025)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: PRIMARY_DARK }}>
                    {["#","SKU / Design","Size","Price","2025 Units","2025 Revenue"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-white/75 first:pl-5 last:pr-5 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TOP_SKUS.map((row, i) => (
                    <tr key={row.rank} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                      <td className="pl-5 pr-2 py-2.5 font-bold text-muted-foreground text-xs">{row.rank}</td>
                      <td className="px-3 py-2.5 font-medium text-foreground text-xs whitespace-nowrap">{row.sku}</td>
                      <td className="px-3 py-2.5 text-foreground text-xs">{row.size}</td>
                      <td className="px-3 py-2.5 font-mono text-foreground text-xs">{row.price}</td>
                      <td className="px-3 py-2.5 font-mono text-foreground text-xs">{row.units25.toLocaleString()}</td>
                      <td className="pr-5 pl-3 py-2.5 font-mono font-semibold text-foreground text-xs">{row.rev25}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Section 3: Top Quince Collections — Full Year 2025 ── */}
      <div>
        <SectionHeading>Top Quince Collections — Full Year 2025</SectionHeading>
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-0 px-6 pt-5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Quince Revenue by Collection — 2025 Full Year
              <span className="ml-2 text-xs font-normal text-muted-foreground">($K)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-5 pt-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={QUINCE_COLLECTION_BAR} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 93%)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(210 20% 50%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${v}K`}
                  tick={{ fontSize: 11, fill: "hsl(210 20% 50%)" }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip content={<QuinceBarTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="rev" name="2025 Quince Revenue ($K)" fill={PRIMARY_DARK} radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

// ─── What to Order data ───────────────────────────────────────────────────────
interface UrgencyRow {
  urgency:    "OUT OF STOCK" | "CRITICAL";
  sku:        string;
  collection: string;
  color:      string;
  size:       string;
  pieces:     number;
  value:      string;
  account:    string;
}

const IMMEDIATE_ORDERS: UrgencyRow[] = [
  { urgency: "OUT OF STOCK", sku: "HAMPOHAM-5NAT80A0", collection: "HAMPO", color: "Natural", size: "8×10", pieces: 44, value: "$7,920",  account: "Quince" },
  { urgency: "OUT OF STOCK", sku: "HAMPOHAM-5NAT90C0", collection: "HAMPO", color: "Natural", size: "9×12", pieces: 24, value: "$5,640",  account: "Quince" },
  { urgency: "OUT OF STOCK", sku: "HAMPOHAM-5NAT80A0", collection: "HAMPO", color: "Natural", size: "8×10", pieces: 28, value: "$5,040",  account: "Quince" },
  { urgency: "OUT OF STOCK", sku: "HAMPOHAM-6NAT90C0", collection: "HAMPO", color: "Natural", size: "9×12", pieces: 14, value: "$3,290",  account: "Quince" },
  { urgency: "OUT OF STOCK", sku: "HAMPOHAM-5NAT4160", collection: "HAMPO", color: "Natural", size: "4×6",  pieces: 34, value: "$1,632",  account: "Quince" },
  { urgency: "OUT OF STOCK", sku: "HAMPOHAM-5NAT5370", collection: "HAMPO", color: "Natural", size: "5×7",  pieces: 18, value: "$1,440",  account: "Quince" },
  { urgency: "CRITICAL",     sku: "TEPPETEP-2GRY80A0", collection: "TEPPE", color: "Grey",    size: "8×10", pieces: 49, value: "$12,985", account: "Quince" },
  { urgency: "CRITICAL",     sku: "HAMPOHAM-6NAT5370", collection: "HAMPO", color: "Natural", size: "5×7",  pieces: 33, value: "$2,640",  account: "Quince" },
  { urgency: "CRITICAL",     sku: "TEPPETEP-2GRY2030", collection: "TEPPE", color: "Grey",    size: "2×3",  pieces: 34, value: "$748",    account: "Quince" },
  { urgency: "CRITICAL",     sku: "TEPPETEP-2GRY5080", collection: "TEPPE", color: "Grey",    size: "5×6",  pieces: 31, value: "$4,185",  account: "Quince" },
  { urgency: "CRITICAL",     sku: "HAMPOHAM-5NAT6090", collection: "HAMPO", color: "Natural", size: "6×9",  pieces: 17, value: "$2,040",  account: "Quince" },
];

interface OrderPlanRow {
  collection: string;
  rev25:      string;
  priority:   "HIGH" | "MEDIUM";
  why:        string;
  action:     string;
}

const ORDER_PLAN: OrderPlanRow[] = [
  { collection: "CHARS", rev25: "$481,992", priority: "HIGH",   why: "15% of all Quince revenue. Top SKU alone. $132K.",                     action: "Order full range. All sizes especially 8×10 Taupe."     },
  { collection: "ARCHE", rev25: "$363,845", priority: "HIGH",   why: "2,555 units sold in 2025. +162% Feb 2026.",                             action: "Order Rust colorway in all sizes. 8×10 + 5×8 + 9×12."  },
  { collection: "SIMBA", rev25: "$271,907", priority: "HIGH",   why: "High avg price ($261). Copper 8×10 = $78K alone.",                      action: "Order Copper in 8×10 + 9×12 priority."                  },
  { collection: "OLIVE", rev25: "$265,490", priority: "HIGH",   why: "+169% Feb 2026. Premium avg price ($276).",                             action: "Order Natural in 9×12 + 8×10."                          },
  { collection: "JAMES", rev25: "$238,540", priority: "HIGH",   why: "Consistent seller. 1,348 units in 2025.",                               action: "Reorder Sage 8×10 and all core sizes."                  },
  { collection: "CONTO", rev25: "$181,515", priority: "MEDIUM", why: "+97% Feb. Next-tier growth story.",                                     action: "Order 60–90 day window."                                },
  { collection: "PASHA", rev25: "$161,480", priority: "MEDIUM", why: "Lt Blue 8×10: 40 units in Jan 2026 alone.",                             action: "Lt Blue + Taupe in 8×10 + 9×12."                        },
  { collection: "ANDES", rev25: "$151,059", priority: "MEDIUM", why: "Premium price ($305 avg). Steady volume.",                              action: "Ivory in 7.9×9.9 + 8.9×11.9 sizes."                    },
  { collection: "WILLO", rev25: "$133,446", priority: "MEDIUM", why: "Very high avg price ($403). Lower volume but high value.",               action: "Order conservatively. Monitor sell-through."             },
  { collection: "COVE0", rev25: "$127,165", priority: "MEDIUM", why: "667 units in 2025. Steady.",                                            action: "Order standard range."                                  },
];

const STRATEGIC_INSIGHTS = [
  {
    title: "India Supply Chain — Act Now",
    body:  "96% of Quince volume is India hand-tufted and 22% is India hand-loomed. Lead times from India are typically 90–120 days. To have inventory in warehouse by June for peak season, orders must be placed by February–March at the latest. Any delays risk stockouts during Jul–Nov peak.",
  },
  {
    title: "Quince Forecast Discussion",
    body:  "Quince has no formal quarterly forecast relationship with Momeni yet. At $6.5M annual run rate, this is now critical. Schedule a planning call with Quince to get their 6-month demand forecast. Without it, Momeni is ordering blind for a $6M+ account.",
  },
  {
    title: "Concentration Risk — Plan B",
    body:  "Quince is approaching 20% of total Momeni revenue. If Quince reduces orders or delists SKUs, the impact is significant. Use the next 6 months to recover Williams Sonoma, Target, and Mackenzie Childs so the portfolio isn't dependent on one account.",
  },
];

// ─── What to Order content ────────────────────────────────────────────────────
function WhatToOrderContent() {
  const oos   = IMMEDIATE_ORDERS.filter((r) => r.urgency === "OUT OF STOCK");
  const crit  = IMMEDIATE_ORDERS.filter((r) => r.urgency === "CRITICAL");

  const tableRows = (rows: UrgencyRow[]) =>
    rows.map((row, i) => (
      <tr key={`${row.sku}-${i}`} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
        <td className="px-4 py-2.5">
          <span className={`text-xs font-bold ${row.urgency === "OUT OF STOCK" ? "text-red-600" : "text-amber-600"}`}>
            {row.urgency}
          </span>
        </td>
        <td className="px-4 py-2.5 font-mono text-xs text-foreground">{row.sku}</td>
        <td className="px-4 py-2.5 text-xs font-semibold text-foreground">{row.collection}</td>
        <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.color}</td>
        <td className="px-4 py-2.5 text-xs text-foreground">{row.size}</td>
        <td className="px-4 py-2.5 text-xs font-bold text-foreground">{row.pieces}</td>
        <td className="px-4 py-2.5 text-xs font-mono font-semibold text-foreground">{row.value}</td>
        <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.account}</td>
      </tr>
    ));

  return (
    <div className="p-6 lg:p-8 space-y-10">

      {/* ── Critical alert banner ── */}
      <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-5 py-4">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-red-700">
            9 HAMPO SKUs are OUT OF STOCK right now for Quince. 6 more are CRITICAL.
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            Total reorder needed: $89,030 across 652 pieces. This must be placed immediately to avoid losing the #1 fastest-growing account.
          </p>
        </div>
      </div>

      {/* ── 4 action horizon cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            horizon: "Order Now — Within 30 Days",
            value:   "$53,000",
            detail:  "15 SKUs — Out of Stock + Critical. Mainly HAMPO + TEPPE collections for Quince.",
            border:  "#dc2626",
            bg:      "#fef2f2",
          },
          {
            horizon: "Order — Within 60 Days",
            value:   "$23,000",
            detail:  "Top 5 Quince collections (CHARS, ARCHE, SIMBA, OLIVE, JAMES). Build stock before peak season starts.",
            border:  "#ea580c",
            bg:      "#fff7ed",
          },
          {
            horizon: "Order — Within 90 Days",
            value:   "$35,000",
            detail:  "Next-tier Quince collections (CONTO, PASHA, ANDES, WILLO, COVE0). Seasonal buffer for Jul–Nov peak.",
            border:  "#ca8a04",
            bg:      "#fefce8",
          },
          {
            horizon: "Plan — Next 6 Months",
            value:   "$80,000+",
            detail:  "Full Quince + Wayfair peak season stock. India hand-tufted 56% of Quince volume — long lead times.",
            border:  "#16a34a",
            bg:      "#f0fdf4",
          },
        ].map((card) => (
          <div
            key={card.horizon}
            className="rounded-lg border-l-4 p-5 shadow-sm"
            style={{ borderLeftColor: card.border, backgroundColor: card.bg, borderTop: "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: card.border }}>
              {card.horizon}
            </p>
            <p className="text-2xl font-bold text-foreground mb-2">{card.value}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{card.detail}</p>
          </div>
        ))}
      </div>

      {/* ── Immediate order table ── */}
      <div>
        <SectionHeading>IMMEDIATE — Order Right Now (Out of Stock &amp; Critical)</SectionHeading>
        <Card className="border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr style={{ backgroundColor: PRIMARY_DARK }}>
                  {["Urgency","SKU","Collection","Color","Size","Pieces Needed","Reorder Value","Account"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/75 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows(oos)}
                {tableRows(crit)}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── 60–90 Day Order Plan ── */}
      <div>
        <SectionHeading>60–90 Day Order Plan — Build Up for Peak Season (Jul–Nov)</SectionHeading>
        <Card className="border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr style={{ backgroundColor: PRIMARY_DARK }}>
                  {["Collection","2025 Quince Revenue","Priority","Why Order Now","Recommended Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/75 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ORDER_PLAN.map((row, i) => (
                  <tr key={row.collection} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                    <td className="px-4 py-3 font-bold text-foreground tracking-wide">{row.collection}</td>
                    <td className="px-4 py-3 font-mono text-foreground text-xs">{row.rev25}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold
                        ${row.priority === "HIGH"
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "bg-amber-100 text-amber-700 border border-amber-200"}`}>
                        {row.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[280px]">{row.why}</td>
                    <td className="px-4 py-3 text-xs text-foreground">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── 6-Month Strategic Order Plan ── */}
      <div>
        <SectionHeading>6-Month Strategic Order Plan</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STRATEGIC_INSIGHTS.map((s) => (
            <InsightCard key={s.title} title={s.title} body={s.body} />
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Loading overlay ──────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-32 text-muted-foreground">
      <div className="relative">
        <Loader2
          className="h-12 w-12 animate-spin"
          style={{ color: PRIMARY }}
        />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-foreground">Graphs are being generated</p>
        <p className="text-sm text-muted-foreground mt-1">Fetching data and building charts…</p>
      </div>
    </div>
  );
}

// ─── Placeholder tab ──────────────────────────────────────────────────────────
function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-32 text-muted-foreground">
      <BarChart2 className="h-10 w-10 opacity-20" />
      <p className="text-base font-semibold">{label}</p>
      <p className="text-sm">This section will be available in a future update.</p>
    </div>
  );
}

// ─── Dummy: Winners / Losers ──────────────────────────────────────────────────
const WINNERS: AccountRow[] = [
  { rank: 1, account: "Quince",      revenue: "$576,389", yoy: "+1,541%", isUp: true },
  { rank: 2, account: "Fred Meyer",  revenue: "$152,079", yoy: "+715%",   isUp: true },
  { rank: 3, account: "HG Buying",   revenue: "$121,530", yoy: "+259%",   isUp: true },
  { rank: 4, account: "Overstock",   revenue: "$141,411", yoy: "+46%",    isUp: true },
  { rank: 5, account: "Wayfair",     revenue: "$485,262", yoy: "+23%",    isUp: true },
  { rank: 6, account: "Rugs Direct", revenue: "$163,366", yoy: "+30%",    isUp: true },
];

const LOSERS: AccountRow[] = [
  { rank: 1, account: "Mackenzie Childs",   revenue: "$9,727",   yoy: "-75%", isUp: false },
  { rank: 2, account: "Target",             revenue: "$33,478",  yoy: "-60%", isUp: false },
  { rank: 3, account: "Williams Sonoma",    revenue: "$123,827", yoy: "-42%", isUp: false },
  { rank: 4, account: "Lulu & Georgia",     revenue: "$37,998",  yoy: "-22%", isUp: false },
  { rank: 5, account: "Walmart",            revenue: "$14,953",  yoy: "-19%", isUp: false },
  { rank: 6, account: "Nebraska Furn. Mart",revenue: "$4,739",   yoy: "-52%", isUp: false },
];

// ─── Dummy: Key Insights ──────────────────────────────────────────────────────
const INSIGHTS: InsightCardProps[] = [
  {
    title: "Quince Overtook Wayfair in February",
    body:  "For the first time, Quince ($576K) surpassed Wayfair ($485K) as Momeni's #1 revenue account in a single month. Quince did not exist as a customer in 2024. In 12 months it has become our most important growth driver.",
  },
  {
    title: "New Channels Opening Up",
    body:  "TJ Maxx.com ($23.6K), Marshalls.com ($14.2K), and Ramble Market ($34.3K) all had zero revenue in Feb 2025. These are brand new channels adding meaningful volume in 2026.",
  },
  {
    title: "Williams Sonoma & Target Are Declining",
    body:  "Williams Sonoma is down 42% and Target down 60% vs last February. These were historically top 5 accounts. Sales team should prioritize understanding why and recovering these relationships.",
  },
  {
    title: "Revenue Recovery on Track",
    body:  "After declining from a $32.3M peak in 2021 to $26.9M in 2024, full-year 2025 recovered to $28.5M. 2026 YTD pace (~$29M annualized) continues that recovery, led almost entirely by Quince.",
  },
];

// ─── Overview content ─────────────────────────────────────────────────────────
interface OverviewProps { appliedYear: string; appliedMonth: string }

function OverviewContent({ appliedYear, appliedMonth }: OverviewProps) {
  const ml   = getMonthLabel(appliedMonth).slice(0, 3).toUpperCase();
  const prev = +appliedYear - 1;
  const periodLabel = ml ? `${ml} ${appliedYear}` : appliedYear;

  const kpis: KpiCardProps[] = [
    {
      label:     `${periodLabel} Revenue`,
      value:     "$2.32M",
      trend:     `+43.7% vs ${ml} ${prev}`,
      trendType: "up",
      prevLabel: `${ml} ${prev} Revenue`,
      prevValue: "$1.61M",
    },
    {
      label:     `${periodLabel} Units Sold`,
      value:     "16,542",
      trend:     `+8.3% vs ${ml} ${prev}`,
      trendType: "up",
      prevLabel: `${ml} ${prev} Units`,
      prevValue: "15,274",
    },
    {
      label:     `${appliedYear} YTD Revenue (Jan–${ml || "Dec"})`,
      value:     "$4.88M",
      trend:     "On pace for ~$29.00M full year",
      trendType: "neutral",
      prevLabel: `${prev} YTD (Jan–${ml || "Dec"})`,
      prevValue: "$3.38M",
    },
    {
      label:     `Avg Revenue / Month (${appliedYear})`,
      value:     "$2.44M",
      trend:     `vs $2.38M / mo in ${prev}`,
      trendType: "up",
      prevLabel: `Avg / Month (${prev})`,
      prevValue: "$2.38M",
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-10">

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-6">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 1 – Revenue by Year */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2 px-6 pt-5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Revenue by Year
              <span className="ml-2 text-xs font-normal text-muted-foreground">(Full Year)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-5">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={REVENUE_BY_YEAR}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 93%)" vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: "hsl(210 20% 50%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${v.toFixed(0)}M`}
                  tick={{ fontSize: 11, fill: "hsl(210 20% 50%)" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 35]}
                  width={48}
                />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: "hsl(207 69% 46% / 0.06)" }} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={44}>
                  {REVENUE_BY_YEAR.map((entry) => (
                    <Cell
                      key={entry.year}
                      fill={entry.year === "2026 YTD" ? PRIMARY : PRIMARY_PALE}
                      fillOpacity={entry.year === "2026 YTD" ? 1 : 0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2 – Top 8 Accounts */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2 px-6 pt-5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Top 8 Accounts &mdash; {ml || "Full Year"} {appliedYear} Revenue
              <span className="ml-2 text-xs font-normal text-muted-foreground">($)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-5">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={TOP_ACCOUNTS}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 93%)" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={fmtAxis}
                  tick={{ fontSize: 10, fill: "hsl(210 20% 50%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="account"
                  width={88}
                  tick={{ fontSize: 11, fill: "hsl(210 20% 40%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<AccountsTooltip />}
                  cursor={{ fill: "hsl(207 69% 46% / 0.06)" }}
                />
                <Legend
                  iconType="square"
                  iconSize={10}
                  wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                />
                <Bar
                  dataKey="rev2026"
                  name={`${ml || "YTD"} ${appliedYear}`}
                  fill={PRIMARY}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={13}
                />
                <Bar
                  dataKey="rev2025"
                  name={`${ml || "YTD"} ${prev}`}
                  fill={PRIMARY_PALE}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={13}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* ── Account Winners & Losers ── */}
      <div>
        <SectionHeading>
          Account Winners &amp; Losers &mdash;{" "}
          {ml ? `${getMonthLabel(appliedMonth)} ${appliedYear} vs ${getMonthLabel(appliedMonth)} ${prev}` : `${appliedYear} vs ${prev}`}
        </SectionHeading>
        <div className="flex flex-col lg:flex-row gap-5">
          <WinnersLosersTable title="Biggest Winners" rows={WINNERS} isWinner={true} />
          <WinnersLosersTable title="Biggest Losers"  rows={LOSERS}  isWinner={false} />
        </div>
      </div>

      {/* ── Key Insights ── */}
      <div>
        <SectionHeading>Key Insights</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INSIGHTS.map((ins) => (
            <InsightCard key={ins.title} {...ins} />
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ExecutiveDashboard() {
  const navigate = useNavigate();

  const [user,        setUser]        = useState<UserResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Filter state
  const [selectedYear,    setSelectedYear]    = useState(String(CURRENT_YEAR));
  const [selectedMonth,   setSelectedMonth]   = useState("3"); // March = last full month before April
  const [selectedQuarter, setSelectedQuarter] = useState("");

  // Applied (what charts show)
  const [appliedYear,    setAppliedYear]    = useState(String(CURRENT_YEAR));
  const [appliedMonth,   setAppliedMonth]   = useState("3");
  const [appliedQuarter, setAppliedQuarter] = useState("");

  const [graphsLoading,  setGraphsLoading]  = useState(false);
  const [graphsReady,    setGraphsReady]    = useState(false);
  const [showDevNotice,  setShowDevNotice]  = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        setUser(u);
      } catch {
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  const fire = useCallback(() => {
    setAppliedYear(selectedYear);
    setAppliedMonth(selectedMonth);
    setAppliedQuarter(selectedQuarter);
    setGraphsReady(false);
    setGraphsLoading(true);
    setTimeout(() => { setGraphsLoading(false); setGraphsReady(true); }, 1500);
  }, [selectedYear, selectedMonth, selectedQuarter]);

  // Graphs start loading when the user dismisses the dev notice
  const dismissNotice = useCallback(() => {
    setShowDevNotice(false);
    fire();
  }, [fire]);

  const handleApply = () => fire();

  const handleYearChange = (v: string) => { setSelectedYear(v); setSelectedMonth(""); setSelectedQuarter(""); };
  const handleMonthChange   = (v: string) => { setSelectedMonth(v); setSelectedQuarter(""); };
  const handleQuarterChange = (v: string) => { setSelectedQuarter(v); setSelectedMonth(""); };

  // ── Auth loading ──
  if (authLoading) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // ── Access denied ──
  if (!user || user.role !== "executive") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
          <div className="rounded-full bg-muted p-4">
            <ShieldOff className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
              The Executive Dashboard is only available to users with the{" "}
              <span className="font-semibold text-violet-600">Executive</span> role.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/chat")}>
            Go to Chat with Database
          </Button>
        </div>
      </div>
    );
  }

  const { period, range } = buildSubtitle(appliedYear, appliedMonth, appliedQuarter);
  const lastUpdated = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Header />

      {/* ── Scrollable content area (header stays fixed above) ── */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">

      {/* ── Banner ── */}
      <div
        className="w-full px-6 lg:px-10 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={{
          background: `linear-gradient(135deg, ${PRIMARY_DARK} 0%, ${PRIMARY} 100%)`,
        }}
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BarChart2 className="h-5 w-5 text-white/80 shrink-0" />
            <h1 className="text-white text-xl font-bold tracking-tight">
              Executive Dashboard
            </h1>
          </div>
          <p className="text-white/65 text-sm pl-8">
            {period}&ensp;·&ensp;Data: {range}
          </p>
        </div>
        <Badge
          className="self-start sm:self-auto shrink-0 text-white border-white/30 bg-white/15 hover:bg-white/20 text-xs font-medium px-3 py-1"
          variant="outline"
        >
          Last updated: {lastUpdated}
        </Badge>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-background border-b border-border px-6 lg:px-10 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <Filter className="h-4 w-4 text-muted-foreground mb-2 shrink-0" />

          {/* Year */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Year
            </label>
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger className="h-9 w-[110px] text-sm">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {[...YEARS].reverse().map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Month
            </label>
            <Select
              value={selectedMonth}
              onValueChange={handleMonthChange}
              disabled={!selectedYear}
            >
              <SelectTrigger className="h-9 w-[150px] text-sm">
                <SelectValue placeholder={selectedYear ? "Select month" : "Choose year first"} />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quarter */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Quarter
            </label>
            <Select
              value={selectedQuarter}
              onValueChange={handleQuarterChange}
              disabled={!selectedYear}
            >
              <SelectTrigger className="h-9 w-[170px] text-sm">
                <SelectValue placeholder={selectedYear ? "Select quarter" : "Choose year first"} />
              </SelectTrigger>
              <SelectContent>
                {QUARTERS.map((q) => (
                  <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleApply}
            size="sm"
            className="h-9 px-5 text-sm font-semibold mb-0 self-end"
          >
            Apply Filters
          </Button>
        </div>
      </div>

      {/* ── Tabs + content ── */}
      <Tabs defaultValue="overview" className="flex flex-col">
        <div className="bg-background border-b border-border px-6 lg:px-10">
          <TabsList className="h-11 bg-transparent gap-0 rounded-none p-0 w-full justify-start">
            {[
              { value: "overview",      label: "Overview"           },
              { value: "accounts",      label: "Accounts"           },
              { value: "forecast",      label: "Forecast"           },
              { value: "collections",   label: "Collections & Sizes"},
              { value: "what-to-order", label: "What to Order"      },
            ].map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="
                  relative rounded-none h-11 px-5 text-sm font-medium
                  text-muted-foreground border-b-2 border-transparent
                  data-[state=active]:text-primary
                  data-[state=active]:[border-bottom-color:hsl(207_69%_46%)]
                  data-[state=active]:bg-transparent
                  data-[state=active]:shadow-none
                  hover:text-foreground transition-colors
                "
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Overview */}
        <TabsContent value="overview" className="m-0 p-0 data-[state=inactive]:hidden">
          {graphsLoading ? (
            <LoadingState />
          ) : graphsReady ? (
            <OverviewContent appliedYear={appliedYear} appliedMonth={appliedMonth} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-32 text-muted-foreground text-sm">
              <Filter className="h-8 w-8 opacity-20" />
              <p>
                Select filters and click{" "}
                <span className="font-semibold text-foreground">Apply Filters</span>{" "}
                to load the dashboard.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Accounts tab */}
        <TabsContent value="accounts" className="m-0 p-0 data-[state=inactive]:hidden">
          {graphsLoading ? (
            <LoadingState />
          ) : graphsReady ? (
            <AccountsContent appliedYear={appliedYear} appliedMonth={appliedMonth} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-32 text-muted-foreground text-sm">
              <Filter className="h-8 w-8 opacity-20" />
              <p>Select filters and click <span className="font-semibold text-foreground">Apply Filters</span> to load.</p>
            </div>
          )}
        </TabsContent>

        {/* Forecast tab */}
        <TabsContent value="forecast" className="m-0 p-0 data-[state=inactive]:hidden">
          {graphsLoading ? (
            <LoadingState />
          ) : graphsReady ? (
            <ForecastContent appliedYear={appliedYear} appliedMonth={appliedMonth} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-32 text-muted-foreground text-sm">
              <Filter className="h-8 w-8 opacity-20" />
              <p>Select filters and click <span className="font-semibold text-foreground">Apply Filters</span> to load.</p>
            </div>
          )}
        </TabsContent>

        {/* Collections & Sizes tab */}
        <TabsContent value="collections" className="m-0 p-0 data-[state=inactive]:hidden">
          {graphsLoading ? (
            <LoadingState />
          ) : graphsReady ? (
            <CollectionsContent appliedYear={appliedYear} appliedMonth={appliedMonth} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-32 text-muted-foreground text-sm">
              <Filter className="h-8 w-8 opacity-20" />
              <p>Select filters and click <span className="font-semibold text-foreground">Apply Filters</span> to load.</p>
            </div>
          )}
        </TabsContent>

        {/* What to Order tab */}
        <TabsContent value="what-to-order" className="m-0 p-0 data-[state=inactive]:hidden">
          {graphsLoading ? (
            <LoadingState />
          ) : graphsReady ? (
            <WhatToOrderContent />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-32 text-muted-foreground text-sm">
              <Filter className="h-8 w-8 opacity-20" />
              <p>Select filters and click <span className="font-semibold text-foreground">Apply Filters</span> to load.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>{/* end scrollable content area */}

      {/* ── Dev notice modal (rendered outside scroll container so it overlays everything) ── */}
      {showDevNotice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-border">
            <div className="flex items-center gap-3 px-5 pt-5 pb-4">
              <div className="rounded-full bg-amber-100 p-2 shrink-0">
                <Wrench className="h-4 w-4 text-amber-600" />
              </div>
              <p className="flex-1 text-base font-bold text-foreground">
                This is under development
              </p>
              <button
                onClick={dismissNotice}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mx-5 mb-5 rounded-lg bg-muted/60 border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Data shown is for demonstration purposes only.
                Contact the support team for any query or to report issues.
              </p>
            </div>
            <div className="px-5 pb-5">
              <Button
                onClick={dismissNotice}
                size="sm"
                className="w-full text-sm font-semibold"
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

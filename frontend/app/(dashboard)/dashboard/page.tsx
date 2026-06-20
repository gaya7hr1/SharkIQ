"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, TrendingUp, Clock, Sparkles, FolderKanban, BarChart2, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api-client";
import type { Startup, WorkflowRun, WorkflowResult } from "@/types";

interface StartupRunDetail {
  status: WorkflowRun["status"];
  score: number | null;
  decision: string | null;
  unicorn_prob: number | null;
}

export default function DashboardPage() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [startupRuns, setStartupRuns] = useState<Record<string, StartupRunDetail>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Compare Mode State
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelectStartup = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };


  useEffect(() => {
    api
      .get<Startup[]>("/startups")
      .then(async (data) => {
        setStartups(data);

        // Fetch latest workflow run and result for each startup in parallel
        const runsMap: Record<string, StartupRunDetail> = {};
        await Promise.all(
          data.map(async (s) => {
            try {
              const runs = await api.get<WorkflowRun[]>(`/workflow/startups/${s.id}/runs`);
              if (runs && runs.length > 0) {
                const latestRun = runs[0];
                if (latestRun) {
                  const result = await api.get<WorkflowResult>(`/workflow/${latestRun.id}`);
                  runsMap[s.id] = {
                    status: latestRun.status,
                    score: result.final_recommendation?.overall_score || null,
                    decision: result.final_recommendation?.decision || null,
                    unicorn_prob: result.unicorn_prediction?.unicorn_probability || null,
                  };
                }
              }
            } catch (err) {
              console.error("Failed to fetch run details for startup:", s.id, err);
            }
          })
        );
        setStartupRuns(runsMap);
      })
      .finally(() => setLoading(false));
  }, []);

  // Calculate Metrics
  const totalCount = startups.length;
  const processedRuns = Object.values(startupRuns).filter((r) => r.unicorn_prob !== null);
  const approvedDealsCount = Object.values(startupRuns).filter(
    (r) => r.status === "approved" || r.status === "completed"
  ).length;

  const pendingApprovals = Object.values(startupRuns).filter((r) => r.status === "paused_for_approval").length;

  const avgUnicorn =
    processedRuns.length > 0
      ? Math.round(processedRuns.reduce((acc, curr) => acc + (curr.unicorn_prob || 0), 0) / processedRuns.length)
      : 0;

  // Filter startups based on search query
  const filteredStartups = startups.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.industry && s.industry.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Prepare chart data (Unicorn Exit Probability)
  const chartData = startups
    .map((s) => {
      const run = startupRuns[s.id];
      return {
        name: s.name.length > 15 ? `${s.name.substring(0, 12)}…` : s.name,
        probability: run?.unicorn_prob ? Math.round(run.unicorn_prob) : 0,
      };
    })
    .filter((d) => d.probability > 0);

  const getDecisionBadge = (decision: string | null, status: string) => {
    if (status === "failed") {
      return <Badge variant="destructive">Run Failed</Badge>;
    }
    if (status === "paused_for_approval") {
      return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">Needs Review</Badge>;
    }
    if (!decision) {
      return <Badge variant="muted">Pending Run</Badge>;
    }

    switch (decision) {
      case "Strong Invest":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Strong Invest</Badge>;
      case "Invest with Caution":
        return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">Caution</Badge>;
      case "Monitor":
        return <Badge className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Monitor</Badge>;
      case "Reject":
        return <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30">Reject</Badge>;
      default:
        return <Badge variant="muted">{decision}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Deal Flow Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze startup pitches, review agent due diligence, and trigger investment decisions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedIds([]);
            }}
            variant="outline"
            className={`rounded-xl px-5 py-6 font-semibold border transition-all duration-300 ${
              compareMode
                ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                : "border-border/50 hover:bg-muted/50 text-foreground"
            }`}
          >
            {compareMode ? "Exit Compare Mode" : "Compare Mode"}
          </Button>
          <Button asChild className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/20 rounded-xl px-5 py-6">
            <Link href="/upload" className="flex items-center gap-2 font-semibold">
              <Plus className="h-5 w-5" /> Analyze Startup
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/40 hover:border-border/80 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Portfolio Pipeline</CardTitle>
            <FolderKanban className="h-5 w-5 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Startups uploaded</p>
          </CardContent>
        </Card>

        {/* KPI 2 */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/40 hover:border-border/80 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved Deals</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-gradient">{approvedDealsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Deals signed off by partners</p>
          </CardContent>
        </Card>

        {/* KPI 3 */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/40 hover:border-border/80 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Unicorn Chance</CardTitle>
            <Sparkles className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{avgUnicorn}%</div>
            <p className="text-xs text-muted-foreground mt-1">Multi-agent probability</p>
          </CardContent>
        </Card>

        {/* KPI 4 */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/40 hover:border-border/80 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Decisions</CardTitle>
            <Clock className="h-5 w-5 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-400">{pendingApprovals}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting human sign-off</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Chart & Search Container */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart Column */}
        <Card className="lg:col-span-2 bg-card/30 border-border/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-indigo-400" /> Unicorn Exit Probabilities (%)
              </CardTitle>
              <CardDescription>Multi-agent forecasting for $1B+ valuations</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[280px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 17, 26, 0.95)",
                      borderColor: "rgba(99, 102, 241, 0.2)",
                      borderRadius: "12px",
                      color: "#f8fafc",
                    }}
                  />
                  <Bar dataKey="probability" radius={[6, 6, 0, 0]} maxBarSize={30}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="url(#indigoPurpleGrad)" />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="indigoPurpleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#c084fc" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Run analysis on startups to populate chart.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions / Filters */}
        <Card className="bg-card/30 border-border/30 flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold">Search & Filtering</CardTitle>
            <CardDescription>Instantly query and locate pitches</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or industry…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/30 border-border/50 rounded-xl text-sm placeholder:text-muted-foreground"
              />
            </div>
            <div className="rounded-xl border border-border/40 p-4 bg-muted/10 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tips</p>
              <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                <li>Double click startup cards to open metrics pages.</li>
                <li>Filter by "Education" or "AI" to narrow down industries.</li>
                <li>Approve paused startups to download PDF reports.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Startups List / Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Active Pipeline</h2>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin text-indigo-400" />
            Loading startup registry…
          </div>
        )}

        {!loading && filteredStartups.length === 0 && (
          <Card className="border-dashed border-border/60 bg-transparent">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              {searchQuery ? "No startups matched your search query." : "No startups analyzed yet. Upload a deck to begin."}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStartups.map((s) => {
            const run = startupRuns[s.id];
            const hasScore = run?.score !== null && run?.score !== undefined;
            const scoreVal = hasScore ? Math.round(run.score!) : 0;
            const isSelected = selectedIds.includes(s.id);

            const cardMarkup = (
              <Card className={`glow-card h-full flex flex-col justify-between p-6 transition-all duration-300 relative ${
                compareMode
                  ? isSelected
                    ? "bg-indigo-600/10 border-indigo-500/40 ring-1 ring-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                    : "bg-card/20 border-border/30 opacity-70 hover:opacity-100 hover:border-border/60"
                  : "bg-card/30 border-border/30"
              } ${compareMode ? "cursor-pointer select-none" : ""}`}>
                {compareMode && (
                  <div className="absolute top-4 right-4 z-10 flex h-5 w-5 items-center justify-center rounded border border-border/60 bg-background/50 text-indigo-400">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="h-3.5 w-3.5 rounded border-border/50 text-indigo-600 focus:ring-0 bg-transparent cursor-pointer accent-indigo-600"
                    />
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    {/* Logo Avatar */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                      <span className="font-bold text-sm text-indigo-400 uppercase">
                        {s.name.substring(0, 2)}
                      </span>
                    </div>
                    {/* Status / Decision Badge */}
                    {getDecisionBadge(run?.decision || null, run?.status || "pending")}
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-foreground tracking-tight line-clamp-1">{s.name}</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      {s.industry ?? "Pending Extraction"} · {s.business_stage ?? "Pending Stage"}
                    </p>
                  </div>

                  {/* Display startup problem statement preview instead of overall score */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {s.problem_statement || "Factsheet parameters are pending extraction. Run the multi-agent committee analysis."}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/20 mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Uploaded {new Date(s.created_at).toLocaleDateString()}</span>
                  {run && run.unicorn_prob !== null && (
                    <span className="font-semibold text-purple-400">Unicorn: {run.unicorn_prob}%</span>
                  )}
                </div>
              </Card>
            );

            if (compareMode) {
              return (
                <div key={s.id} onClick={() => toggleSelectStartup(s.id)}>
                  {cardMarkup}
                </div>
              );
            }

            return (
              <Link key={s.id} href={`/startups/${s.id}`}>
                {cardMarkup}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Comparison Panel */}
      {compareMode && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-[90%] max-w-lg bg-card/90 backdrop-blur-md border border-indigo-500/20 rounded-2xl shadow-[0_10px_50px_rgba(99,102,241,0.2)] p-4 flex items-center justify-between animate-in slide-in-from-bottom duration-300">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Compare Mode</span>
            <span className="text-sm font-bold text-foreground">
              {selectedIds.length} of 3 startups selected
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setCompareMode(false);
                setSelectedIds([]);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              disabled={selectedIds.length < 2}
              asChild={selectedIds.length >= 2}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold px-4 py-2.5 disabled:opacity-40 shadow-md shadow-indigo-600/20"
            >
              {selectedIds.length >= 2 ? (
                <Link href={`/dashboard/compare?ids=${selectedIds.join(",")}`}>
                  Compare Now
                </Link>
              ) : (
                <span>Select 2 or 3</span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

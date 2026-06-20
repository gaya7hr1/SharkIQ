"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BarChart3, TrendingUp, Sparkles, Scale, AlertTriangle, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api-client";
import type { Startup, WorkflowRun, WorkflowResult } from "@/types";

interface ComparisonItem {
  startup: Startup;
  latestRun: WorkflowRun | null;
  result: WorkflowResult | null;
}

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids") || "";
  const ids = idsParam.split(",").filter((id) => id.trim() !== "");

  const [items, setItems] = useState<ComparisonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length < 2) {
      setError("Please select at least 2 startups to compare.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch startup and workflow details in parallel for all IDs
    Promise.all(
      ids.map(async (id) => {
        try {
          const startup = await api.get<Startup>(`/startups/${id}`);
          const runs = await api.get<WorkflowRun[]>(`/workflow/startups/${id}/runs`);
          const latestRun = runs[0] ?? null;

          let result: WorkflowResult | null = null;
          if (latestRun) {
            result = await api.get<WorkflowResult>(`/workflow/${latestRun.id}`);
          }

          return { startup, latestRun, result };
        } catch (err) {
          console.error("Failed to fetch data for startup id:", id, err);
          throw new Error("Failed to load details for some startups.");
        }
      })
    )
      .then((data) => {
        setItems(data);
      })
      .catch((err) => {
        setError(err.message || "An error occurred while loading the comparison matrix.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [idsParam]);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-sm text-muted-foreground gap-3 animate-pulse">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
        Generating side-by-side deal analysis matrix…
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="space-y-4 py-12 text-center max-w-md mx-auto">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Comparison Unavailable</h2>
        <p className="text-sm text-muted-foreground">{error ?? "No data could be loaded."}</p>
        <Button asChild className="rounded-xl mt-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  // Helper colors for startup columns
  const columnColors = [
    { text: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", fill: "#818cf8" },
    { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", fill: "#c084fc" },
    { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", fill: "#34d399" },
  ];

  // Compile Recharts grouped chart data (diligence scores)
  const chartData = [
    {
      name: "Market",
      ...items.reduce((acc, item, idx) => {
        acc[item.startup.name] = item.result?.market_analysis?.score || 0;
        return acc;
      }, {} as Record<string, number>),
    },
    {
      name: "Founder",
      ...items.reduce((acc, item, idx) => {
        acc[item.startup.name] = item.result?.founder_analysis?.score || 0;
        return acc;
      }, {} as Record<string, number>),
    },
    {
      name: "Financial",
      ...items.reduce((acc, item, idx) => {
        acc[item.startup.name] = item.result?.financial_analysis?.score || 0;
        return acc;
      }, {} as Record<string, number>),
    },
    {
      name: "Risk",
      ...items.reduce((acc, item, idx) => {
        acc[item.startup.name] = item.result?.risk_analysis?.score || 0;
        return acc;
      }, {} as Record<string, number>),
    },
  ];

  // Helper to format check sizes
  const getSimulatedCheckSizeSummary = (votes: any[] = []) => {
    const totalAmount = votes
      .filter((v) => v.decision === "INVEST")
      .reduce((sum, v) => sum + (v.suggested_investment_amount || 0), 0);
    return totalAmount > 0 ? `$${totalAmount.toLocaleString()}` : "$0";
  };

  const getVoteRatio = (votes: any[] = []) => {
    if (!votes || votes.length === 0) return "N/A";
    const invests = votes.filter((v) => v.decision === "INVEST").length;
    const passes = votes.filter((v) => v.decision === "PASS").length;
    return `${invests} INVEST / ${passes} PASS`;
  };

  const getDecisionBadge = (decision: string | null | undefined) => {
    if (!decision) return <Badge variant="muted">Not Evaluated</Badge>;
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" className="rounded-xl gap-2 text-muted-foreground hover:text-foreground">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" /> Back to Pipeline
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider bg-card border border-border/40 px-3 py-1.5 rounded-full">
          Deal-flow Comparison
        </span>
      </div>

      {/* Header Panel */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Startup Comparison Matrix</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Evaluating side-by-side core metrics and AI-driven due diligence for selected deal flows.
        </p>
      </div>

      {/* Grid of Headers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((item, idx) => {
          const color = columnColors[idx % columnColors.length] ?? columnColors[0]!;
          return (
            <Card key={item.startup.id} className={`bg-card/30 border-t-2 border-t-indigo-500/40 border-r-border/30 border-b-border/30 border-l-border/30 relative overflow-hidden flex flex-col justify-between p-6`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color.bg} border ${color.border}`}>
                    <span className={`font-bold text-sm ${color.text} uppercase`}>
                      {item.startup.name.substring(0, 2)}
                    </span>
                  </div>
                  {getDecisionBadge(item.result?.final_recommendation?.decision)}
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-foreground truncate">{item.startup.name}</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    {item.startup.industry || "Pending Industry"} · {item.startup.business_stage || "Pending Stage"}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-border/10 flex items-center justify-between text-xs text-muted-foreground">
                <span>Overall Score</span>
                <span className={`font-black text-lg ${color.text}`}>
                  {item.result?.final_recommendation?.overall_score
                    ? `${Math.round(item.result.final_recommendation.overall_score)}/100`
                    : "N/A"}
                </span>
              </div>
            </Card>
          );
        })}
        {/* Placeholder if less than 3 startups compared */}
        {items.length < 3 && (
          <Card className="border-dashed border-border/60 bg-transparent flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground min-h-[140px]">
            <span>Slot Empty</span>
            <p className="mt-1 max-w-[180px]">You can select up to 3 startups on the dashboard to compare.</p>
          </Card>
        )}
      </div>

      {/* Recharts Diligence Grouped Chart */}
      <Card className="bg-card/30 border-border/30">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-400" /> Diligence Component Scores Comparison
          </CardTitle>
          <CardDescription>Side-by-side component scores out of 100</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] pr-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
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
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
              {items.map((item, idx) => {
                const color = columnColors[idx % columnColors.length] ?? columnColors[0]!;
                return (
                  <Bar
                    key={item.startup.id}
                    dataKey={item.startup.name}
                    fill={color.fill}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Comparison Grid Matrix Table */}
      <Card className="bg-card/30 border-border/30 overflow-hidden">
        <CardHeader className="border-b border-border/20 bg-muted/5">
          <CardTitle className="text-base font-bold">Diligence Parameters Matrix</CardTitle>
          <CardDescription>Key investment evaluation factors and predictions</CardDescription>
        </CardHeader>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-border/20 bg-muted/10 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-4 px-6 w-1/4">Evaluation Parameter</th>
                {items.map((item, idx) => (
                  <th key={item.startup.id} className="py-4 px-6">
                    {item.startup.name}
                  </th>
                ))}
                {items.length < 3 && <th className="py-4 px-6" />}
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-border/10">
              {/* Row 1: Decision */}
              <tr className="hover:bg-muted/5">
                <td className="py-4 px-6 font-semibold text-muted-foreground">Investment Decision</td>
                {items.map((item) => (
                  <td key={item.startup.id} className="py-4 px-6">
                    {getDecisionBadge(item.result?.final_recommendation?.decision)}
                  </td>
                ))}
                {items.length < 3 && <td className="py-4 px-6" />}
              </tr>

              {/* Row 2: Overall Score */}
              <tr className="hover:bg-muted/5">
                <td className="py-4 px-6 font-semibold text-muted-foreground">Overall Blended Score</td>
                {items.map((item, idx) => {
                  const color = columnColors[idx % columnColors.length] ?? columnColors[0]!;
                  return (
                    <td key={item.startup.id} className={`py-4 px-6 font-bold ${color.text}`}>
                      {item.result?.final_recommendation?.overall_score
                        ? `${Math.round(item.result.final_recommendation.overall_score)}/100`
                        : "N/A"}
                    </td>
                  );
                })}
                {items.length < 3 && <td className="py-4 px-6" />}
              </tr>

              {/* Row 3: Funding Requirement */}
              <tr className="hover:bg-muted/5">
                <td className="py-4 px-6 font-semibold text-muted-foreground">Funding Ask</td>
                {items.map((item) => (
                  <td key={item.startup.id} className="py-4 px-6 font-medium text-foreground">
                    {item.startup.funding_requirement || "Pending Factsheet"}
                  </td>
                ))}
                {items.length < 3 && <td className="py-4 px-6" />}
              </tr>

              {/* Row 4: Unicorn exit */}
              <tr className="hover:bg-muted/5">
                <td className="py-4 px-6 font-semibold text-muted-foreground">Unicorn Exit Probability</td>
                {items.map((item) => (
                  <td key={item.startup.id} className="py-4 px-6 font-bold text-purple-400">
                    {item.result?.unicorn_prediction?.unicorn_probability !== undefined
                      ? `${Math.round(item.result.unicorn_prediction.unicorn_probability)}%`
                      : "N/A"}
                  </td>
                ))}
                {items.length < 3 && <td className="py-4 px-6" />}
              </tr>

              {/* Row 5: Series A exit */}
              <tr className="hover:bg-muted/5">
                <td className="py-4 px-6 font-semibold text-muted-foreground">Series A Probability</td>
                {items.map((item) => (
                  <td key={item.startup.id} className="py-4 px-6 font-semibold text-foreground">
                    {item.result?.unicorn_prediction?.series_a_funding_probability !== undefined
                      ? `${Math.round(item.result.unicorn_prediction.series_a_funding_probability)}%`
                      : "N/A"}
                  </td>
                ))}
                {items.length < 3 && <td className="py-4 px-6" />}
              </tr>

              {/* Row 6: Survival exit */}
              <tr className="hover:bg-muted/5">
                <td className="py-4 px-6 font-semibold text-muted-foreground">18-Month Survival Chance</td>
                {items.map((item) => (
                  <td key={item.startup.id} className="py-4 px-6 font-semibold text-foreground">
                    {item.result?.unicorn_prediction?.startup_survival_probability !== undefined
                      ? `${Math.round(item.result.unicorn_prediction.startup_survival_probability)}%`
                      : "N/A"}
                  </td>
                ))}
                {items.length < 3 && <td className="py-4 px-6" />}
              </tr>

              {/* Row 7: Votes */}
              <tr className="hover:bg-muted/5">
                <td className="py-4 px-6 font-semibold text-muted-foreground">simulated Partner Votes</td>
                {items.map((item) => (
                  <td key={item.startup.id} className="py-4 px-6 font-medium text-foreground">
                    {getVoteRatio(item.result?.committee_votes)}
                  </td>
                ))}
                {items.length < 3 && <td className="py-4 px-6" />}
              </tr>

              {/* Row 8: Cumulative check size */}
              <tr className="hover:bg-muted/5">
                <td className="py-4 px-6 font-semibold text-muted-foreground">Suggested Check Allocation</td>
                {items.map((item) => (
                  <td key={item.startup.id} className="py-4 px-6 font-bold text-emerald-400">
                    {getSimulatedCheckSizeSummary(item.result?.committee_votes)}
                  </td>
                ))}
                {items.length < 3 && <td className="py-4 px-6" />}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Side-by-Side Factsheet Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight">Qualitative Analysis Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item, idx) => {
            const color = columnColors[idx % columnColors.length] ?? columnColors[0]!;
            return (
              <Card key={item.startup.id} className="bg-card/20 border-border/20 p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-5">
                  <div className="border-b border-border/10 pb-2">
                    <h3 className="font-extrabold text-lg text-foreground">{item.startup.name}</h3>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">Qualitative Parameters</span>
                  </div>

                  {/* Problem statement */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Problem Statement</span>
                    <p className="text-xs text-foreground/90 leading-relaxed line-clamp-4">
                      {item.startup.problem_statement || "Pending extraction."}
                    </p>
                  </div>

                  {/* Solution */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Solution</span>
                    <p className="text-xs text-foreground/90 leading-relaxed line-clamp-4">
                      {item.startup.solution || "Pending extraction."}
                    </p>
                  </div>

                  {/* Target Audience */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Target Audience</span>
                    <p className="text-xs text-foreground/90 leading-relaxed line-clamp-2">
                      {item.startup.target_audience || "Pending extraction."}
                    </p>
                  </div>

                  {/* Revenue Model */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revenue Model</span>
                    <p className="text-xs text-foreground/90 leading-relaxed line-clamp-2">
                      {item.startup.revenue_model || "Pending extraction."}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/10 text-xs text-muted-foreground flex items-center justify-between">
                  <span>Diligence Status</span>
                  <span className={`font-semibold ${color.text}`}>
                    {item.latestRun?.status === "completed" || item.latestRun?.status === "approved"
                      ? "Fully Diligenced"
                      : item.latestRun?.status === "paused_for_approval"
                      ? "Awaiting Sign-off"
                      : "Pending Run"}
                  </span>
                </div>
              </Card>
            );
          })}
          {items.length < 3 && (
            <Card className="border-dashed border-border/60 bg-transparent flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground min-h-[200px]">
              <span>Slot Empty</span>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="flex h-96 flex-col items-center justify-center text-sm text-muted-foreground gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
        Loading...
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}

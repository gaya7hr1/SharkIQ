"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, TrendingUp, ShieldAlert, Sparkles, FileText, CheckCircle2, XCircle, AlertTriangle, MessageSquare, Send, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, api } from "@/lib/api-client";
import type {
  FinalRecommendation,
  Startup,
  WorkflowResult,
  WorkflowRun,
} from "@/types";

const DECISION_VARIANT: Record<FinalRecommendation["decision"], "success" | "warning" | "muted" | "destructive"> = {
  "Strong Invest": "success",
  "Invest with Caution": "warning",
  Monitor: "muted",
  Reject: "destructive",
};

const STATUS_VARIANT: Record<WorkflowRun["status"], "success" | "warning" | "muted" | "destructive"> = {
  pending: "muted",
  running: "muted",
  paused_for_approval: "warning",
  approved: "success",
  rejected: "destructive",
  reanalyzing: "warning",
  completed: "success",
  failed: "destructive",
};

const SEVERITY_VARIANT: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
};

function ScoreBlock({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-indigo-400">{score}/100</span>
      </div>
      <Progress value={score} className="h-2 bg-muted/40" />
    </div>
  );
}

function HighlightBlock({ title, items, isWeakness = false }: { title: string; items: string[]; isWeakness?: boolean }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-sm ${
              isWeakness
                ? "bg-rose-500/5 border-rose-500/10 text-rose-200"
                : "bg-emerald-500/5 border-emerald-500/10 text-emerald-200"
            }`}
          >
            {isWeakness ? (
              <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StartupDetailPage() {
  const params = useParams<{ id: string }>();
  const startupId = params.id;
  const router = useRouter();

  const [startup, setStartup] = useState<Startup | null>(null);
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  // Chat Drawer State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [selectedVote, setSelectedVote] = useState<any | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const openChat = (vote: any) => {
    setSelectedPartner(vote.investor_type);
    setSelectedVote(vote);
    setIsChatOpen(true);
    setChatError(null);
    setChatMessage("");
    const partnerName = vote.investor_type.charAt(0).toUpperCase() + vote.investor_type.slice(1);
    setChatHistory([
      {
        role: "assistant",
        content: `Hello! I am the ${partnerName} Partner. I voted ${vote.decision} during our committee review of ${startup?.name}.\n\nReasoning: ${vote.reasoning}`
      }
    ]);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatMessage.trim() || !selectedPartner || !run) return;

    const userMsg = chatMessage.trim();
    setChatMessage("");
    setChatLoading(true);
    setChatError(null);

    // Append user message immediately
    setChatHistory(prev => [...prev, { role: "user", content: userMsg }]);

    try {
      const res = await api.post<{ reply: string }>(`/workflow/${run.id}/committee/chat`, {
        investor_type: selectedPartner,
        message: userMsg,
        history: chatHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      });

      setChatHistory(prev => [...prev, { role: "assistant", content: res.reply }]);
    } catch (err) {
      setChatError(err instanceof ApiError ? err.message : "Failed to get reply from partner.");
    } finally {
      setChatLoading(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startupData = await api.get<Startup>(`/startups/${startupId}`);
      setStartup(startupData);

      const runs = await api.get<WorkflowRun[]>(`/workflow/startups/${startupId}/runs`);
      const latest = runs[0] ?? null;
      setRun(latest);

      if (latest) {
        const resultData = await api.get<WorkflowResult>(`/workflow/${latest.id}`);
        setResult(resultData);
      } else {
        setResult(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load startup");
    } finally {
      setLoading(false);
    }
  }, [startupId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStartAnalysis() {
    setActionPending(true);
    setError(null);
    try {
      const newRun = await api.post<WorkflowRun>(`/workflow/startups/${startupId}/start`);
      setRun(newRun);
      const resultData = await api.get<WorkflowResult>(`/workflow/${newRun.id}`);
      setResult(resultData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start analysis");
    } finally {
      setActionPending(false);
    }
  }



  const getDecisionBadge = (decision: FinalRecommendation["decision"]) => {
    switch (decision) {
      case "Strong Invest":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold px-3 py-1">Strong Invest</Badge>;
      case "Invest with Caution":
        return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold px-3 py-1">Caution</Badge>;
      case "Monitor":
        return <Badge className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-semibold px-3 py-1">Monitor</Badge>;
      case "Reject":
        return <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold px-3 py-1">Reject</Badge>;
    }
  };

  const getStatusBadge = (status: WorkflowRun["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Completed</Badge>;
      case "paused_for_approval":
        return <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20">Needs Sign-off</Badge>;
      case "failed":
        return <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20">Failed</Badge>;
      case "running":
        return <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">Running</Badge>;
      default:
        return <Badge variant="muted">{status.replaceAll("_", " ")}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
        Retrieving startup due-diligence data…
      </div>
    );
  }

  if (!startup) {
    return <p className="text-sm text-destructive">{error ?? "Startup not found"}</p>;
  }

  const final = result?.final_recommendation ?? null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back to Pipeline */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Pipeline
      </Link>

      {/* Header Info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight">{startup.name}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {startup.industry ?? "Pending Extraction"} · {startup.business_stage ?? "Pending Stage"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {run && getStatusBadge(run.status)}
          {final && getDecisionBadge(final.decision)}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Profile Overview (Extracted Info) */}
      {result?.startup_summary && (
        <Card className="bg-card/40 border-border/40">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-muted-foreground">Startup Factsheet</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Problem Statement</span>
              <p className="text-foreground leading-relaxed">{result.startup_summary.problem_statement}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Solution</span>
              <p className="text-foreground leading-relaxed">{result.startup_summary.solution}</p>
            </div>
            {result.startup_summary.target_audience && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Target Audience</span>
                <p className="text-foreground leading-relaxed">{result.startup_summary.target_audience}</p>
              </div>
            )}
            {result.startup_summary.revenue_model && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Revenue & Funding Ask</span>
                <p className="text-foreground leading-relaxed">
                  {result.startup_summary.revenue_model} {result.startup_summary.funding_requirement && `(${result.startup_summary.funding_requirement})`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Start Analysis Callout */}
      {!run && (
        <Card className="border-dashed border-border/60 bg-transparent text-center py-10">
          <CardHeader>
            <CardTitle>No Analysis Report Available</CardTitle>
            <CardDescription>Run the multi-agent AI investment committee on this startup's documents.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={handleStartAnalysis} disabled={actionPending} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-6 py-5">
              {actionPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Working…
                </>
              ) : (
                "Trigger Due Diligence"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Committee Scoreboard (If recommendation exists) */}
      {final && (
        <Card className="w-full bg-card/40 border-border/40 flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-400" /> Synthesis & Recommendation Reasoning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Committee Decision:</span>
              {getDecisionBadge(final.decision)}
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">{final.reasoning}</p>
            
            {run?.status === "completed" && (
              <Button asChild className="bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 border border-indigo-500/20 rounded-xl px-5 w-fit">
                <Link href={`/startups/${startupId}/report`} className="flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4" /> Download PDF Report
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}



      {/* Analysis Tabs */}
      {result && (
        <Tabs defaultValue="market" className="mt-8">
          <TabsList className="bg-muted/50 border border-border/40 p-1 rounded-xl flex w-fit overflow-x-auto">
            <TabsTrigger value="market" className="rounded-lg text-xs font-semibold px-4 py-2">Market</TabsTrigger>
            <TabsTrigger value="founder" className="rounded-lg text-xs font-semibold px-4 py-2">Founder</TabsTrigger>
            <TabsTrigger value="financial" className="rounded-lg text-xs font-semibold px-4 py-2">Financial</TabsTrigger>
            <TabsTrigger value="risk" className="rounded-lg text-xs font-semibold px-4 py-2">Risk</TabsTrigger>
            <TabsTrigger value="unicorn" className="rounded-lg text-xs font-semibold px-4 py-2">Unicorn</TabsTrigger>
            <TabsTrigger value="committee" className="rounded-lg text-xs font-semibold px-4 py-2">Committee Votes</TabsTrigger>
          </TabsList>

          {/* Market Tab */}
          <TabsContent value="market" className="mt-4">
            {result.market_analysis ? (
              <Card className="bg-card/30 border-border/30">
                <CardContent className="flex flex-col gap-6 pt-6">
                  <ScoreBlock label="Market Size & Industry Dynamics" score={result.market_analysis.score} />
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Opportunity Analysis</span>
                    <p className="text-sm text-foreground/90 leading-relaxed">{result.market_analysis.market_opportunity}</p>
                  </div>
                  <HighlightBlock title="Market Strengths" items={result.market_analysis.strengths} />
                  <HighlightBlock title="Market Weaknesses / Threats" items={result.market_analysis.weaknesses} isWeakness />
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Not yet analyzed.</p>
            )}
          </TabsContent>

          {/* Founder Tab */}
          <TabsContent value="founder" className="mt-4">
            {result.founder_analysis ? (
              <Card className="bg-card/30 border-border/30">
                <CardContent className="flex flex-col gap-6 pt-6">
                  <ScoreBlock label="Founder & Executive Capability" score={result.founder_analysis.score} />
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Execution Capability</span>
                    <p className="text-sm text-foreground/90 leading-relaxed">{result.founder_analysis.execution_capability}</p>
                  </div>
                  <HighlightBlock title="Founder Strengths" items={result.founder_analysis.strengths} />
                  <HighlightBlock title="Founder Weaknesses" items={result.founder_analysis.weaknesses} isWeakness />
                  
                  {result.founder_analysis.communication_sentiment_label && (
                    <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 text-xs text-muted-foreground/90 flex items-center justify-between">
                      <span>Founder communication sentiment crosscheck (Hugging Face Hub model)</span>
                      <Badge className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase font-bold">
                        {result.founder_analysis.communication_sentiment_label} ({Math.round((result.founder_analysis.communication_sentiment_score ?? 0) * 100)}%)
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Not yet analyzed.</p>
            )}
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="mt-4">
            {result.financial_analysis ? (
              <Card className="bg-card/30 border-border/30">
                <CardContent className="flex flex-col gap-6 pt-6">
                  <ScoreBlock label="Financial Architecture & Scalability" score={result.financial_analysis.score} />
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Revenue Model & Potential</span>
                    <p className="text-sm text-foreground/90 leading-relaxed">{result.financial_analysis.profitability_potential}</p>
                  </div>
                  <HighlightBlock title="Financial Strengths" items={result.financial_analysis.financial_strengths} />
                  <HighlightBlock title="Investment Concerns" items={result.financial_analysis.investment_concerns} isWeakness />
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Not yet analyzed.</p>
            )}
          </TabsContent>

          {/* Risk Tab */}
          <TabsContent value="risk" className="mt-4">
            {result.risk_analysis ? (
              <Card className="bg-card/30 border-border/30">
                <CardContent className="flex flex-col gap-6 pt-6">
                  <ScoreBlock label="Risk Score (higher score = lower risk)" score={result.risk_analysis.score} />
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Critical Risks Breakdown</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.risk_analysis.critical_risks.map((risk, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-border/30 bg-muted/10 p-4 transition-colors hover:border-border/60">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-foreground">{risk.category}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{risk.description}</p>
                          </div>
                          <Badge className={`${SEVERITY_VARIANT[risk.severity] || "bg-muted text-muted-foreground"} border font-bold capitalize`}>
                            {risk.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Not yet analyzed.</p>
            )}
          </TabsContent>

          {/* Unicorn Predictor Tab */}
          <TabsContent value="unicorn" className="mt-4">
            {result.unicorn_prediction ? (
              <Card className="bg-card/30 border-border/30">
                <CardContent className="flex flex-col gap-6 pt-6">
                  <h3 className="text-base font-bold flex items-center gap-2 text-gradient">
                    <Sparkles className="h-5 w-5 text-purple-400" /> Unicorn Predictor Outcomes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-muted/15 border-border/20 p-4">
                      <ScoreBlock label="Survival Probability" score={Math.round(result.unicorn_prediction.startup_survival_probability)} />
                    </Card>
                    <Card className="bg-muted/15 border-border/20 p-4">
                      <ScoreBlock label="Series A Probability" score={Math.round(result.unicorn_prediction.series_a_funding_probability)} />
                    </Card>
                    <Card className="bg-muted/15 border-border/20 p-4">
                      <ScoreBlock label="Unicorn Chance" score={Math.round(result.unicorn_prediction.unicorn_probability)} />
                    </Card>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-muted-foreground uppercase">AI Evaluation Basis</span>
                    <p className="text-sm text-foreground/90 leading-relaxed">{result.unicorn_prediction.reasoning}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">{result.unicorn_prediction.disclaimer}</p>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Not yet analyzed.</p>
            )}
          </TabsContent>

          {/* Committee Votes Tab */}
          <TabsContent value="committee" className="mt-4">
            {result.committee_votes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.committee_votes.map((vote, i) => (
                  <Card key={i} className="bg-card/30 border-border/30 flex flex-col justify-between">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <CardTitle className="text-sm font-bold capitalize text-foreground">{vote.investor_type} Partner</CardTitle>
                      <Badge className={vote.decision === "INVEST" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-muted text-muted-foreground border border-border/60"}>
                        {vote.decision}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
                      <p className="text-xs text-muted-foreground leading-relaxed">{vote.reasoning}</p>
                      
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/20 pt-3">
                        {vote.decision === "INVEST" ? (
                          <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[10px] text-emerald-400 font-semibold">
                            Proposed: ${vote.suggested_investment_amount.toLocaleString()} for {vote.suggested_equity_pct}% equity
                          </div>
                        ) : (
                          <div />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openChat(vote)}
                          className="h-8 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 gap-1.5 font-medium ml-auto transition-all"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Chat
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Committee has not voted yet.</p>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Chat Drawer Overlay */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsChatOpen(false)}
          />
          <div className="relative w-full max-w-lg md:w-[480px] h-full bg-card/90 backdrop-blur-md border-l border-border/40 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-border/40 flex items-center justify-between bg-card/40">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white capitalize ${
                  selectedPartner === "technology" ? "bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]" :
                  selectedPartner === "financial" ? "bg-emerald-600 shadow-[0_0_10px_rgba(5,150,105,0.5)]" :
                  selectedPartner === "market" ? "bg-violet-600 shadow-[0_0_10px_rgba(124,58,237,0.5)]" :
                  selectedPartner === "risk" ? "bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.5)]" :
                  "bg-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.5)]"
                }`}>
                  {selectedPartner?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-foreground capitalize text-sm">{selectedPartner} Partner</h3>
                  <p className="text-[10px] text-muted-foreground">Active Committee Member</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedVote && (
                  <Badge className={selectedVote.decision === "INVEST" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]" : "bg-muted text-muted-foreground border border-border/60 text-[10px]"}>
                    {selectedVote.decision}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10"
                  onClick={() => setIsChatOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/10">
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-none border border-indigo-500/20"
                        : "bg-muted/50 backdrop-blur-sm text-foreground rounded-tl-none border border-border/30"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {chatLoading && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-muted/50 backdrop-blur-sm text-foreground rounded-2xl rounded-tl-none px-4 py-2.5 border border-border/30 shadow-sm max-w-[85%] flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                    <span className="text-[10px] text-muted-foreground">Partner is thinking...</span>
                  </div>
                </div>
              )}
              
              {chatError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{chatError}</span>
                </div>
              )}
            </div>

            {/* Footer Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-border/40 bg-card/60 backdrop-blur-md flex items-center gap-2">
              <input
                type="text"
                placeholder={`Ask ${selectedPartner} Partner a question...`}
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                disabled={chatLoading}
                className="flex-1 h-9 px-3 rounded-lg bg-background/50 border border-border/40 text-xs placeholder:text-muted-foreground text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 disabled:opacity-50"
              />
              <Button
                type="submit"
                size="sm"
                disabled={chatLoading || !chatMessage.trim()}
                className="h-9 w-9 p-0 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50 shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

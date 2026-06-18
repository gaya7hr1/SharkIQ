"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

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

const SEVERITY_VARIANT: Record<string, "muted" | "warning" | "destructive"> = {
  low: "muted",
  medium: "warning",
  high: "warning",
  critical: "destructive",
};

function ScoreBlock({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{score}/100</span>
      </div>
      <Progress value={score} className="mt-1" />
    </div>
  );
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function StartupDetailPage() {
  const params = useParams<{ id: string }>();
  const startupId = params.id;

  const [startup, setStartup] = useState<Startup | null>(null);
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [feedback, setFeedback] = useState("");

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

  async function handleApproval(action: "approve" | "reject" | "request_reanalysis") {
    if (!run) return;
    setActionPending(true);
    setError(null);
    try {
      const resultData = await api.post<WorkflowResult>(`/workflow/${run.id}/approval`, {
        action,
        feedback: feedback.trim() || null,
      });
      setResult(resultData);
      setRun(resultData.run);
      setFeedback("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit decision");
    } finally {
      setActionPending(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!startup) {
    return <p className="text-sm text-destructive">{error ?? "Startup not found"}</p>;
  }

  const final = result?.final_recommendation ?? null;
  const isPendingApproval = run?.status === "paused_for_approval";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{startup.name}</h1>
          <p className="text-sm text-muted-foreground">
            {startup.industry ?? "Industry pending extraction"} · {startup.business_stage ?? "Stage pending extraction"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {run && <Badge variant={STATUS_VARIANT[run.status]}>{run.status.replaceAll("_", " ")}</Badge>}
          {final && <Badge variant={DECISION_VARIANT[final.decision]}>{final.decision}</Badge>}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {!run && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>No analysis yet</CardTitle>
            <CardDescription>Run the AI investment committee on this startup's uploaded documents.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleStartAnalysis} disabled={actionPending}>
              {actionPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Start analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {final && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Final recommendation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ScoreBlock label="Overall score" score={Math.round(final.overall_score)} />
            <p className="text-sm">{final.reasoning}</p>
            {final.human_decision && (
              <p className="text-xs text-muted-foreground">Human decision: {final.human_decision}</p>
            )}
            {run?.status === "completed" && (
              <Button asChild variant="outline" className="w-fit">
                <Link href={`/startups/${startupId}/report`}>View report</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {isPendingApproval && (
        <Card className="mt-6 border-warning/40">
          <CardHeader>
            <CardTitle>Human approval required</CardTitle>
            <CardDescription>
              {result?.pending_approval_payload?.message ?? "Review the committee's recommendation below."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <textarea
              className="min-h-20 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Optional feedback (used for re-analysis context)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="success" disabled={actionPending} onClick={() => handleApproval("approve")}>
                Approve
              </Button>
              <Button variant="destructive" disabled={actionPending} onClick={() => handleApproval("reject")}>
                Reject
              </Button>
              <Button variant="outline" disabled={actionPending} onClick={() => handleApproval("request_reanalysis")}>
                Request re-analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Tabs defaultValue="market" className="mt-8">
          <TabsList>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="founder">Founder</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="risk">Risk</TabsTrigger>
            <TabsTrigger value="unicorn">Unicorn predictor</TabsTrigger>
            <TabsTrigger value="committee">Committee</TabsTrigger>
          </TabsList>

          <TabsContent value="market">
            {result.market_analysis ? (
              <Card>
                <CardContent className="flex flex-col gap-4 pt-6">
                  <ScoreBlock label="Market score" score={result.market_analysis.score} />
                  <p className="text-sm">{result.market_analysis.market_opportunity}</p>
                  <BulletList title="Strengths" items={result.market_analysis.strengths} />
                  <BulletList title="Weaknesses" items={result.market_analysis.weaknesses} />
                  <BulletList title="Opportunities" items={result.market_analysis.opportunities} />
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Not yet analyzed.</p>
            )}
          </TabsContent>

          <TabsContent value="founder">
            {result.founder_analysis ? (
              <Card>
                <CardContent className="flex flex-col gap-4 pt-6">
                  <ScoreBlock label="Founder score" score={result.founder_analysis.score} />
                  <p className="text-sm">{result.founder_analysis.execution_capability}</p>
                  <BulletList title="Strengths" items={result.founder_analysis.strengths} />
                  <BulletList title="Weaknesses" items={result.founder_analysis.weaknesses} />
                  {result.founder_analysis.communication_sentiment_label && (
                    <p className="text-xs text-muted-foreground">
                      Communication sentiment (Hugging Face Hub cross-check):{" "}
                      <span className="font-medium capitalize">
                        {result.founder_analysis.communication_sentiment_label.toLowerCase()}
                      </span>{" "}
                      ({Math.round((result.founder_analysis.communication_sentiment_score ?? 0) * 100)}% confidence)
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Not yet analyzed.</p>
            )}
          </TabsContent>

          <TabsContent value="financial">
            {result.financial_analysis ? (
              <Card>
                <CardContent className="flex flex-col gap-4 pt-6">
                  <ScoreBlock label="Financial score" score={result.financial_analysis.score} />
                  <p className="text-sm">{result.financial_analysis.profitability_potential}</p>
                  <BulletList title="Strengths" items={result.financial_analysis.financial_strengths} />
                  <BulletList title="Concerns" items={result.financial_analysis.investment_concerns} />
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Not yet analyzed.</p>
            )}
          </TabsContent>

          <TabsContent value="risk">
            {result.risk_analysis ? (
              <Card>
                <CardContent className="flex flex-col gap-4 pt-6">
                  <ScoreBlock label="Risk score (higher = safer)" score={result.risk_analysis.score} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Critical risks
                    </p>
                    <div className="mt-2 flex flex-col gap-2">
                      {result.risk_analysis.critical_risks.map((risk, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
                          <div>
                            <p className="text-sm font-medium">{risk.category}</p>
                            <p className="text-sm text-muted-foreground">{risk.description}</p>
                          </div>
                          <Badge variant={SEVERITY_VARIANT[risk.severity] ?? "muted"}>{risk.severity}</Badge>
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

          <TabsContent value="unicorn">
            {result.unicorn_prediction ? (
              <Card>
                <CardContent className="flex flex-col gap-4 pt-6">
                  <ScoreBlock label="Survival probability" score={result.unicorn_prediction.startup_survival_probability} />
                  <ScoreBlock label="Series A probability" score={result.unicorn_prediction.series_a_funding_probability} />
                  <ScoreBlock label="Unicorn probability" score={result.unicorn_prediction.unicorn_probability} />
                  <p className="text-sm">{result.unicorn_prediction.reasoning}</p>
                  <p className="text-xs text-muted-foreground">{result.unicorn_prediction.disclaimer}</p>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Not yet analyzed.</p>
            )}
          </TabsContent>

          <TabsContent value="committee">
            {result.committee_votes.length > 0 ? (
              <div className="flex flex-col gap-3">
                {result.committee_votes.map((vote, i) => (
                  <Card key={i}>
                    <CardContent className="flex items-start justify-between gap-4 pt-6">
                      <div>
                        <p className="text-sm font-medium capitalize">{vote.investor_type} investor</p>
                        <p className="mt-1 text-sm text-muted-foreground">{vote.reasoning}</p>
                        {vote.decision === "INVEST" && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Suggested: ${vote.suggested_investment_amount.toLocaleString()} for{" "}
                            {vote.suggested_equity_pct}% equity
                          </p>
                        )}
                      </div>
                      <Badge variant={vote.decision === "INVEST" ? "success" : "muted"}>{vote.decision}</Badge>
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
    </div>
  );
}

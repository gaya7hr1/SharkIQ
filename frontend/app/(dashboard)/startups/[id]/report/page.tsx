"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, api, downloadReport } from "@/lib/api-client";
import type { FinalRecommendation, Startup, WorkflowResult, WorkflowRun } from "@/types";

const DECISION_VARIANT: Record<FinalRecommendation["decision"], "success" | "warning" | "muted" | "destructive"> = {
  "Strong Invest": "success",
  "Invest with Caution": "warning",
  Monitor: "muted",
  Reject: "destructive",
};

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const startupId = params.id;

  const [startup, setStartup] = useState<Startup | null>(null);
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

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
        setResult(await api.get<WorkflowResult>(`/workflow/${latest.id}`));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [startupId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDownload() {
    if (!run || !startup) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadReport(run.id, `${startup.name.replace(/\s+/g, "_")}_report.pdf`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to download report");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!startup) return <p className="text-sm text-destructive">{error ?? "Startup not found"}</p>;

  const final = result?.final_recommendation ?? null;
  const isCompleted = run?.status === "completed";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">{startup.name} — Report</h1>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {!isCompleted && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Report not ready</CardTitle>
            <CardDescription>
              The report is generated once a workflow run completes (i.e. after a "Strong Invest" decision is
              approved). Current status: {run?.status.replaceAll("_", " ") ?? "no analysis started"}.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {isCompleted && final && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Final recommendation</CardTitle>
              <Badge variant={DECISION_VARIANT[final.decision]}>{final.decision}</Badge>
            </div>
            <CardDescription>Overall score: {Math.round(final.overall_score)}/100</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm">{final.reasoning}</p>
            <Button onClick={handleDownload} disabled={downloading} className="w-fit">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download PDF report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

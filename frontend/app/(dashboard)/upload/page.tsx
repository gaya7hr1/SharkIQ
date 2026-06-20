"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Building2, UploadCloud, PlayCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentUploadRow } from "@/components/upload/DocumentUploadRow";
import { ApiError, api } from "@/lib/api-client";
import type { DocumentType, Startup } from "@/types";

export default function UploadPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [startup, setStartup] = useState<Startup | null>(null);
  const [uploadedTypes, setUploadedTypes] = useState<Set<DocumentType>>(new Set());
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const created = await api.post<Startup>("/startups", { name });
      setStartup(created);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create startup");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpload(file: File, docType: DocumentType) {
    if (!startup) return;
    const formData = new FormData();
    formData.append("doc_type", docType);
    formData.append("file", file);
    await api.post(`/startups/${startup.id}/documents`, formData);
    setUploadedTypes((prev) => new Set(prev).add(docType));
  }

  async function handleStartAnalysis() {
    if (!startup) return;
    setStarting(true);
    setStartError(null);
    try {
      await api.post(`/workflow/startups/${startup.id}/start`);
      router.push(`/startups/${startup.id}`);
    } catch (err) {
      setStartError(err instanceof ApiError ? err.message : "Failed to start analysis");
      setStarting(false);
    }
  }

  const canStart = uploadedTypes.has("pitch_deck");

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-in fade-in duration-300">
      {/* Back Link */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">New Startup Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Establish a startup profile, upload pitch decks, and trigger the multi-agent AI investment committee.
        </p>
      </div>

      {/* Step 1: Create Profile */}
      <Card className="bg-card/40 border-border/40">
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">1. Startup Profile Creation</CardTitle>
            <CardDescription className="text-xs">Extraction agents automatically populate detailed facts from your documents.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!startup ? (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground">Startup Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nimbus Robotics"
                  required
                  className="bg-muted/20 border-border/50 rounded-xl text-sm placeholder:text-muted-foreground/45"
                />
              </div>
              {createError && <p className="text-xs text-destructive">{createError}</p>}
              <Button type="submit" disabled={creating || name.trim().length === 0} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold w-fit self-end px-5">
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Profile
              </Button>
            </form>
          ) : (
            <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 text-sm text-emerald-400 font-semibold">
              Profile established: <span className="underline">{startup.name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Upload Files */}
      {startup && (
        <Card className="bg-card/40 border-border/40">
          <CardHeader className="flex flex-row items-center gap-3 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <UploadCloud className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">2. Document Ingestion</CardTitle>
              <CardDescription className="text-xs">A pitch deck is required to construct the primary knowledge base.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <DocumentUploadRow label="Pitch deck (required)" docType="pitch_deck" onUpload={handleUpload} />
            <DocumentUploadRow label="Business plan" docType="business_plan" onUpload={handleUpload} />
            <DocumentUploadRow label="Supporting documents" docType="supporting" onUpload={handleUpload} />
          </CardContent>
        </Card>
      )}

      {/* Step 3: Trigger Workflow */}
      {startup && (
        <Card className="bg-card/40 border-border/40">
          <CardHeader className="flex flex-row items-center gap-3 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <PlayCircle className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">3. Launch Agentic Due Diligence</CardTitle>
              <CardDescription className="text-xs">
                Kicks off RAG vector indexing, parallel analysis agents, and the investment committee vote.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {startError && <p className="text-xs text-destructive">{startError}</p>}
            <Button onClick={handleStartAnalysis} disabled={!canStart || starting} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/20 rounded-xl px-5 font-semibold">
              {starting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {starting ? "Analyzing Artifacts…" : "Start Committee Analysis"}
            </Button>
            {!canStart && (
              <p className="text-xs text-muted-foreground/70 italic">Please upload a pitch deck PDF above to enable analysis.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

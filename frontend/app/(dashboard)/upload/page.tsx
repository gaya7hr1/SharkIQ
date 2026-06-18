"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">New Analysis</h1>
      <p className="text-sm text-muted-foreground">
        Create a startup profile, upload its documents, then run the AI investment committee.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>1. Startup name</CardTitle>
          <CardDescription>You can refine other details later — the extraction agent fills them in from your documents.</CardDescription>
        </CardHeader>
        <CardContent>
          {!startup ? (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Startup name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nimbus Robotics"
                  required
                />
              </div>
              {createError && <p className="text-sm text-destructive">{createError}</p>}
              <Button type="submit" disabled={creating || name.trim().length === 0}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create startup
              </Button>
            </form>
          ) : (
            <p className="text-sm">
              Created <span className="font-medium">{startup.name}</span>.
            </p>
          )}
        </CardContent>
      </Card>

      {startup && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>2. Upload documents</CardTitle>
            <CardDescription>Pitch deck is required. Business plan and supporting docs are optional but improve analysis quality.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <DocumentUploadRow label="Pitch deck (required)" docType="pitch_deck" onUpload={handleUpload} />
            <DocumentUploadRow label="Business plan" docType="business_plan" onUpload={handleUpload} />
            <DocumentUploadRow label="Supporting documents" docType="supporting" onUpload={handleUpload} />
          </CardContent>
        </Card>
      )}

      {startup && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>3. Run the investment committee</CardTitle>
            <CardDescription>
              This kicks off RAG extraction, the four analyst agents, the unicorn predictor, and the five-investor
              committee vote. It can take a few minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {startError && <p className="mb-3 text-sm text-destructive">{startError}</p>}
            <Button onClick={handleStartAnalysis} disabled={!canStart || starting}>
              {starting && <Loader2 className="h-4 w-4 animate-spin" />}
              {starting ? "Analyzing…" : "Start analysis"}
            </Button>
            {!canStart && (
              <p className="mt-2 text-xs text-muted-foreground">Upload a pitch deck to continue.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

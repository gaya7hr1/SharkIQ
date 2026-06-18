"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DocumentType } from "@/types";

interface Props {
  label: string;
  docType: DocumentType;
  onUpload: (file: File, docType: DocumentType) => Promise<void>;
}

export function DocumentUploadRow({ label, docType, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setStatus("uploading");
    try {
      await onUpload(file, docType);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-dashed border-border p-4">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{fileName ?? "PDF, up to 25MB"}</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
      >
        {status === "uploading" && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === "done" && <CheckCircle2 className="h-4 w-4 text-success" />}
        {status === "idle" && <UploadCloud className="h-4 w-4" />}
        {status === "done" ? "Uploaded" : "Choose file"}
      </Button>
    </div>
  );
}

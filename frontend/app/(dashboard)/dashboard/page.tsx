"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { Startup } from "@/types";

export default function DashboardPage() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Startup[]>("/startups")
      .then(setStartups)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Every startup you have submitted for AI due diligence.
          </p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <Plus className="h-4 w-4" /> New Analysis
          </Link>
        </Button>
      </div>

      {loading && <p className="mt-8 text-sm text-muted-foreground">Loading…</p>}

      {!loading && startups.length === 0 && (
        <Card className="mt-8">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No startups yet. Upload a pitch deck to run your first analysis.
          </CardContent>
        </Card>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {startups.map((startup) => (
          <Link key={startup.id} href={`/startups/${startup.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle>{startup.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>{startup.industry ?? "Industry pending extraction"}</p>
                <p className="mt-1">{startup.business_stage ?? "Stage pending extraction"}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, BarChart3, Brain, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="flex items-center justify-between px-8 py-6">
        <span className="text-xl font-bold tracking-tight">SharkIQ</span>
        <nav className="flex gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-8 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">
          AI-Powered Venture Capital
          <br />
          Due Diligence Intelligence
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          SharkIQ simulates a full investment committee — market, founder, financial, and risk
          analysts plus five investor personas — to evaluate startups from pitch deck to
          investment-grade report in minutes.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/register">
              Start Free Analysis <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-8 pb-24 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Brain className="h-8 w-8 text-primary" />
            <CardTitle className="mt-2">Multi-Agent Analysis</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Five specialist AI agents evaluate market, founder, financial, and risk dimensions —
            grounded in your actual uploaded documents via RAG.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <BarChart3 className="h-8 w-8 text-primary" />
            <CardTitle className="mt-2">Investment Committee</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            A CrewAI-powered committee of five investor personas votes INVEST or PASS with
            reasoning, suggested check size, and equity ask.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <ShieldCheck className="h-8 w-8 text-primary" />
            <CardTitle className="mt-2">Human-in-the-Loop</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Every recommendation pauses for your approval before the final report is generated —
            AI assists, you decide.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

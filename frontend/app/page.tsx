import Link from "next/link";
import { ArrowRight, BarChart3, Brain, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col justify-between">
      {/* Decorative background glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
            <span className="text-sm font-black text-white">S</span>
          </div>
          <span className="text-xl font-black tracking-wider text-gradient">SharkIQ</span>
        </div>
        <nav className="flex gap-3">
          <Button variant="ghost" asChild className="hover:bg-muted/50 rounded-xl text-sm font-semibold">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold px-5">
            <Link href="/register">Get Started</Link>
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-4xl px-8 py-20 text-center space-y-8 flex-1 flex flex-col justify-center">
        <div className="space-y-4">
          <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold px-3 py-1 rounded-full uppercase tracking-wider text-xs mx-auto w-fit">
            Venture Intelligence 1.0
          </Badge>
          <h1 className="text-5xl font-black tracking-tight leading-[1.15] md:text-6xl text-gradient">
            AI-Powered Venture Capital
            <br />
            Due Diligence Platform
          </h1>
        </div>
        <p className="mx-auto max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
          SharkIQ simulates an investment committee — market, founder, financial, and risk
          analysts plus five CrewAI investor personas — to evaluate startups from pitch deck to
          investment-grade report in minutes.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Button size="lg" asChild className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 rounded-xl font-bold px-8 py-6 text-base">
            <Link href="/register" className="flex items-center gap-2">
              Start Free Analysis <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-8 pb-20 md:grid-cols-3 w-full">
        <Card className="bg-card/30 border-border/30 backdrop-blur-sm glow-card">
          <CardHeader className="space-y-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 w-fit">
              <Brain className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg font-bold">Multi-Agent RAG Analysis</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Specialist AI agents evaluate market opportunity, founder experience, financials, and critical risks —
            grounded in your uploaded pitch documents via semantic vector search.
          </CardContent>
        </Card>

        <Card className="bg-card/30 border-border/30 backdrop-blur-sm glow-card">
          <CardHeader className="space-y-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 w-fit">
              <BarChart3 className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg font-bold">Simulated Committee Votes</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            A committee of five investor personas (growth, technology, financial, risk, market) reviews analysis outputs
            and votes INVEST or PASS with check sizes and equity terms.
          </CardContent>
        </Card>

        <Card className="bg-card/30 border-border/30 backdrop-blur-sm glow-card">
          <CardHeader className="space-y-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 w-fit">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg font-bold">Human-in-the-Loop Gate</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            LangGraph pauses the execution workflow at a human gate. Review the committee's rating, add comments,
            and approve/reject to trigger the downloadable PDF report.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

// Small inline Badge helper since it's used in the landing page
function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </div>
  );
}

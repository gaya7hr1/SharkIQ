"use client";

import { useState } from "react";
import { Search, MapPin, Calendar, ArrowUpRight, BookOpen, Award, Sparkles, DollarSign, Clock, Layers } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FundingProgram {
  id: string;
  name: string;
  location: string;
  type: "Accelerator" | "Government Grant" | "Incubator" | "Corporate Venture";
  fundingAmount: string;
  equityRequirement: string;
  deadline: string;
  sectors: string[];
  description: string;
  website: string;
}

const CuratedPrograms: FundingProgram[] = [
  {
    id: "yc",
    name: "Y Combinator",
    location: "Global",
    type: "Accelerator",
    fundingAmount: "$500,000",
    equityRequirement: "7% Equity + 7% MFN",
    deadline: "Deadline: March 24, 2027",
    sectors: ["AI", "SaaS", "Fintech", "B2B", "DeepTech", "Biotech"],
    description: "The world's most prestigious startup accelerator. Provides early-stage funding, unmatched network, and a structured 3-month program ending in Demo Day.",
    website: "https://www.ycombinator.com",
  },
  {
    id: "techstars",
    name: "Techstars Accelerator",
    location: "Global",
    type: "Accelerator",
    fundingAmount: "$120,000",
    equityRequirement: "6% Equity",
    deadline: "Deadline: Rolling Cohorts",
    sectors: ["SaaS", "Hardware", "Healthcare", "Web3", "CleanTech"],
    description: "A highly selective mentorship-driven accelerator operating worldwide. Operates location-specific programs in US, Europe, and APAC with a huge global network.",
    website: "https://www.techstars.com",
  },
  {
    id: "startup-india",
    name: "Startup India Seed Fund Scheme",
    location: "India",
    type: "Government Grant",
    fundingAmount: "Up to ₹50 Lakhs ($60,000)",
    equityRequirement: "Non-dilutive / Convertible",
    deadline: "Deadline: Open Year-Round",
    sectors: ["All Sectors", "AI", "Agriculture", "Healthcare", "Education"],
    description: "Government of India financial assistance scheme providing seed fund grants for proof of concept, prototype development, product trials, and market entry.",
    website: "https://www.startupindia.gov.in",
  },
  {
    id: "nsf-sbir",
    name: "NSF SBIR/STTR Phase I",
    location: "United States",
    type: "Government Grant",
    fundingAmount: "Up to $275,000",
    equityRequirement: "Non-dilutive (0% Equity)",
    deadline: "Deadline: March 15, 2027",
    sectors: ["DeepTech", "Biotech", "Robotics", "Quantum", "Semiconductors"],
    description: "The National Science Foundation provides early-stage research and development funding to small businesses developing highly innovative, high-risk technologies.",
    website: "https://seedfund.nsf.gov",
  },
  {
    id: "eic-accel",
    name: "EIC Accelerator",
    location: "European Union",
    type: "Government Grant",
    fundingAmount: "Up to €2.5M Grant + €15M Equity",
    equityRequirement: "Blended Finance (Co-Investment)",
    deadline: "Deadline: Jan 20, 2027",
    sectors: ["DeepTech", "Life Sciences", "Spacetech", "AI", "CleanTech"],
    description: "European Innovation Council funding supporting individual Small and Medium Enterprises (SMEs) to develop and scale up game-changing, breakthrough innovations.",
    website: "https://eic.ec.europa.eu",
  },
  {
    id: "sg-founder",
    name: "Startup SG Founder Grant",
    location: "Singapore",
    type: "Government Grant",
    fundingAmount: "Up to SGD 50,000",
    equityRequirement: "Non-dilutive (Requires Co-funding)",
    deadline: "Deadline: Rolling applications",
    sectors: ["SaaS", "E-commerce", "Fintech", "Logistics", "Smart Cities"],
    description: "Enterprise Singapore scheme providing mentorship and startup capital grants to first-time entrepreneurs with innovative business ideas.",
    website: "https://www.startupsg.gov.sg",
  },
  {
    id: "innovate-uk",
    name: "Innovate UK Smart Grants",
    location: "United Kingdom",
    type: "Government Grant",
    fundingAmount: "Up to £2M",
    equityRequirement: "Non-dilutive (Grants share costs)",
    deadline: "Deadline: April 14, 2027",
    sectors: ["AI", "Manufacturing", "Creative", "Digital Health", "Energy"],
    description: "UK's innovation agency offering funding for disruptive, game-changing R&D projects with significant commercial potential.",
    website: "https://www.gov.uk/government/organisations/innovate-uk",
  },
  {
    id: "sequoia-surge",
    name: "Peak XV Surge (formerly Sequoia)",
    location: "Southeast Asia",
    type: "Accelerator",
    fundingAmount: "$1.5M - $3M",
    equityRequirement: "10% - 15% Equity",
    deadline: "Deadline: Cohort 11 Open",
    sectors: ["SaaS", "Consumer", "DeepTech", "Fintech", "AI"],
    description: "A rapid scale-up program for early-stage startups in India and Southeast Asia. Combines seed capital with company-building workshops and global mentors.",
    website: "https://www.surgeahead.com",
  },
];

export default function FundingPage() {
  const [selectedLocation, setSelectedLocation] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const locations = ["All", "Global", "United States", "European Union", "India", "Singapore", "United Kingdom", "Southeast Asia"];
  const programTypes = ["All", "Accelerator", "Government Grant"];

  // Filter logic
  const filteredPrograms = CuratedPrograms.filter((p) => {
    const matchesLocation = selectedLocation === "All" || p.location === selectedLocation;
    const matchesType = selectedType === "All" || p.type === selectedType;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sectors.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLocation && matchesType && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Funding & Accelerators Explorer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Access local and global accelerator cohorts, non-dilutive government grants, and startup funding timelines.
        </p>
      </div>

      {/* Guide Section: How to Get Funded */}
      <Card className="bg-gradient-to-r from-indigo-950/10 via-purple-950/5 to-card border-indigo-500/10 shadow-[0_4px_30px_rgba(99,102,241,0.05)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-400" /> VC Guide: How to Secure Funding for Your Startup
          </CardTitle>
          <CardDescription>Step-by-step roadmap to make your deal-flow attractive to investors</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2">
          {/* Step 1 */}
          <div className="bg-muted/10 border border-border/40 rounded-xl p-4 space-y-2 relative">
            <Badge className="absolute top-3 right-3 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">01</Badge>
            <h4 className="font-bold text-xs text-foreground mt-2">Perfect the Pitch Deck</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Synthesize your pitch into 10–12 visual slides. Clearly articulate your unique wedge, business model, and unit economics.
            </p>
          </div>
          {/* Step 2 */}
          <div className="bg-muted/10 border border-border/40 rounded-xl p-4 space-y-2 relative">
            <Badge className="absolute top-3 right-3 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">02</Badge>
            <h4 className="font-bold text-xs text-foreground mt-2">Organize the Data Room</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Compile corporate charters, technology patents, cap tables, historical margins, and founder references in one secure space.
            </p>
          </div>
          {/* Step 3 */}
          <div className="bg-muted/10 border border-border/40 rounded-xl p-4 space-y-2 relative">
            <Badge className="absolute top-3 right-3 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">03</Badge>
            <h4 className="font-bold text-xs text-foreground mt-2">Select Fit Programs</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Match your geography and industry focus. Accelerators offer network speed, while grants supply non-dilutive scaling cash.
            </p>
          </div>
          {/* Step 4 */}
          <div className="bg-muted/10 border border-border/40 rounded-xl p-4 space-y-2 relative">
            <Badge className="absolute top-3 right-3 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">04</Badge>
            <h4 className="font-bold text-xs text-foreground mt-2">Evaluate via Agents</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Pre-check your metrics. Run simulated evaluations using multi-agent committees (Market, Founder, Risk) to predict exits.
            </p>
          </div>
          {/* Step 5 */}
          <div className="bg-muted/10 border border-border/40 rounded-xl p-4 space-y-2 relative">
            <Badge className="absolute top-3 right-3 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">05</Badge>
            <h4 className="font-bold text-xs text-foreground mt-2">Commit the Syndicate</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Gather lead term sheets, agree on valuation multipliers, secure partner votes, and allocate target check sizes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters Container */}
      <Card className="bg-card/30 border-border/30">
        <CardContent className="py-6 space-y-4">
          {/* Search and general options */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search programs, sectors, or criteria…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-border/40 rounded-xl text-xs placeholder:text-muted-foreground focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>Matched <strong>{filteredPrograms.length}</strong> funding directories</span>
            </div>
          </div>

          {/* Location Filters */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Filter by Location</span>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setSelectedLocation(loc)}
                  className={`text-xs px-3.5 py-1.5 rounded-lg border transition-all duration-200 ${
                    selectedLocation === loc
                      ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/40 font-semibold"
                      : "bg-transparent border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Program Type Filters */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Filter by Program Type</span>
            <div className="flex flex-wrap gap-2">
              {programTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`text-xs px-3.5 py-1.5 rounded-lg border transition-all duration-200 ${
                    selectedType === type
                      ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/40 font-semibold"
                      : "bg-transparent border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  {type === "All" ? "All Formats" : type}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Programs Grid */}
      {filteredPrograms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPrograms.map((program) => (
            <Card key={program.id} className="bg-card/30 border-border/30 flex flex-col justify-between p-6 glow-card transition-all duration-300 relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-lg text-foreground tracking-tight flex items-center gap-1.5">
                      {program.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-indigo-400" /> {program.location}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3 text-purple-400" /> {program.type}
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-semibold py-1">
                    {program.deadline}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {program.description}
                </p>

                {/* Focus Sectors */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {program.sectors.map((sector) => (
                    <Badge key={sector} variant="muted" className="text-[9px] bg-muted/30 border-border/30 text-muted-foreground px-2 py-0.5">
                      {sector}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Funding Offering Card Section */}
              <div className="mt-6 pt-4 border-t border-border/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                      <DollarSign className="h-2.5 w-2.5 text-emerald-400" /> Funding Capital
                    </span>
                    <p className="text-xs font-black text-emerald-400">{program.fundingAmount}</p>
                  </div>
                  <div className="space-y-0.5 border-l border-border/20 pl-4">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                      <Award className="h-2.5 w-2.5 text-indigo-400" /> Dilution
                    </span>
                    <p className="text-xs font-bold text-foreground">{program.equityRequirement}</p>
                  </div>
                </div>
                
                <a
                  href={program.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 px-3 text-[11px] font-semibold text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all duration-200 self-end sm:self-center gap-1"
                >
                  Apply <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-border/60 bg-transparent py-16 text-center text-sm text-muted-foreground">
          No programs matched your location or format filter. Try clearing filters to see more results.
        </Card>
      )}
    </div>
  );
}

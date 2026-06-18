export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export interface Startup {
  id: string;
  name: string;
  industry: string | null;
  problem_statement: string | null;
  solution: string | null;
  target_audience: string | null;
  revenue_model: string | null;
  funding_requirement: string | null;
  business_stage: string | null;
  created_at: string;
}

export type DocumentType = "pitch_deck" | "business_plan" | "supporting";
export type DocumentStatus = "uploaded" | "processing" | "indexed" | "failed";

export interface StartupDocument {
  id: string;
  startup_id: string;
  filename: string;
  doc_type: DocumentType;
  status: DocumentStatus;
  chunk_count: number;
  error_message: string | null;
  created_at: string;
}

export type WorkflowStatus =
  | "pending"
  | "running"
  | "paused_for_approval"
  | "approved"
  | "rejected"
  | "reanalyzing"
  | "completed"
  | "failed";

export interface WorkflowRun {
  id: string;
  startup_id: string;
  thread_id: string;
  status: WorkflowStatus;
  current_node: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketAnalysis {
  market_size: string;
  industry_growth: string;
  competitor_analysis: string;
  product_differentiation: string;
  market_opportunity: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
}

export interface FounderAnalysis {
  experience: string;
  domain_expertise: string;
  leadership_indicators: string;
  execution_capability: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  communication_sentiment_label: string | null;
  communication_sentiment_score: number | null;
}

export interface FinancialAnalysis {
  revenue_model_assessment: string;
  monetization_strategy: string;
  scalability: string;
  sustainability: string;
  profitability_potential: string;
  score: number;
  investment_concerns: string[];
  financial_strengths: string[];
}

export interface RiskItem {
  category: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface RiskAnalysis {
  market_risk: string;
  competition_risk: string;
  regulatory_risk: string;
  funding_risk: string;
  execution_risk: string;
  score: number;
  critical_risks: RiskItem[];
}

export interface UnicornPrediction {
  startup_survival_probability: number;
  series_a_funding_probability: number;
  unicorn_probability: number;
  reasoning: string;
  disclaimer: string;
}

export interface InvestorVote {
  investor_type: "technology" | "financial" | "market" | "risk" | "growth";
  decision: "INVEST" | "PASS";
  reasoning: string;
  suggested_investment_amount: number;
  suggested_equity_pct: number;
}

export interface FinalRecommendation {
  overall_score: number;
  decision: "Strong Invest" | "Invest with Caution" | "Monitor" | "Reject";
  reasoning: string;
  human_decision: string | null;
}

export interface PendingApprovalPayload {
  message: string;
  actions: ("approve" | "reject" | "request_reanalysis")[];
  startup_name: string | null;
  final_recommendation: {
    overall_score: number;
    decision: string;
    reasoning: string;
  };
}

export interface StartupSummary {
  startup_name: string;
  industry: string;
  problem_statement: string;
  solution: string;
  target_audience: string;
  revenue_model: string;
  funding_requirement: string;
  business_stage: string;
}

export interface WorkflowResult {
  run: WorkflowRun;
  startup_summary: StartupSummary | null;
  market_analysis: MarketAnalysis | null;
  founder_analysis: FounderAnalysis | null;
  financial_analysis: FinancialAnalysis | null;
  risk_analysis: RiskAnalysis | null;
  unicorn_prediction: UnicornPrediction | null;
  committee_votes: InvestorVote[];
  final_recommendation: FinalRecommendation | null;
  pending_approval_payload: PendingApprovalPayload | null;
}

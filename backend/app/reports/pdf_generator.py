import os
from datetime import datetime
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.core.config import settings

_styles = getSampleStyleSheet()
_h1 = ParagraphStyle("H1", parent=_styles["Heading1"], textColor=colors.HexColor("#0F172A"))
_h2 = ParagraphStyle("H2", parent=_styles["Heading2"], textColor=colors.HexColor("#1E293B"))
_body = _styles["BodyText"]
_disclaimer = ParagraphStyle(
    "Disclaimer", parent=_body, textColor=colors.HexColor("#B45309"), fontSize=9, italic=True
)


def _bullets(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(item, _body)) for item in items], bulletType="bullet"
    )


def _score_table(rows: list[tuple[str, Any]]) -> Table:
    table = Table(rows, colWidths=[2.5 * inch, 3.5 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ]
        )
    )
    return table


def generate_report(state: dict[str, Any]) -> str:
    os.makedirs(settings.reports_dir, exist_ok=True)
    startup_id = state.get("startup_id", "unknown")
    filename = f"sharkiq_report_{startup_id}_{datetime.utcnow():%Y%m%d%H%M%S}.pdf"
    path = os.path.join(settings.reports_dir, filename)

    doc = SimpleDocTemplate(path, pagesize=LETTER, title="SharkIQ Investment Report")
    story: list[Any] = []

    startup_name = state.get("startup_name", "Unknown Startup")
    summary = state.get("startup_summary", {})
    market = state.get("market_analysis", {})
    founder = state.get("founder_analysis", {})
    financial = state.get("financial_analysis", {})
    risk = state.get("risk_analysis", {})
    unicorn = state.get("unicorn_prediction", {})
    votes = state.get("committee_votes", [])
    final = state.get("final_recommendation", {})

    story.append(Paragraph("SharkIQ Investment Report", _h1))
    story.append(Paragraph(startup_name, _styles["Heading2"]))
    story.append(Spacer(1, 12))

    # 1. Executive Summary
    story.append(Paragraph("1. Executive Summary", _h2))
    story.append(Paragraph(final.get("reasoning", "No recommendation generated."), _body))
    story.append(Spacer(1, 10))

    # 2. Startup Overview
    story.append(Paragraph("2. Startup Overview", _h2))
    story.append(
        _score_table(
            [
                ("Field", "Value"),
                ("Industry", summary.get("industry", "-")),
                ("Business Stage", summary.get("business_stage", "-")),
                ("Problem Statement", summary.get("problem_statement", "-")),
                ("Solution", summary.get("solution", "-")),
                ("Target Audience", summary.get("target_audience", "-")),
                ("Revenue Model", summary.get("revenue_model", "-")),
                ("Funding Requirement", summary.get("funding_requirement", "-")),
            ]
        )
    )
    story.append(Spacer(1, 10))

    # 3. Market Analysis
    story.append(Paragraph("3. Market Analysis", _h2))
    story.append(Paragraph(f"Market Score: {market.get('score', '-')}/100", _styles["Heading3"]))
    story.append(Paragraph(market.get("market_opportunity", ""), _body))
    if market.get("strengths"):
        story.append(Paragraph("Strengths:", _body))
        story.append(_bullets(market["strengths"]))
    if market.get("weaknesses"):
        story.append(Paragraph("Weaknesses:", _body))
        story.append(_bullets(market["weaknesses"]))
    if market.get("opportunities"):
        story.append(Paragraph("Opportunities:", _body))
        story.append(_bullets(market["opportunities"]))
    story.append(Spacer(1, 10))

    # 4. Founder Analysis
    story.append(Paragraph("4. Founder Analysis", _h2))
    story.append(Paragraph(f"Founder Score: {founder.get('score', '-')}/100", _styles["Heading3"]))
    story.append(Paragraph(founder.get("execution_capability", ""), _body))
    if founder.get("strengths"):
        story.append(Paragraph("Strengths:", _body))
        story.append(_bullets(founder["strengths"]))
    if founder.get("weaknesses"):
        story.append(Paragraph("Weaknesses:", _body))
        story.append(_bullets(founder["weaknesses"]))
    if founder.get("communication_sentiment_label"):
        story.append(
            Paragraph(
                f"Communication sentiment (Hugging Face Hub cross-check): "
                f"{founder['communication_sentiment_label']} "
                f"({round((founder.get('communication_sentiment_score') or 0) * 100)}% confidence)",
                _body,
            )
        )
    story.append(Spacer(1, 10))

    # 5. Financial Analysis
    story.append(Paragraph("5. Financial Analysis", _h2))
    story.append(Paragraph(f"Financial Score: {financial.get('score', '-')}/100", _styles["Heading3"]))
    story.append(Paragraph(financial.get("profitability_potential", ""), _body))
    if financial.get("financial_strengths"):
        story.append(Paragraph("Financial Strengths:", _body))
        story.append(_bullets(financial["financial_strengths"]))
    if financial.get("investment_concerns"):
        story.append(Paragraph("Investment Concerns:", _body))
        story.append(_bullets(financial["investment_concerns"]))
    story.append(Spacer(1, 10))

    # 6. Risk Assessment
    story.append(Paragraph("6. Risk Assessment", _h2))
    story.append(Paragraph(f"Risk Score (higher = safer): {risk.get('score', '-')}/100", _styles["Heading3"]))
    critical_risks = risk.get("critical_risks", [])
    if critical_risks:
        story.append(
            _bullets(
                [f"[{r['severity'].upper()}] {r['category']}: {r['description']}" for r in critical_risks]
            )
        )
    story.append(Spacer(1, 10))

    # 7. Investor Committee Decisions
    story.append(Paragraph("7. Investor Committee Decisions", _h2))
    vote_rows = [("Investor", "Decision", "Amount (USD)", "Equity %")]
    for v in votes:
        vote_rows.append(
            (
                v.get("investor_type", "-").title(),
                v.get("decision", "-"),
                f"{v.get('suggested_investment_amount', 0):,.0f}",
                f"{v.get('suggested_equity_pct', 0):.1f}%",
            )
        )
    story.append(_score_table(vote_rows))
    story.append(Spacer(1, 10))

    # 8. Unicorn Predictor
    story.append(Paragraph("8. Unicorn Predictor", _h2))
    story.append(
        _score_table(
            [
                ("Metric", "Probability"),
                ("Startup Survival", f"{unicorn.get('startup_survival_probability', '-')}%"),
                ("Series A Funding", f"{unicorn.get('series_a_funding_probability', '-')}%"),
                ("Unicorn ($1B+)", f"{unicorn.get('unicorn_probability', '-')}%"),
            ]
        )
    )
    story.append(Paragraph(unicorn.get("disclaimer", "AI-generated estimate. Not a financial prediction."), _disclaimer))
    story.append(Spacer(1, 10))

    # 9. Final Recommendation
    story.append(Paragraph("9. Final Recommendation", _h2))
    story.append(Paragraph(f"Overall Score: {final.get('overall_score', '-')}/100", _styles["Heading3"]))
    story.append(Paragraph(f"Decision: {final.get('decision', '-')}", _styles["Heading3"]))
    story.append(Paragraph(final.get("reasoning", ""), _body))

    doc.build(story)
    return path

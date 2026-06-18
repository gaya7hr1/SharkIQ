"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-18

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="analyst"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "startups",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("industry", sa.String(255)),
        sa.Column("problem_statement", sa.Text),
        sa.Column("solution", sa.Text),
        sa.Column("target_audience", sa.Text),
        sa.Column("revenue_model", sa.Text),
        sa.Column("funding_requirement", sa.String(255)),
        sa.Column("business_stage", sa.String(100)),
        sa.Column("chroma_collection", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    document_type = postgresql.ENUM(
        "pitch_deck", "business_plan", "supporting", name="documenttype"
    )
    document_status = postgresql.ENUM(
        "uploaded", "processing", "indexed", "failed", name="documentstatus"
    )
    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("startup_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("startups.id"), nullable=False),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("file_path", sa.String(1000), nullable=False),
        sa.Column("doc_type", document_type, nullable=False),
        sa.Column("status", document_status, nullable=False, server_default="uploaded"),
        sa.Column("chunk_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("error_message", sa.String(1000)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    workflow_status = postgresql.ENUM(
        "pending", "running", "paused_for_approval", "approved", "rejected",
        "reanalyzing", "completed", "failed", name="workflowstatus",
    )
    op.create_table(
        "workflow_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("startup_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("startups.id"), nullable=False),
        sa.Column("thread_id", sa.String(255), nullable=False, unique=True),
        sa.Column("status", workflow_status, nullable=False, server_default="pending"),
        sa.Column("current_node", sa.String(255)),
        sa.Column("error_message", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    agent_type = postgresql.ENUM(
        "startup_extraction", "market", "founder", "financial", "risk", "unicorn",
        name="agenttype",
    )
    op.create_table(
        "analysis_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workflow_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workflow_runs.id"), nullable=False),
        sa.Column("agent_type", agent_type, nullable=False),
        sa.Column("score", sa.Float),
        sa.Column("data", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    investor_type = postgresql.ENUM(
        "technology", "financial", "market", "risk", "growth", name="investortype"
    )
    vote_decision = postgresql.ENUM("INVEST", "PASS", name="votedecision")
    op.create_table(
        "committee_votes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workflow_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workflow_runs.id"), nullable=False),
        sa.Column("investor_type", investor_type, nullable=False),
        sa.Column("decision", vote_decision, nullable=False),
        sa.Column("reasoning", sa.Text, nullable=False),
        sa.Column("suggested_amount", sa.Float),
        sa.Column("suggested_equity_pct", sa.Float),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    recommendation_decision = postgresql.ENUM(
        "Strong Invest", "Invest with Caution", "Monitor", "Reject",
        name="recommendationdecision",
    )
    op.create_table(
        "final_recommendations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workflow_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workflow_runs.id"), nullable=False, unique=True),
        sa.Column("overall_score", sa.Float, nullable=False),
        sa.Column("decision", recommendation_decision, nullable=False),
        sa.Column("reasoning", sa.Text, nullable=False),
        sa.Column("human_decision", sa.String(50)),
        sa.Column("human_feedback", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workflow_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workflow_runs.id"), nullable=False, unique=True),
        sa.Column("file_path", sa.String(1000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_table("final_recommendations")
    op.drop_table("committee_votes")
    op.drop_table("analysis_results")
    op.drop_table("workflow_runs")
    op.drop_table("documents")
    op.drop_table("startups")
    op.drop_table("users")

    sa.Enum(name="recommendationdecision").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="votedecision").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="investortype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="agenttype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="workflowstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="documentstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="documenttype").drop(op.get_bind(), checkfirst=True)

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.startup import Startup
from app.models.document import Document
from app.models.workflow import WorkflowRun
from app.models.analysis import AnalysisResult
from app.models.committee import CommitteeVote, FinalRecommendation, Report
from app.services.workflow_service import chat_with_committee_member

@pytest.mark.asyncio
async def test_chat_with_committee_member_success():
    # Setup IDs
    run_id = uuid.uuid4()
    startup_id = uuid.uuid4()

    # Mock DB Startup and WorkflowRun
    mock_run = WorkflowRun(id=run_id, startup_id=startup_id)
    mock_startup = Startup(id=startup_id, name="Test Startup", industry="AI", chroma_collection="test_collection")

    # Mock DB Vote
    mock_vote = CommitteeVote(
        workflow_run_id=run_id,
        investor_type="technology",
        decision="INVEST",
        reasoning="Strong tech stack.",
        suggested_amount=500000.0,
        suggested_equity_pct=10.0
    )

    # Setup database mocks
    mock_db = MagicMock(spec=AsyncSession)
    
    # Mock db.get for WorkflowRun and Startup
    async def mock_get(model, id_val):
        if model == WorkflowRun:
            return mock_run
        if model == Startup:
            return mock_startup
        return None
    mock_db.get = mock_get

    # Mock db.execute for CommitteeVote select query
    mock_scalar = MagicMock()
    mock_scalar.scalar_one_or_none = MagicMock(return_value=mock_vote)
    mock_db.execute = AsyncMock(return_value=mock_scalar)

    # Mock LLM and RAG retrievals
    with patch("app.rag.retriever.retrieve_context", return_value="Tech details: built with NextJS and FastAPI.") as mock_retrieve, \
         patch("app.agents.base.get_llm") as mock_get_llm:
        
        # Mock LLM invoke behavior
        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=MagicMock(content="I agree the tech is very strong."))
        mock_get_llm.return_value = mock_llm

        # Call the service
        response = await chat_with_committee_member(
            db=mock_db,
            run_id=run_id,
            investor_type="technology",
            message="What do you think of their codebase?",
            history=[
                {"role": "user", "content": "Hi partner"},
                {"role": "assistant", "content": "Hello. I am here."}
            ]
        )

        # Assert response
        assert response == "I agree the tech is very strong."

        # Verify retrieve_context was called
        mock_retrieve.assert_called_once_with("test_collection", query="What do you think of their codebase?", k=5)

        # Verify get_llm was called
        mock_get_llm.assert_called_once()
        
        # Verify messages sent to LLM contains system prompt with expected data
        called_messages = mock_llm.ainvoke.call_args[0][0]
        assert len(called_messages) == 4 # System, Human, AI, Human
        
        system_content = called_messages[0].content
        assert "Test Startup" in system_content
        assert "During the simulated investment committee meeting, you voted: INVEST" in system_content
        assert "Strong tech stack." in system_content
        assert "Tech details: built with NextJS and FastAPI." in system_content
        assert "TECHNOLOGY INVESTOR" in system_content

        assert called_messages[1].content == "Hi partner"
        assert called_messages[2].content == "Hello. I am here."
        assert called_messages[3].content == "What do you think of their codebase?"

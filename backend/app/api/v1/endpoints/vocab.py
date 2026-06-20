import structlog
from fastapi import APIRouter
from pydantic import BaseModel
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.agents.base import get_llm

router = APIRouter(prefix="/vocab", tags=["vocab"])
logger = structlog.get_logger(__name__)

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]

class ChatResponse(BaseModel):
    reply: str

SYSTEM_PROMPT = (
    "You are a helpful, friendly, and expert Venture Capital and Startup Advisor chatbot. "
    "Your primary goal is to explain startup, venture capital, and business terminology "
    "(e.g., SAFEs, convertible notes, cap tables, pre/post-money valuation, drag-along rights, "
    "liquidation preferences, down rounds, CAC, LTV, churn, TAM, etc.) in a clear, concise, "
    "and highly accessible way.\n\n"
    "Use clear analogies, formatting (bullet points, bold text), and practical examples where "
    "appropriate to make complex financial or legal structures easy to understand for early-stage founders.\n\n"
    "Keep your answers professional yet engaging, and limit responses to a readable length."
)

@router.post("/chat", response_model=ChatResponse)
async def chat_vocab(request: ChatRequest) -> ChatResponse:
    try:
        llm = get_llm(temperature=0.5)
        
        # Build LangChain message history
        messages = [SystemMessage(content=SYSTEM_PROMPT)]
        for msg in request.messages:
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                messages.append(AIMessage(content=msg.content))
        
        # Invoke the LLM
        response = await llm.ainvoke(messages)
        return ChatResponse(reply=str(response.content))
    except Exception as e:
        logger.error("vocab_chat_failed", error=str(e))
        return ChatResponse(reply="Sorry, I encountered an error while retrieving the explanation. Please try again.")

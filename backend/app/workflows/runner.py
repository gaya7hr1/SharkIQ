from typing import Any

from langgraph.types import Command

from app.workflows.checkpointer import get_checkpointer
from app.workflows.graph import build_graph

_compiled_graph = None


def get_compiled_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph().compile(checkpointer=get_checkpointer())
    return _compiled_graph


def _config(thread_id: str) -> dict:
    return {"configurable": {"thread_id": thread_id}}


async def start_run(thread_id: str, *, startup_id: str, chroma_collection: str) -> dict[str, Any]:
    graph = get_compiled_graph()
    initial_state = {
        "startup_id": startup_id,
        "chroma_collection": chroma_collection,
        "status": "running",
    }
    return await graph.ainvoke(initial_state, config=_config(thread_id))


async def resume_run(thread_id: str, *, action: str, feedback: str | None) -> dict[str, Any]:
    graph = get_compiled_graph()
    return await graph.ainvoke(
        Command(resume={"action": action, "feedback": feedback}), config=_config(thread_id)
    )


async def get_run_state(thread_id: str):
    graph = get_compiled_graph()
    return await graph.aget_state(_config(thread_id))


def extract_interrupt_payload(result: dict[str, Any]) -> dict | None:
    """LangGraph surfaces a paused interrupt as result['__interrupt__'], a tuple
    of Interrupt objects. We only ever raise one interrupt per node, so take
    the first one's payload."""
    interrupts = result.get("__interrupt__")
    if not interrupts:
        return None
    return interrupts[0].value

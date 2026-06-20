from functools import lru_cache

from langgraph.graph import END, START, StateGraph

from app.workflows import nodes
from app.workflows.state import WorkflowState


def build_graph() -> StateGraph:
    graph = StateGraph(WorkflowState)

    graph.add_node("extract_startup", nodes.extract_startup_node)
    graph.add_node("begin_analysis", nodes.begin_analysis_node)
    graph.add_node("market_agent", nodes.market_node)
    graph.add_node("founder_agent", nodes.founder_node)
    graph.add_node("financial_agent", nodes.financial_node)
    graph.add_node("risk_agent", nodes.risk_node)
    graph.add_node("committee_synthesis", nodes.committee_synthesis_node)
    graph.add_node("final_recommendation", nodes.final_recommendation_node)
    graph.add_node("human_approval", nodes.human_approval_node)
    graph.add_node("report_generation", nodes.report_generation_node)

    graph.add_edge(START, "extract_startup")
    graph.add_edge("extract_startup", "begin_analysis")

    # Fan-out: the four analysis agents run in parallel off the same anchor node.
    graph.add_edge("begin_analysis", "market_agent")
    graph.add_edge("begin_analysis", "founder_agent")
    graph.add_edge("begin_analysis", "financial_agent")
    graph.add_edge("begin_analysis", "risk_agent")

    # Fan-in: committee_synthesis only runs once all four branches complete.
    graph.add_edge("market_agent", "committee_synthesis")
    graph.add_edge("founder_agent", "committee_synthesis")
    graph.add_edge("financial_agent", "committee_synthesis")
    graph.add_edge("risk_agent", "committee_synthesis")

    graph.add_edge("committee_synthesis", "final_recommendation")
    graph.add_edge("final_recommendation", "human_approval")

    graph.add_conditional_edges(
        "human_approval",
        nodes.route_after_approval,
        {
            "report_generation": "report_generation",
            "begin_analysis": "begin_analysis",
            "__end__": END,
        },
    )
    graph.add_edge("report_generation", END)

    return graph


@lru_cache
def get_compiled_graph_factory():
    """Returns a callable that compiles the graph against a given checkpointer.

    The checkpointer (Postgres-backed) is created per-application-lifespan in
    app.workflows.checkpointer, so compilation is deferred until that's ready.
    """
    return build_graph

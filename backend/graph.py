from typing import TypedDict, List, Optional, Dict, Any
from langgraph.graph import StateGraph, END
from nodes import extract_node, clean_node # New nodes

# --- Legacy State (Keep for now if needed, or deprecate) ---
class LegacyState(TypedDict):
    input_text: str
    input_url: Optional[str]
    modality: str
    cleaned_content: str
    summary_text: str
    flashcards: List[dict]
    key_insights: List[str]
    status: str

# --- New Normalization State ---
class NormalizeState(TypedDict):
    user_text: str
    attachments: List[Dict]
    extracted_parts: List[str]
    failed_items: List[str]
    normalized_text: str

# --- 1. Legacy Graph (Summarizer) ---
#legacy_workflow = StateGraph(LegacyState)
#legacy_workflow.add_node("extract", extract_content)
#legacy_workflow.add_node("clean", clean_content_node)
#legacy_workflow.add_node("summarize", summarize_content)
#legacy_workflow.set_entry_point("extract")
#legacy_workflow.add_edge("extract", "clean")
#legacy_workflow.add_edge("clean", "summarize")
#legacy_workflow.add_edge("summarize", END)
#legacy_app = legacy_workflow.compile()

# --- 2. Normalization Graph ---
norm_workflow = StateGraph(NormalizeState)
norm_workflow.add_node("extract_all", extract_node)
norm_workflow.add_node("clean_merge", clean_node)

norm_workflow.set_entry_point("extract_all")
norm_workflow.add_edge("extract_all", "clean_merge")
norm_workflow.add_edge("clean_merge", END)

norm_app = norm_workflow.compile()

if __name__ == "__main__":
    # Test run
    print("Graph compiled successfully.")

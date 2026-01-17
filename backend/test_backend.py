import sys
import os

# Ensure backend dir is in path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from graph import app
from schemas import SummarizeRequest

def test_text_summarization():
    print("\n--- Testing Text Summarization ---")
    inputs = {
        "input_text": "Procrastination is the act of delaying or postponing a task or set of tasks. It is the force that prevents you from following through on what you set out to do.", 
        "modality": "text", 
        "cleaned_content": "", "summary_text": "", "flashcards": [], "key_insights": [], "status": "pending"
    }
    try:
        result = app.invoke(inputs)
        print("Status:", result.get("status"))
        print("Summary:", result.get("summary_text"))
        if result.get("status") == "completed":
            print("p SUCCESS")
        else:
            print("x FAILED")
    except Exception as e:
        print(f"x ERROR: {e}")

if __name__ == "__main__":
    test_text_summarization()

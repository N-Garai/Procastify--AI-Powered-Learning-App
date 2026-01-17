from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import SummarizeRequest, SummarizeResponse, NormalizeRequest, NormalizeResponse
#from graph import legacy_app as backend_graph
from graph import norm_app as normalization_graph
import uvicorn
import os

app = FastAPI(title="Procastify AI Backend")

# CORS Setup - Essential for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, specify local dev URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "ok", "service": "procastify-ai-engine"}

@app.post("/normalize", response_model=NormalizeResponse)
async def normalize_text(request: NormalizeRequest):
    try:
        # Map request to graph state
        inputs = {
            "user_text": request.user_text or "",
            "attachments": [a.dict() for a in request.attachments], # Convert pydantic to dict
            "extracted_parts": [],
            "failed_items": [],
            "normalized_text": ""
        }
        
        # Invoke LangGraph
        result = normalization_graph.invoke(inputs)
        
        return {
            "normalized_text": result.get("normalized_text", ""),
            "failed_attachments": result.get("failed_items", []),
            "status": "completed"
        }
        
    except Exception as e:
        print(f"Error processing normalization: {e}")
        return {
            "normalized_text": "",
            "failed_attachments": [str(e)],
            "status": "error"
        }

@app.post("/summarize", response_model=SummarizeResponse)
async def summarize(request: SummarizeRequest):
    try:
        # Map request to graph state
        inputs = {
            "input_text": request.content or "",
            "input_url": request.url or request.file_path,
            "modality": request.modality,
            "cleaned_content": "",
            "summary_text": "",
            "flashcards": [],
            "key_insights": [],
            "status": "pending"
        }
        
        # Invoke LangGraph
        result = backend_graph.invoke(inputs)
        
        response_data = {
            "summary": {
                "summary_text": result.get("summary_text", ""),
                "flashcards": result.get("flashcards", []),
                "key_insights": result.get("key_insights", [])
            },
            "original_text": result.get("cleaned_content", "")[:1000],  # Return snippet
            "status": result.get("status", "completed")
        }
        return response_data

    except Exception as e:
        print(f"Error processing request: {e}")
        # Return a graceful error structure matching schema
        return {
            "summary": {
                "summary_text": f"Error: {str(e)}",
                "flashcards": [],
                "key_insights": []
            },
            "status": "error"
        }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Literal, Dict, Any

class Flashcard(BaseModel):
    front: str
    back: str

class NoteSection(BaseModel):
    title: str
    content: str

class Summary(BaseModel):
    summary_text: str
    flashcards: List[Flashcard] = []
    key_insights: List[str] = []
    timeline: List[Dict[str, str]] = []  # For YouTube/Audio
    
class ExtractionResult(BaseModel):
    text: str
    source_type: str  # youtube, pdf, website, etc.
    metadata: Dict[str, Any] = {}

class SummarizeRequest(BaseModel):
    content: Optional[str] = None
    url: Optional[str] = None
    file_path: Optional[str] = None
    modality: Literal["text", "website", "youtube", "pdf", "image", "audio"] = "text"

class SummarizeResponse(BaseModel):
    summary: Summary
    original_text: Optional[str] = None
    status: str

# --- Normalization Schemas ---

class Attachment(BaseModel):
    type: Literal["text", "website", "youtube", "pdf", "image", "audio", "url"]
    content: str  # URL or Base64
    name: Optional[str] = None
    mimeType: Optional[str] = None

class NormalizeRequest(BaseModel):
    user_text: Optional[str] = ""
    attachments: List[Attachment] = []

class NormalizeResponse(BaseModel):
    normalized_text: str
    failed_attachments: List[str] = []
    status: str


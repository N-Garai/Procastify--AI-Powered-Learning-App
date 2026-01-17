import os
import re
from typing import Dict, Any, List
# from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from schemas import Summary, Flashcard

# --- 1. SETUP LLM ---
# In a real scenario, ensure your API KEY is set in environment variables
# For now, we will structure this to work even if the API call fails by catching errors,
# or mocking if no key is present.
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    if os.getenv("GOOGLE_GEMINI_API_KEY"): # standard naming
         llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", google_api_key=os.getenv("GOOGLE_GEMINI_API_KEY"))
    elif os.getenv("GOOGLE_API_KEY"):
         llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=os.getenv("GOOGLE_API_KEY"))
    else:
         print("Warning: GOOGLE_API_KEY not found. Using Mock LLM mode.")
         llm = None
except ImportError:
    print("Warning: langchain_google_genai not installed. Using Mock LLM mode.")
    llm = None

# --- 2. EXTRACTION LOGIC ---

def extract_youtube(url: str) -> str:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api._errors import (
            NoTranscriptFound,
            TranscriptsDisabled,
            VideoUnavailable,
        )

        # Extract video ID
        video_id = ""
        if "v=" in url:
            video_id = url.split("v=")[1].split("&")[0]
        elif "youtu.be" in url:
            video_id = url.split("/")[-1].split("?")[0]

        if not video_id:
            return "[YouTube - Could not parse video ID]"

        # 1️⃣ List all transcripts
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        transcript = None

        # 2️⃣ Prefer manually created English captions
        try:
            transcript = transcript_list.find_manually_created_transcript(["en"])
        except NoTranscriptFound:
            pass

        # 3️⃣ Fallback to auto-generated English captions
        if transcript is None:
            try:
                transcript = transcript_list.find_generated_transcript(["en"])
            except NoTranscriptFound:
                return "[YouTube - No English transcript available]"

        # 4️⃣ Fetch transcript text
        transcript_data = transcript.fetch()
        text = " ".join(item["text"] for item in transcript_data)

        if not text.strip():
            return "[YouTube - Transcript empty]"

        return text

    except TranscriptsDisabled:
        return "[YouTube - Transcripts are disabled for this video]"
    except VideoUnavailable:
        return "[YouTube - Video unavailable or private]"
    except Exception as e:
        return f"[YouTube extraction failed: {str(e)}]"


def extract_website(url: str) -> str:
    try:
        import requests
        from bs4 import BeautifulSoup
        
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            return f"Error: Website returned status code {response.status_code}"
            
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer"]):
            script.decompose()
            
        text = soup.get_text()
        
        # Break into lines and remove leading/trailing space on each
        lines = (line.strip() for line in text.splitlines())
        # Break multi-headlines into a line each
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        # Drop blank lines
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return text[:50000] # Limit char count
    except Exception as e:
        return f"Error extracting website: {str(e)}"

def extract_pdf(file_path: str) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        return f"Error reading PDF: {str(e)}"


# --- 3. GRAPH NODES ---

# --- 3. GRAPH NODES (Token-Efficient) ---

def process_single_attachment(att: Dict) -> str:
    """Helper to process one attachment based on type."""
    a_type = att.get("type", "text")
    content = att.get("content", "")
    
    import base64
    import io
    
    try:
        if a_type == "youtube" or (a_type == "url" and ("youtube.com" in content or "youtu.be" in content)):
            return extract_youtube(content)
        elif a_type == "website" or a_type == "url":
            return extract_website(content)
        elif a_type == "pdf":
            try:
                # Handle Base64 PDF
                pdf_data = base64.b64decode(content)
                f = io.BytesIO(pdf_data)
                
                from pypdf import PdfReader
                reader = PdfReader(f)
                text = ""
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                
                if not text.strip():
                   return f"[PDF: {att.get('name')} - No text found (likely scanned/image-based)]"
                   
                return text
            except Exception as pdf_err:
                 return f"[Error reading PDF {att.get('name')}: {str(pdf_err)}]"
                 
        elif a_type == "image":
             return f"[Image: {att.get('name')} - OCR processing not available in this environment]"
        elif a_type == "audio":
             return f"[Audio: {att.get('name')} - Transcription placeholder]"
        elif a_type == "text":
            return content
        else:
            return f"[Unknown attachment type: {a_type}]"
    except Exception as e:
        return f"[Error processing {a_type}: {str(e)}]"

def extract_node(state: Dict) -> Dict:
    """
    Orchestrator: Iterates through all attachments and extracts text.
    """
    print("---EXTRACT NODE (MULTIMODAL)---")
    
    # Inputs
    user_text = state.get("user_text", "")
    attachments = state.get("attachments", [])
    
    extracted_parts = []
    failed_items = []
    
    # 1. User Text
    if user_text:
        extracted_parts.append(user_text)
        
    # 2. Attachments
    for att in attachments:
        try:
            # att is dict from Schema
            result = process_single_attachment(att)
            if result.startswith("Error") or result.startswith("[Error"):
                 failed_items.append(f"{att.get('name', 'Unknown')}: {result}")
            else:
                 extracted_parts.append(result)
        except Exception as e:
            failed_items.append(f"{att.get('name', 'Unknown')}: {str(e)}")

    # Store raw list for cleaning
    return {"extracted_parts": extracted_parts, "failed_items": failed_items}


def clean_node(state: Dict) -> Dict:
    """
    Merges and cleans text.
    """
    print("---CLEAN NODE---")
    parts = state.get("extracted_parts", [])
    
    cleaned_parts = []
    for part in parts:
        # Basic cleanup
        clean = re.sub(r'\n{3,}', '\n\n', part.strip())
        if clean:
            cleaned_parts.append(clean)
            
    # Join with separator
    final_text = "\n\n---\n\n".join(cleaned_parts)
    
    return {"normalized_text": final_text}


def summarize_content(state: Dict) -> Dict:
    """
    Uses LLM to summarize and extract flashcards.
    """
    print("---SUMMARIZE NODE---")
    content = state.get("cleaned_content", "")
    
    if not content or content.startswith("Error"):
        return {
            "summary_text": "Failed to extract content.", 
            "flashcards": [], 
            "key_insights": ["Extraction Error"], 
            "status": "failed"
        }

    # Short circuit mock if no LLM
    if not llm:
        return {
            "summary_text": f"MOCK SUMMARY (LLM Not Configured): \n{content[:500]}...",
            "flashcards": [{"front": "Mock Question 1", "back": "Mock Answer 1"}],
            "key_insights": ["Mock Insight 1", "Mock Insight 2"],
            "status": "completed"
        }

    # Actual LLM Call
    try:
        parser = JsonOutputParser(pydantic_object=Summary)
        
        prompt = PromptTemplate(
            template="""
            You are an expert tutor creating study materials.
            Analyze the following text and provide a structured JSON response with:
            1. 'summary_text': A comprehensive summary (markdown allowed).
            2. 'flashcards': A list of 3-5 flashcards (front/back).
            3. 'key_insights': A list of 3-5 bullet points.
            
            TEXT:
            {text}
            
            {format_instructions}
            """,
            input_variables=["text"],
            partial_variables={"format_instructions": parser.get_format_instructions()},
        )
        
        chain = prompt | llm | parser
        
        # Truncate content for token limits if necessary
        truncated_content = content[:30000] 
        
        result = chain.invoke({"text": truncated_content})
        
        return {
            "summary_text": result.get("summary_text", "No summary generated."),
            "flashcards": result.get("flashcards", []),
            "key_insights": result.get("key_insights", []),
            "status": "completed"
        }
        
    except Exception as e:
        print(f"LLM Error: {e}")
        return {
            "summary_text": f"Error generating summary: {str(e)}\n\nOriginal Text Top: {content[:1000]}",
            "flashcards": [],
            "key_insights": [],
            "status": "error"
        }

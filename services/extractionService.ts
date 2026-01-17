import { Attachment } from '../types';

export interface ExtractionResult {
  text: string;
  success: boolean;
  error?: string;
}

const BACKEND_URL = 'http://localhost:8000';

interface NormalizeRef {
  text: string;
  errors: string[];
}

export const prepareTextForSummarization = async (
  userText: string,
  attachments: Attachment[]
): Promise<{ combinedText: string; failedExtractions: string[] } | null> => {

  // If no context at all
  if (!userText && attachments.length === 0) return null;

  try {
    const response = await fetch(`${BACKEND_URL}/normalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_text: userText,
        attachments: attachments.map(a => ({
          type: a.type,
          content: a.content,
          name: a.name,
          mimeType: a.mimeType
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`Backend Error ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'error') {
      throw new Error('Backend failed: ' + data.failed_attachments.join(', '));
    }

    const finalText = data.normalized_text;
    console.log("Final text:", finalText);

    // Final fallback if backend returns empty but user typed something
    if (!finalText && userText) {
      return { combinedText: userText, failedExtractions: ["Backend returned no text, using local input."] };
    }

    return {
      combinedText: finalText,
      failedExtractions: data.failed_attachments || []
    };

  } catch (error) {
    console.error("Normalization failed:", error);
    // Fallback: Just use user text if available
    if (userText) {
      return { combinedText: userText, failedExtractions: ["Backend unavailable"] };
    }
    return null;
  }
};

// --- Legacy Single Extractors (Optional / Deprecated) ---
export const extractYouTubeTranscript = async (url: string): Promise<ExtractionResult> => {
  return { text: "", success: false, error: "Use prepareTextForSummarization for multimodal inputs." };
};
export const extractWebsiteContent = async (url: string): Promise<ExtractionResult> => {
  return { text: "", success: false, error: "Use prepareTextForSummarization for multimodal inputs." };
};

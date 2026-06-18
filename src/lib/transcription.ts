/**
 * Transcription engine — Groq Whisper API (whisper-large-v3).
 *
 * Free tier: console.groq.com
 * API is OpenAI-compatible: POST /openai/v1/audio/transcriptions
 */

export interface TranscriptionResult {
  text: string;
  duration: number; // seconds (from audio metadata, 0 if unavailable)
}

export class TranscriptionError extends Error {
  constructor(
    message: string,
    public readonly code: 'missing_key' | 'rate_limited' | 'auth_error' | 'file_too_large' | 'no_speech' | 'api_error' | 'network_error',
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_MODEL = 'whisper-large-v3';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB (Groq limit)

/**
 * Check whether GROQ_API_KEY is configured.
 */
export function hasApiKey(): boolean {
  return !!process.env.GROQ_API_KEY;
}

/**
 * Transcribe audio from a local file path using Groq Whisper API.
 *
 * Reads the file, sends it as multipart/form-data to Groq, and returns
 * the transcription text.
 */
export async function transcribeAudio(filePath: string, language?: string): Promise<TranscriptionResult> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new TranscriptionError(
      'GROQ_API_KEY is not configured. Set it in your .env.local file. ' +
      'Get a free API key at https://console.groq.com',
      'missing_key',
    );
  }

  const fs = await import('fs/promises');

  // Check file exists and size
  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    throw new TranscriptionError(
      'Audio file not found on server. Please re-upload.',
      'api_error',
    );
  }

  if (stat.size > MAX_FILE_SIZE) {
    throw new TranscriptionError(
      `Audio file is too large (${(stat.size / 1024 / 1024).toFixed(1)} MB). ` +
      `Groq Whisper supports files up to 25 MB. Try a shorter recording.`,
      'file_too_large',
    );
  }

  if (stat.size < 100) {
    throw new TranscriptionError(
      'Audio file appears to be empty. Please record or upload again.',
      'no_speech',
    );
  }

  // Read file and build multipart form
  const fileBuffer = await fs.readFile(filePath);
  const fileName = filePath.split(/[/\\]/).pop() || 'audio.webm';

  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: 'audio/webm' });
  formData.append('file', blob, fileName);
  formData.append('model', GROQ_MODEL);
  if (language) {
    formData.append('language', language);
  }

  // Make the API call with retry for rate limits
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
        signal: AbortSignal.timeout(120_000), // 2 min timeout
      });

      if (response.ok) {
        const data = await response.json() as { text: string; x_groq?: { usage?: { total_time?: number } } };
        return {
          text: data.text.trim(),
          duration: data.x_groq?.usage?.total_time || 0,
        };
      }

      // Handle specific error codes
      if (response.status === 429) {
        if (attempt < 2) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          continue;
        }
        throw new TranscriptionError(
          'Transcription service is rate-limited. Please wait a moment and try again.',
          'rate_limited',
          true,
        );
      }

      if (response.status === 401) {
        throw new TranscriptionError(
          'Invalid GROQ_API_KEY. Check your API key at https://console.groq.com',
          'auth_error',
        );
      }

      if (response.status === 413) {
        throw new TranscriptionError(
          'Audio file exceeds the 25 MB size limit.',
          'file_too_large',
        );
      }

      // Other errors
      const errorBody = await response.text().catch(() => '');
      const errorMsg = errorBody ? extractErrorMessage(errorBody) : `Groq API error (HTTP ${response.status})`;
      throw new TranscriptionError(errorMsg, 'api_error');

    } catch (err) {
      if (err instanceof TranscriptionError) throw err;

      // Network / timeout errors
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        lastError = new TranscriptionError(
          'Transcription timed out. The audio may be too long. Try a shorter clip.',
          'network_error',
          true,
        );
      } else if (err instanceof TypeError && (err as Error).message.includes('fetch')) {
        lastError = new TranscriptionError(
          'Transcription service is unreachable. Check your internet connection.',
          'network_error',
          true,
        );
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
      }

      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new TranscriptionError(
    'Transcription failed after multiple attempts. Please try again.',
    'api_error',
    true,
  );
}

function extractErrorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return parsed.error?.message || parsed.message || body.slice(0, 200);
  } catch {
    return body.slice(0, 200);
  }
}

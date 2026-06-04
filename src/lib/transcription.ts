import { readFile } from 'fs/promises';
import path from 'path';

/**
 * Mock transcription engine.
 * In production, this would use Whisper API, Deepgram, or a local WASM model.
 * For now, simulates a 2-second delay and returns placeholder text.
 */
export async function transcribeAudio(filePath: string): Promise<{ text: string; duration: number }> {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // In a real app, we'd read the audio file and send it to a transcription API.
  // For the mock, we extract the filename to generate contextual placeholder text.
  const fileName = path.basename(filePath, path.extname(filePath));

  const mockTranscripts = [
    `This is a simulated transcript for "${fileName}". In production, this would contain the actual transcribed text from your audio recording. The transcription engine would process the audio file and convert speech to text using a machine learning model.`,
    `Welcome to the speech-to-text application. This recording demonstrates how audio files are transcribed into written text. The process involves converting analog audio signals into digital text data using advanced speech recognition algorithms.`,
    `Hello and thank you for using this application. The audio file "${fileName}" has been successfully processed. The transcription result would typically appear here with accurate, timestamped text converted from your speech.`,
  ];

  const text = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];

  return {
    text,
    duration: 0, // Actual duration would come from audio metadata
  };
}

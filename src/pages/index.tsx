import React, { useState, useRef, useCallback } from 'react';
import AudioRecorder from '../components/AudioRecorder';
import FileUploader from '../components/FileUploader';
import TranscriptEditor from '../components/TranscriptEditor';
import ExportButton from '../components/ExportButton';

interface TranscriptData {
  id: string;
  text: string;
}

const HomePage: React.FC = () => {
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTranscript = useCallback((data: TranscriptData) => {
    setTranscript(data);
    setError(null);
  }, []);

  const handleError = useCallback((message: string) => {
    setError(message);
  }, []);

  const handleTranscriptUpdate = useCallback((text: string) => {
    if (transcript) {
      setTranscript({ ...transcript, text });
    }
  }, [transcript]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Speech to Text</h1>
          <p className="mt-1 text-sm text-gray-500">Upload or record audio to get a transcript</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload File</h2>
            <FileUploader onTranscript={handleTranscript} onError={handleError} />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Audio</h2>
            <AudioRecorder onTranscript={handleTranscript} onError={handleError} />
          </div>
        </div>

        {transcript && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Transcript</h2>
              <ExportButton transcriptId={transcript.id} />
            </div>
            <TranscriptEditor
              transcriptId={transcript.id}
              initialText={transcript.text}
              onUpdate={handleTranscriptUpdate}
            />
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          Speech to Text App
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
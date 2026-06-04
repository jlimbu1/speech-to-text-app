import { useState, useRef, useCallback } from 'react';
import { Upload, FileAudio, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploaderProps {
  onUploadSuccess?: (fileId: string, filename: string) => void;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedMimeTypes = [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/mp4',
    'audio/x-m4a',
    'audio/flac',
  ];

  const validateFile = (file: File): string | null => {
    if (!allowedMimeTypes.includes(file.type)) {
      return `Unsupported file type: ${file.type || 'unknown'}. Please upload an audio file (MP3, WAV, OGG, WEBM, M4A, FLAC).`;
    }
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum size is 50 MB.`;
    }
    if (file.size === 0) {
      return 'The selected file is empty. Please choose a non-empty audio file.';
    }
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setSelectedFile(null);
      setErrorMessage(error);
      setUploadStatus('error');
      toast.error(error);
      return;
    }
    setSelectedFile(file);
    setErrorMessage('');
    setUploadStatus('idle');
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploadStatus('uploading');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      setUploadStatus('success');
      toast.success('File uploaded successfully!');
      if (onUploadSuccess) {
        onUploadSuccess(data.fileId, data.filename);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during upload.';
      setErrorMessage(message);
      setUploadStatus('error');
      toast.error(message);
    }
  }, [selectedFile, onUploadSuccess]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5" />
        Upload Audio File
      </h2>

      {uploadStatus === 'idle' && !selectedFile && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-label="Click or drag and drop to upload an audio file"
        >
          <FileAudio className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">
            Click to select or drag and drop an audio file
          </p>
          <p className="text-sm text-gray-400">
            Supported formats: MP3, WAV, OGG, WEBM, M4A, FLAC (max 50 MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleInputChange}
            className="hidden"
            aria-hidden="true"
          />
        </div>
      )}

      {uploadStatus === 'idle' && selectedFile && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileAudio className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span className="font-medium truncate" title={selectedFile.name}>
                {selectedFile.name}
              </span>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700 flex-shrink-0 ml-2"
              aria-label="Remove selected file"
            >
              Remove
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Size: {formatFileSize(selectedFile.size)}
          </p>
          <button
            onClick={handleUpload}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={uploadStatus === 'uploading'}
          >
            Upload File
          </button>
        </div>
      )}

      {uploadStatus === 'uploading' && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="text-blue-700">Uploading file...</span>
          </div>
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="w-5 h-5 text-green-500" />
            <span className="text-green-700 font-medium">Upload successful!</span>
          </div>
          <p className="text-sm text-green-600 mb-3">
            {selectedFile?.name} has been uploaded.
          </p>
          <button
            onClick={handleReset}
            className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Upload Another File
          </button>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 font-medium">Upload failed</span>
          </div>
          <p className="text-sm text-red-600 mb-3">{errorMessage}</p>
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploadStatus === 'uploading'}
            >
              Retry
            </button>
            <button
              onClick={handleReset}
              className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Choose Different File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
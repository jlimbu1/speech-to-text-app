import React, { useState } from 'react';

interface ExportButtonProps {
  transcriptId: string;
}

export default function ExportButton({ transcriptId }: ExportButtonProps) {
  const [format, setFormat] = useState<'txt' | 'json'>('txt');

  const handleExport = () => {
    const url = `/api/export?id=${encodeURIComponent(transcriptId)}&format=${format}`;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={format}
        onChange={(e) => setFormat(e.target.value as 'txt' | 'json')}
        className="border border-gray-300 rounded px-2 py-1 text-sm"
      >
        <option value="txt">Plain Text</option>
        <option value="json">JSON</option>
      </select>
      <button
        onClick={handleExport}
        className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 text-sm"
      >
        Export
      </button>
    </div>
  );
}
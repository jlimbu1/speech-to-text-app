"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportTxt, exportSrt, exportJson } from "@/lib/export";

interface Transcript {
  id: string;
  text: string;
  filename: string;
  createdAt: string;
}

interface ExportButtonsProps {
  transcript: Transcript;
}

export default function ExportButtons({ transcript }: ExportButtonsProps) {
  const handleExport = (format: "txt" | "srt" | "json") => {
    let blob: Blob;
    let extension: string;
    let mimeType: string;

    switch (format) {
      case "txt": {
        const content = exportTxt(transcript.text);
        mimeType = "text/plain";
        extension = "txt";
        blob = new Blob([content], { type: mimeType });
        break;
      }
      case "srt": {
        const content = exportSrt(transcript.text);
        mimeType = "text/plain";
        extension = "srt";
        blob = new Blob([content], { type: mimeType });
        break;
      }
      case "json": {
        const content = exportJson(transcript);
        mimeType = "application/json";
        extension = "json";
        blob = new Blob([content], { type: mimeType });
        break;
      }
      default:
        return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${transcript.filename.replace(/\.[^/.]+$/, "")}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport("txt")}
        disabled={!transcript.text}
      >
        <Download className="mr-2 h-4 w-4" />
        TXT
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport("srt")}
        disabled={!transcript.text}
      >
        <Download className="mr-2 h-4 w-4" />
        SRT
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport("json")}
        disabled={!transcript.text}
      >
        <Download className="mr-2 h-4 w-4" />
        JSON
      </Button>
    </div>
  );
}
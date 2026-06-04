"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface Transcript {
  id: string;
  filename: string;
  text: string;
  createdAt: string;
}

export default function HistoryList() {
  const router = useRouter();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTranscripts = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = query
        ? `/api/history?search=${encodeURIComponent(query)}`
        : "/api/history";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch transcripts (status ${res.status})`);
      }
      const data: Transcript[] = await res.json();
      setTranscripts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTranscripts(search);
  }, [search, fetchTranscripts]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setSearch(value);
    }, 300);
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const truncateText = (text: string, maxLength: number = 100): string => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trimEnd() + "...";
  };

  const handleCardClick = (id: string) => {
    router.push(`/editor/${id}`);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-red-500 text-lg font-medium mb-2">Error loading transcripts</p>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <button
          onClick={() => fetchTranscripts(search)}
          className="text-primary underline hover:no-underline text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          type="text"
          placeholder="Search transcripts..."
          onChange={handleSearchChange}
          className="max-w-sm"
          aria-label="Search transcripts"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : transcripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-lg font-medium">
            {search ? "No transcripts match your search" : "No transcripts yet"}
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            {search
              ? "Try a different search term"
              : "Upload an audio file or record one to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transcripts.map((transcript) => (
            <Card
              key={transcript.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => handleCardClick(transcript.id)}
            >
              <CardContent className="p-4">
                <h3 className="font-medium text-base truncate">
                  {transcript.filename}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(transcript.createdAt)}
                </p>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {truncateText(transcript.text)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
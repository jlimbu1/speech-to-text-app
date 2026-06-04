"use client";

import HistoryList from "@/components/HistoryList";

export default function HistoryPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Transcript History</h1>
      <HistoryList />
    </main>
  );
}
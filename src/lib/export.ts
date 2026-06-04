export function exportTxt(text: string): string {
  return text;
}

export function exportSrt(text: string): string {
  if (!text || text.trim().length === 0) {
    return "";
  }

  const words = text.trim().split(/\s+/);
  const segmentSize = 50;
  const segments: string[] = [];
  let segmentNumber = 1;
  let currentTime = 0;

  for (let i = 0; i < words.length; i += segmentSize) {
    const segmentWords = words.slice(i, i + segmentSize);
    const segmentText = segmentWords.join(" ");
    const startSeconds = currentTime;
    const endSeconds = currentTime + 2;
    const startTimestamp = formatSrtTimestamp(startSeconds);
    const endTimestamp = formatSrtTimestamp(endSeconds);

    segments.push(
      `${segmentNumber}\n${startTimestamp} --> ${endTimestamp}\n${segmentText}`
    );

    segmentNumber++;
    currentTime = endSeconds;
  }

  return segments.join("\n\n");
}

function formatSrtTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 1000);

  const pad = (num: number, size: number): string => {
    return String(num).padStart(size, "0");
  };

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(milliseconds, 3)}`;
}

export function exportJson(transcript: { id: string; text: string; filename: string; createdAt: string }): string {
  return JSON.stringify(transcript, null, 2);
}
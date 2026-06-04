export function generateTxt(text: string): string {
  return text.trim();
}

export function generateSrt(text: string): string {
  const sentences = text
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .filter(Boolean);

  return sentences
    .map((sentence, i) => {
      const start = new Date(0);
      start.setSeconds(i * 5);
      const end = new Date(0);
      end.setSeconds((i + 1) * 5);

      const fmt = (d: Date) =>
        d.toISOString().substring(11, 23).replace('.', ',');

      return `${i + 1}\n${fmt(start)} --> ${fmt(end)}\n${sentence.trim()}\n`;
    })
    .join('\n');
}

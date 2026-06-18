# Speech to Text

A web application that converts audio to text. Upload audio files or record directly from your browser, then view, edit, and export transcripts.

## Features

- **Upload audio** — Drag-and-drop or browse for MP3, WAV, M4A, WebM files (up to 50 MB)
- **Record audio** — Record directly from your browser mic with live waveform visualization
- **Transcribe** — Converts speech to text using Groq Whisper API (whisper-large-v3, free tier)
- **Edit transcripts** — View and edit transcript text, with word/character counts
- **Export** — Download transcripts as TXT or SRT subtitle format
- **History** — Browse all past transcripts with search previews
- **Dark mode** — Automatic dark/light theme based on system preference

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | SQLite via Prisma 5 |
| Audio | Web Audio API / MediaRecorder |
| Transcription | Groq Whisper API (whisper-large-v3) |
| Icons | Lucide React |

## Getting Started

```bash
# Install dependencies
npm install

# Set up database
npx prisma db push

# Configure Groq API key (free — no credit card required)
# Sign up at https://console.groq.com, create a key, then:
echo "GROQ_API_KEY=gsk_your_key_here" > .env.local

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without the API key, the app runs but transcription won't work — a friendly
banner will appear in the bottom-right corner with setup instructions.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── upload/route.ts          # File upload endpoint
│   │   ├── transcribe/route.ts      # Transcription endpoint
│   │   ├── transcripts/route.ts     # List/Create transcripts
│   │   ├── transcripts/[id]/route.ts # Get/Update/Delete transcript
│   │   └── export/[id]/route.ts     # Export TXT/SRT
│   ├── transcripts/
│   │   ├── page.tsx                 # Transcript history page
│   │   └── [id]/page.tsx            # Transcript detail page
│   ├── layout.tsx
│   └── page.tsx                     # Landing page (upload/record)
├── components/
│   ├── AudioUploader.tsx            # Drag-and-drop file upload
│   ├── AudioRecorder.tsx            # Browser mic recording
│   ├── TranscriptEditor.tsx         # View/edit transcript text
│   ├── TranscriptList.tsx           # Transcript history list
│   ├── ExportButton.tsx             # TXT/SRT download buttons
│   └── ApiKeyBanner.tsx             # Groq API key setup banner
└── lib/
    ├── prisma.ts                    # Prisma client singleton
    ├── transcription.ts             # Groq Whisper API client
    └── export.ts                    # TXT/SRT formatters
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload` | Upload an audio file |
| GET | `/api/check-api-key` | Check if GROQ_API_KEY is configured |
| POST | `/api/transcribe` | Transcribe an uploaded file via Groq Whisper |
| GET | `/api/transcripts` | List all transcripts |
| GET | `/api/transcripts/[id]` | Get a transcript |
| PATCH | `/api/transcripts/[id]` | Update transcript text |
| DELETE | `/api/transcripts/[id]` | Delete a transcript |
| GET | `/api/export/[id]?format=txt` | Export as TXT |
| GET | `/api/export/[id]?format=srt` | Export as SRT |

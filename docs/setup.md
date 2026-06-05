# Setup

## Environment Variables

Create a `.env.local` file in the project root:

```
GROQ_API_KEY=gsk_your_key_here
DATABASE_URL="file:./dev.db"
```

### Getting a Groq API Key

1. Go to https://console.groq.com
2. Sign up (free, no credit card required)
3. Create an API key
4. Add it to `.env.local` as `GROQ_API_KEY`
5. Restart the dev server

## Run

```bash
npm install
npm run db:push
npm run dev
```

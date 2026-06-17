import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './storage/db';
import { ensureUploadsDir } from './storage/fileStorage';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

async function start(): Promise<void> {
  try {
    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    await ensureUploadsDir(uploadsDir);
    initDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

export default app;
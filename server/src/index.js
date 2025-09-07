import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { db, runMigrations } from './db.js';
import analyticsRouter from './routes/analytics.js';
import recordsRouter from './routes/records.js';
import refsRouter from './routes/refs.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

runMigrations();

app.get('/health', (req, res) => {
  const row = db.prepare('SELECT 1 as ok').get();
  res.json({ ok: row.ok === 1 });
});

app.use('/analytics', analyticsRouter);
app.use('/records', recordsRouter);
app.use('/refs', refsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Weighbridge API listening on port ${PORT}`));
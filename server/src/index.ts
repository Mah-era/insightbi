import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import workspaceRoutes from './routes/workspaces';
import datasetRoutes from './routes/datasets';
import transformationRoutes from './routes/transformations';
import reportRoutes from './routes/reports';
import shareRoutes from './routes/share';
import exportRoutes from './routes/export';
import adminRoutes from './routes/admin';
import dataModelRoutes from './routes/dataModel';
import semanticModelRoutes from './routes/semanticModel';
import measureRoutes from './routes/measureRoutes';
import embedRoutes from './routes/embed';
import connectionRoutes from './routes/connectionRoutes';
import activityRoutes from './routes/activity';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', rateLimiter, authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/datasets', transformationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/data-model', dataModelRoutes);
app.use('/api/semantic-model', semanticModelRoutes);
app.use('/api/measures', measureRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api', embedRoutes);
app.use('/api', shareRoutes);
app.use('/api', exportRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`InsightBI server running on port ${PORT}`);
});

export default app;

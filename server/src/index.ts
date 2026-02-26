import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { processXmlRoute } from './routes/process-xml';
import { scanXmlRoute } from './routes/scan-xml';
import { processInvoiceRoute } from './routes/process-invoice';
import { processTahsilatRoute } from './routes/process-tahsilat';
import { authMiddleware } from './middleware/auth';
import { startCacheCleanup } from './lib/session-cache';
import type { AuthUser } from '../../shared/types';

const app = new Hono<{ Variables: { user: AuthUser } }>();

app.use('*', logger());
app.use('/api/*', cors({
    origin: ['http://localhost:5173'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use('/api/process-xml/*', authMiddleware);
app.use('/api/scan-xml/*', authMiddleware);
app.use('/api/process-invoice/*', authMiddleware);
app.use('/api/process-tahsilat/*', authMiddleware);
app.use('/api/me/*', authMiddleware);

app.route('/api/process-xml', processXmlRoute);
app.route('/api/scan-xml', scanXmlRoute);
app.route('/api/process-invoice', processInvoiceRoute);
app.route('/api/process-tahsilat', processTahsilatRoute);

app.get('/api/me', (c) => {
    const user = c.get('user');
    return c.json(user);
});

app.get('/api/health', (c) => c.json({ status: 'ok' }));

startCacheCleanup();

const port = parseInt(process.env.PORT || '3001', 10);
console.log(`Hono server running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
